import supabase from "../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const ADMIN_EMAIL = "marcos@rubo.com.br";
  const LOGS_FETCH_LIMIT = 1000;
  const LOGS_PAGE_SIZE = 50;

  const userName = document.getElementById("userName");
  const userRole = document.getElementById("userRole");
  const userAvatar = document.getElementById("userAvatar");
  const welcomeTitle = document.getElementById("welcomeTitle");
  const statProfessionals = document.getElementById("statProfessionals");
  const statPatientsWithoutActiveLink = document.getElementById("statPatientsWithoutActiveLink");
  const statInteractions = document.getElementById("statInteractions");
  const screenMessage = document.getElementById("screenMessage");
  const searchTerm = document.getElementById("searchTerm");
  const patientsWithoutLinkList = document.getElementById("patientsWithoutLinkList");
  const patientsWithoutLinkEmpty = document.getElementById("patientsWithoutLinkEmpty");
  const logsList = document.getElementById("logsList");
  const logsEmpty = document.getElementById("logsEmpty");
  const logsToolbar = document.getElementById("logsToolbar");
  const logsSummary = document.getElementById("logsSummary");
  const logsPagination = document.getElementById("logsPagination");
  const professionalsList = document.getElementById("professionalsList");
  const professionalsEmpty = document.getElementById("professionalsEmpty");
  let currentUser = null;
  let adminData = null;
  let searchLogTimeout = null;
  let lastLoggedSearch = "";
  let currentLogsPage = 1;

  function mostrarErroTela(texto) {
    if (!screenMessage) return;
    screenMessage.hidden = false;
    screenMessage.textContent = texto;
  }

  function esconderErroTela() {
    if (!screenMessage) return;
    screenMessage.hidden = true;
    screenMessage.textContent = "";
  }

  function limparNome(valor) {
    if (!valor) return "";
    return valor.includes("@") ? valor.split("@")[0] : valor;
  }

  function obterIniciais(nome) {
    return (nome || "AD")
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join("");
  }

  function escapeHtml(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatarData(data) {
    if (!data) return "-";
    return new Date(data).toLocaleString("pt-BR");
  }

  function normalizarTexto(valor) {
    return String(valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function montarStatusBadge(status) {
    if (status === "ativo" || status === "aceito") {
      return `<span class="status-badge status-badge--success">${escapeHtml(status)}</span>`;
    }

    if (status === "cancelado") {
      return `<span class="status-badge status-badge--danger">cancelado</span>`;
    }

    if (status === "respondido" || status === "pendente" || status === "pendente_convite") {
      return `<span class="status-badge status-badge--primary">${escapeHtml(status)}</span>`;
    }

    if (status === "aguardando_confirmacao_email") {
      return `<span class="status-badge status-badge--warning">aguardando confirmação</span>`;
    }

    if (status === "encerrado") {
      return `<span class="status-badge status-badge--muted">encerrado</span>`;
    }

    return `<span class="status-badge status-badge--info">${escapeHtml(status || "sem status")}</span>`;
  }

  function montarCategoriaConvite(convite, vinculo) {
    if (convite.status === "cancelado") return "cancelados";
    if (vinculo?.status === "ativo" || convite.status === "aceito") return "confirmados";

    if (
      vinculo?.status === "aguardando_confirmacao_email" ||
      convite.status === "respondido"
    ) {
      return "respondidos";
    }

    return "enviados";
  }

  async function validarAdmin() {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href = "/";
      return false;
    }

    if (session.user.email !== ADMIN_EMAIL) {
      window.location.href = "/";
      return false;
    }

    currentUser = session.user;

    const nome = limparNome(session.user.email);
    userName.textContent = nome;
    userRole.textContent = "Administrador";
    userAvatar.textContent = obterIniciais(nome);
    welcomeTitle.textContent = `Olá, ${nome}`;
    registrarAcessoPagina({
      pagina: "admin_v2",
      perfil: "admin",
      userId: session.user.id,
      email: session.user.email || ""
    });
    return true;
  }

  async function carregarDados() {
    const [
      perfisResult,
      vinculosResult,
      convitesResult,
      tarefasResult,
      interacoesResult,
      logsResult
    ] = await Promise.all([
      supabase.from("perfis").select("*"),
      supabase.from("vinculos").select("*"),
      supabase.from("convites").select("*").order("created_at", { ascending: false }),
      supabase.from("tarefas").select("*").order("created_at", { ascending: false }),
      supabase.from("tarefa_interacoes").select("*").order("created_at", { ascending: true }),
      supabase
        .from("logs_eventos")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(LOGS_FETCH_LIMIT)
    ]);

    const falhas = [
      ["perfis", perfisResult.error],
      ["vinculos", vinculosResult.error],
      ["convites", convitesResult.error],
      ["tarefas", tarefasResult.error],
      ["tarefa_interacoes", interacoesResult.error],
      ["logs_eventos", logsResult.error]
    ].filter(([, error]) => error);

    if (falhas.length) {
      const descricao = falhas
        .map(([nome, error]) => `${nome}: ${error.message}`)
        .join(" | ");

      throw new Error(`Falha ao carregar dados do admin-v2. ${descricao}`);
    }

    return {
      perfis: perfisResult.data || [],
      vinculos: vinculosResult.data || [],
      convites: convitesResult.data || [],
      tarefas: tarefasResult.data || [],
      interacoes: interacoesResult.data || [],
      logs: logsResult.data || []
    };
  }

  function renderLogs(logs, termo) {
    if (!logsList || !logsEmpty || !logsToolbar || !logsSummary || !logsPagination) return;

    const filtrados = [...logs]
      .filter((log) => {
        if (!termo) return true;

        const conteudo = normalizarTexto(
          [
            log.email,
            log.perfil,
            log.evento,
            log.pagina,
            JSON.stringify(log.contexto || {})
          ].join(" ")
        );

        return conteudo.includes(termo);
      })
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));

    const total = filtrados.length;
    const totalPages = Math.max(1, Math.ceil(total / LOGS_PAGE_SIZE));
    currentLogsPage = Math.min(currentLogsPage, totalPages);

    if (!total) {
      currentLogsPage = 1;
      logsToolbar.hidden = true;
      logsSummary.textContent = "";
      logsPagination.innerHTML = "";
      logsList.innerHTML = "";
      logsEmpty.hidden = false;
      return;
    }

    const startIndex = (currentLogsPage - 1) * LOGS_PAGE_SIZE;
    const endIndex = Math.min(startIndex + LOGS_PAGE_SIZE, total);
    const paginaAtual = filtrados.slice(startIndex, endIndex);

    logsToolbar.hidden = false;
    logsSummary.textContent =
      `Exibindo ${startIndex + 1}-${endIndex} de ${total} logs carregados` +
      (logs.length >= LOGS_FETCH_LIMIT ? ` (máximo de ${LOGS_FETCH_LIMIT})` : "");
    logsEmpty.hidden = true;
    logsPagination.innerHTML = `
      <button
        class="logs-pagination__button"
        type="button"
        data-log-page="prev"
        ${currentLogsPage === 1 ? "disabled" : ""}
      >
        Anterior
      </button>
      <span class="logs-pagination__status">Página ${currentLogsPage} de ${totalPages}</span>
      <button
        class="logs-pagination__button"
        type="button"
        data-log-page="next"
        ${currentLogsPage === totalPages ? "disabled" : ""}
      >
        Próxima
      </button>
    `;
    logsList.innerHTML = `
      <div class="logs-table-wrap">
        <table class="logs-table">
          <thead>
            <tr>
              <th>created_at</th>
              <th>email</th>
              <th>perfil</th>
              <th>evento</th>
              <th>pagina</th>
            </tr>
          </thead>
          <tbody>
            ${paginaAtual
              .map(
                (log) => `
                  <tr>
                    <td>${escapeHtml(formatarData(log.created_at))}</td>
                    <td>${escapeHtml(log.email || "-")}</td>
                    <td>${escapeHtml(log.perfil || "publico")}</td>
                    <td>${escapeHtml(log.evento || "-")}</td>
                    <td>${escapeHtml(log.pagina || "-")}</td>
                  </tr>
                `
              )
              .join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function obterDescricaoPacienteSemVinculo(paciente, vinculos, perfis) {
    const vinculosDoPaciente = vinculos.filter((v) => v.patient_user_id === paciente.user_id);
    const vinculoEmAberto = vinculosDoPaciente.find((v) =>
      ["pendente_convite", "aguardando_confirmacao_email"].includes(v.status)
    );

    if (vinculoEmAberto) {
      const profissional = perfis.find(
        (p) => p.user_id === vinculoEmAberto.professional_user_id && p.perfil === "profissional"
      );

      return `Convite em andamento com ${profissional?.nome || profissional?.email || "profissional"}`;
    }

    return "Sem vínculo ativo";
  }

  function renderPacientesSemVinculo(pacientes, vinculos, perfis, termo) {
    const pacientesSemVinculo = pacientes.filter((p) => {
      const temVinculoAtivo = vinculos.some(
        (v) => v.patient_user_id === p.user_id && v.status === "ativo"
      );
      return !temVinculoAtivo;
    });

    const filtrados = pacientesSemVinculo.filter((paciente) => {
      if (!termo) return true;

      const conteudo = normalizarTexto(
        `${paciente.nome || ""} ${paciente.email || ""} ${obterDescricaoPacienteSemVinculo(
          paciente,
          vinculos,
          perfis
        )}`
      );

      return conteudo.includes(termo);
    });

    statPatientsWithoutActiveLink.textContent = pacientesSemVinculo.length;

    if (!filtrados.length) {
      patientsWithoutLinkList.innerHTML = "";
      patientsWithoutLinkEmpty.hidden = false;
      return;
    }

    patientsWithoutLinkEmpty.hidden = true;
    patientsWithoutLinkList.innerHTML = filtrados
      .map((paciente) => `
        <div class="simple-item">
          <div>
            <strong>${escapeHtml(paciente.nome || paciente.email || "Paciente")}</strong>
            <small>${escapeHtml(obterDescricaoPacienteSemVinculo(paciente, vinculos, perfis))}</small>
          </div>
          <span>${escapeHtml(paciente.email || "")}</span>
        </div>
      `)
      .join("");
  }

  function renderInviteGroup(title, itens, perfisMap) {
    return `
      <div class="admin-block">
        <h4>${title}</h4>
        <div class="invite-group">
          ${
            itens.length
              ? itens
                  .map((item) => {
                    const pacientePerfil = item.patient_user_id
                      ? perfisMap.get(item.patient_user_id) || null
                      : null;
                    const patientLabel =
                      item.patient_name ||
                      pacientePerfil?.nome ||
                      pacientePerfil?.email ||
                      item.patient_email ||
                      "Paciente";

                    return `
                      <div class="invite-item">
                        <div class="invite-item__top">
                          <strong>${escapeHtml(patientLabel)}</strong>
                          ${montarStatusBadge(item.status_exibicao || item.status)}
                        </div>
                        <span>${escapeHtml(item.patient_email || item.patient_whatsapp || "Sem contato informado")}</span>
                        <small>Criado em ${escapeHtml(formatarData(item.created_at || item.convite_created_at))}</small>
                      </div>
                    `;
                  })
                  .join("")
              : `<div class="empty-inline">Nenhum registro nesta seção.</div>`
          }
        </div>
      </div>
    `;
  }

  function renderPatientBrowser(patient, tarefas, interacoes) {
    return `
      <details
        class="patient-browser-card"
        data-patient-user-id="${escapeHtml(patient.patient_user_id || "")}"
        data-patient-email="${escapeHtml(patient.email || "")}"
        data-patient-name="${escapeHtml(patient.nome || patient.email || "Paciente")}"
      >
        <summary class="patient-browser-card__header">
          <div class="patient-browser-card__top">
            <div>
              <strong>${escapeHtml(patient.nome || patient.email || "Paciente")}</strong>
              <span>${escapeHtml(patient.email || "")}</span>
            </div>
            <div class="patient-browser-card__summary-side">
              ${montarStatusBadge("ativo")}
              <span class="collapsible-indicator" aria-hidden="true"></span>
            </div>
          </div>
          <div class="patient-browser-card__meta">
            <span>${tarefas.length} tarefa(s)</span>
            <span>${interacoes.length} interação(ões)</span>
          </div>
        </summary>
        <div class="tasks-browser-list">
          ${
            tarefas.length
              ? tarefas
                  .map((tarefa) => {
                    const interacoesDaTarefa = interacoes.filter((item) => item.tarefa_id === tarefa.id);

                    return `
                      <details class="task-browser-card">
                        <summary class="task-browser-card__summary">
                          <div class="task-browser-card__top">
                            <strong>${escapeHtml(tarefa.titulo || "Tarefa sem título")}</strong>
                            <div class="task-browser-card__summary-side">
                              ${montarStatusBadge(tarefa.status || "aberta")}
                              <span class="collapsible-indicator" aria-hidden="true"></span>
                            </div>
                          </div>
                          <div class="task-browser-card__meta">
                            <span>Criada em ${escapeHtml(formatarData(tarefa.created_at))}</span>
                            <span>${interacoesDaTarefa.length} interação(ões)</span>
                          </div>
                        </summary>
                        <div class="task-browser-card__body">
                          <p class="task-browser-card__description">${escapeHtml(tarefa.descricao || "")}</p>
                          <div class="interactions-list">
                          ${
                            interacoesDaTarefa.length
                              ? interacoesDaTarefa
                                  .map((interacao) => `
                                    <article class="interaction-item interaction-item--${
                                      interacao.autor_tipo === "profissional" ? "profissional" : "paciente"
                                    }">
                                      <div class="interaction-item__top">
                                        <strong class="interaction-item__author">${
                                          interacao.autor_tipo === "profissional"
                                            ? "Profissional"
                                            : "Paciente"
                                        }</strong>
                                        <span class="interaction-item__time">${escapeHtml(
                                          formatarData(interacao.created_at)
                                        )}</span>
                                      </div>
                                      <p class="interaction-item__text">${escapeHtml(
                                        interacao.mensagem || ""
                                      )}</p>
                                    </article>
                                  `)
                                  .join("")
                              : `<div class="empty-inline">Nenhuma interação nesta tarefa.</div>`
                          }
                          </div>
                        </div>
                      </details>
                    `;
                  })
                  .join("")
              : `<div class="empty-inline">Nenhuma tarefa encontrada para este paciente.</div>`
          }
        </div>
      </details>
    `;
  }

  function renderProfissionais(dados, termo) {
    const { perfis, vinculos, convites, tarefas, interacoes } = dados;
    const professionals = perfis.filter((p) => p.perfil === "profissional");
    const perfisMap = new Map(perfis.map((perfil) => [perfil.user_id, perfil]));
    statProfessionals.textContent = professionals.length;
    statInteractions.textContent = interacoes.length;

    const cards = professionals
      .map((profissional) => {
        const convitesDoProf = convites.filter(
          (item) => item.professional_user_id === profissional.user_id
        );
        const vinculosDoProf = vinculos.filter(
          (item) => item.professional_user_id === profissional.user_id
        );
        const vinculosPorToken = new Map(
          vinculosDoProf
            .filter((item) => item.token_convite)
            .map((item) => [item.token_convite, item])
        );

        const convitesClassificados = convitesDoProf.map((convite) => {
          const vinculo = vinculosPorToken.get(convite.token) || null;
          const categoria = montarCategoriaConvite(convite, vinculo);

          return {
            ...convite,
            ...vinculo,
            status_exibicao: categoria === "confirmados"
              ? "ativo"
              : categoria === "respondidos"
                ? "aguardando_confirmacao_email"
                : convite.status,
            categoria
          };
        });

        const pacientesEfetivos = vinculosDoProf
          .filter((item) => item.status === "ativo" && item.patient_user_id)
          .map((vinculo) => ({
            ...vinculo,
            ...(perfisMap.get(vinculo.patient_user_id) || {})
          }));

        const tarefasDoProf = tarefas.filter(
          (item) => item.professional_user_id === profissional.user_id
        );
        const interacoesDoProf = interacoes.filter((item) =>
          tarefasDoProf.some((tarefa) => tarefa.id === item.tarefa_id)
        );

        const searchable = normalizarTexto(
          [
            profissional.nome,
            profissional.email,
            ...pacientesEfetivos.map((item) => `${item.nome || ""} ${item.email || ""}`),
            ...convitesDoProf.map((item) => `${item.patient_name || ""} ${item.patient_email || ""}`)
          ].join(" ")
        );

        if (termo && !searchable.includes(termo)) {
          return "";
        }

        return `
          <details class="professional-card">
            <summary class="professional-card__header">
              <div class="professional-card__identity">
                <div class="professional-card__avatar">${escapeHtml(
                  obterIniciais(profissional.nome || profissional.email)
                )}</div>
                <div class="professional-card__title">
                  <strong>${escapeHtml(profissional.nome || profissional.email || "Profissional")}</strong>
                  <span>${escapeHtml(profissional.email || "")}</span>
                </div>
              </div>

              <div class="professional-card__stats">
                <span class="status-badge status-badge--info">${convitesClassificados.length} convite(s)</span>
                <span class="status-badge status-badge--success">${pacientesEfetivos.length} paciente(s) efetivo(s)</span>
                <span class="status-badge status-badge--primary">${tarefasDoProf.length} tarefa(s)</span>
                <span class="status-badge status-badge--warning">${interacoesDoProf.length} interação(ões)</span>
                <span class="collapsible-indicator" aria-hidden="true"></span>
              </div>
            </summary>

            <div class="professional-card__body">
              <div class="professional-grid">
                <div class="invite-group">
                  ${renderInviteGroup(
                    "Convites enviados",
                    convitesClassificados.filter((item) => item.categoria === "enviados"),
                    perfisMap
                  )}
                  ${renderInviteGroup(
                    "Convites respondidos",
                    convitesClassificados.filter((item) => item.categoria === "respondidos"),
                    perfisMap
                  )}
                  ${renderInviteGroup(
                    "Cadastros confirmados",
                    convitesClassificados.filter((item) => item.categoria === "confirmados"),
                    perfisMap
                  )}
                  ${renderInviteGroup(
                    "Convites cancelados",
                    convitesClassificados.filter((item) => item.categoria === "cancelados"),
                    perfisMap
                  )}
                </div>

                <div class="admin-block">
                  <h4>Pacientes efetivos, tarefas e interações</h4>
                  <div class="patient-browser-list">
                    ${
                      pacientesEfetivos.length
                        ? pacientesEfetivos
                            .map((paciente) => {
                              const tarefasDoPaciente = tarefasDoProf.filter(
                                (tarefa) => tarefa.patient_user_id === paciente.patient_user_id
                              );
                              const idsTarefas = new Set(tarefasDoPaciente.map((item) => item.id));
                              const interacoesDoPaciente = interacoesDoProf.filter((item) =>
                                idsTarefas.has(item.tarefa_id)
                              );

                              return renderPatientBrowser(
                                paciente,
                                tarefasDoPaciente,
                                interacoesDoPaciente
                              );
                            })
                            .join("")
                        : `<div class="empty-inline">Nenhum paciente efetivo para este profissional.</div>`
                    }
                  </div>
                </div>
              </div>
            </div>
          </details>
        `;
      })
      .filter(Boolean);

    if (!cards.length) {
      professionalsList.innerHTML = "";
      professionalsEmpty.hidden = false;
      return;
    }

    professionalsEmpty.hidden = true;
    professionalsList.innerHTML = cards.join("");
  }

  function renderAll() {
    if (!adminData) return;

    const termo = normalizarTexto(searchTerm?.value || "");
    const pacientes = adminData.perfis.filter((item) => item.perfil === "paciente");

    renderLogs(adminData.logs || [], termo);
    renderPacientesSemVinculo(pacientes, adminData.vinculos, adminData.perfis, termo);
    renderProfissionais(adminData, termo);
  }

  if (searchTerm) {
    searchTerm.addEventListener("input", () => {
      currentLogsPage = 1;
      renderAll();

      const termo = normalizarTexto(searchTerm.value || "");
      if (searchLogTimeout) {
        window.clearTimeout(searchLogTimeout);
      }

      searchLogTimeout = window.setTimeout(() => {
        if (!termo || termo.length < 2 || termo === lastLoggedSearch) return;
        lastLoggedSearch = termo;
        registrarEvento({
          evento: "busca_admin_executada",
          pagina: "admin_v2",
          perfil: "admin",
          userId: currentUser?.id || null,
          email: currentUser?.email || null,
          contexto: {
            termo
          }
        });
      }, 500);
    });
  }

  if (logsPagination) {
    logsPagination.addEventListener("click", (event) => {
      const button = event.target.closest("[data-log-page]");
      if (!(button instanceof HTMLButtonElement) || button.disabled) return;

      currentLogsPage += button.dataset.logPage === "next" ? 1 : -1;
      renderAll();
    });
  }

  async function iniciar() {
    try {
      esconderErroTela();

      const ok = await validarAdmin();
      if (!ok) return;

      adminData = await carregarDados();
      renderAll();
    } catch (error) {
      console.error("Erro ao iniciar admin-v2:", error);
      mostrarErroTela(error.message || "Não foi possível carregar o painel admin-v2.");
      statInteractions.textContent = "!";
    }
  }

  iniciar();
});
