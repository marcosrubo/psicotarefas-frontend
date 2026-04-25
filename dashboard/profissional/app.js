import supabase from "../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const userName = document.getElementById("userName");
  const userRole = document.getElementById("userRole");
  const userAvatar = document.getElementById("userAvatar");
  const welcomeTitle = document.getElementById("welcomeTitle");

  const btnEditName = document.getElementById("btnEditName");
  const editNameBox = document.getElementById("editNameBox");
  const editNameInput = document.getElementById("editNameInput");
  const btnCancelName = document.getElementById("btnCancelName");
  const btnSaveName = document.getElementById("btnSaveName");

  const btnBack = document.getElementById("btnBack");
  const btnTasks = document.getElementById("btnTasks");
  const btnToggleInvite = document.getElementById("btnToggleInvite");
  const btnBottomHome = document.getElementById("btnBottomHome");
  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuProfile = document.getElementById("btnMenuProfile");
  const btnMenuPatients = document.getElementById("btnMenuPatients");
  const btnMenuTasks = document.getElementById("btnMenuTasks");
  const btnMenuTaskBank = document.getElementById("btnMenuTaskBank");
  const btnMenuLogout = document.getElementById("btnMenuLogout");
  const invitePanel = document.getElementById("invitePanel");
  const inviteForm = document.getElementById("inviteForm");
  const inviteMessage = document.getElementById("inviteMessage");

  const patientNameInput = document.getElementById("patientName");
  const patientWhatsappInput = document.getElementById("patientWhatsapp");

  const inviteSummaryBox = document.getElementById("inviteSummaryBox");
  const summaryPatientName = document.getElementById("summaryPatientName");
  const summaryPatientWhatsapp = document.getElementById("summaryPatientWhatsapp");

  const generatedLinkBox = document.getElementById("generatedLinkBox");
  const generatedLinkInput = document.getElementById("generatedLink");
  const btnCopyLink = document.getElementById("btnCopyLink");
  const btnOpenWhatsapp = document.getElementById("btnOpenWhatsapp");

  const invitesList = document.getElementById("invitesList");
  const emptyState = document.getElementById("emptyState");

  const awaitingInvitesList = document.getElementById("awaitingInvitesList");
  const awaitingEmptyState = document.getElementById("awaitingEmptyState");

  const acceptedInvitesList = document.getElementById("acceptedInvitesList");
  const acceptedEmptyState = document.getElementById("acceptedEmptyState");

  const canceledInvitesList = document.getElementById("canceledInvitesList");
  const canceledEmptyState = document.getElementById("canceledEmptyState");

  let currentUser = null;
  let currentProfile = null;
  let currentInviteLink = "";
  let currentInvitePatientName = "";
  let currentWhatsappDigits = "";
  let currentProfessionalName = "seu psicólogo(a)";

  function mostrarMensagem(texto, tipo = "success") {
    if (!inviteMessage) return;
    inviteMessage.hidden = false;
    inviteMessage.textContent = texto;
    inviteMessage.className = `form-message form-message--${tipo}`;
  }

  function esconderMensagem() {
    if (!inviteMessage) return;
    inviteMessage.hidden = true;
    inviteMessage.textContent = "";
    inviteMessage.className = "form-message";
  }

  function obterIniciais(nome) {
    if (!nome) return "PT";

    return nome
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0].toUpperCase())
      .join("");
  }

  function normalizarWhatsapp(valor) {
    return (valor || "").replace(/\D/g, "");
  }

  function formatarWhatsapp(valor) {
    const digits = normalizarWhatsapp(valor).slice(0, 13);

    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }

    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }

  function gerarTokenConvite() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function montarLinkConvite(token) {
    return `${window.location.origin}/?convite=${encodeURIComponent(token)}`;
  }

  function limparNomeProfissional(valor) {
    const texto = (valor || "").trim();

    if (!texto) return "";

    if (texto.includes("@")) {
      const antesDoArroba = texto.split("@")[0].trim();
      if (!antesDoArroba) return "";
      return antesDoArroba;
    }

    return texto;
  }

  function obterPrimeiroNome(nomeCompleto) {
    const nomeLimpo = limparNomeProfissional(nomeCompleto);

    if (!nomeLimpo) return "Profissional";

    return nomeLimpo.split(" ")[0];
  }

  function formatarDataHora(dataIso) {
    if (!dataIso) return "-";

    const data = new Date(dataIso);

    return data.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function aplicarNomeNaTela(nome, email) {
    const nomeBase = limparNomeProfissional(nome || email || "");
    const nomeExibicao = nomeBase || "Profissional";
    const primeiroNome = obterPrimeiroNome(nome || email || "");

    currentProfessionalName = nomeExibicao;

    userName.textContent = nomeExibicao;
    userRole.textContent = "Psicólogo(a)";
    userAvatar.textContent = obterIniciais(nomeExibicao);
    welcomeTitle.textContent = `Olá, ${primeiroNome}`;

    editNameInput.value = nomeExibicao;
  }

  function abrirEdicaoNome() {
    editNameBox.hidden = false;
    btnEditName.hidden = true;
    editNameInput.focus();
    editNameInput.select();
  }

  function fecharEdicaoNome() {
    editNameBox.hidden = true;
    btnEditName.hidden = false;

    if (currentProfile) {
      editNameInput.value = limparNomeProfissional(
        currentProfile.nome || currentProfile.email || ""
      ) || "Profissional";
    }
  }

  function montarMensagemWhatsapp(nomePaciente, link) {
    return (
      `Olá, ${nomePaciente}! ` +
      `Seu psicólogo(a) ${currentProfessionalName} enviou um convite para acessar o PsicoTarefas.\n\n` +
      `Use este link para entrar no sistema:\n${link}`
    );
  }

  function limparResumoConvite() {
    currentInviteLink = "";
    currentInvitePatientName = "";
    currentWhatsappDigits = "";

    if (inviteSummaryBox) inviteSummaryBox.hidden = true;
    if (summaryPatientName) summaryPatientName.textContent = "";
    if (summaryPatientWhatsapp) summaryPatientWhatsapp.textContent = "";

    if (generatedLinkInput) generatedLinkInput.value = "";
    if (generatedLinkBox) generatedLinkBox.hidden = true;
  }

  function fecharMenuInferior() {
    if (!bottomMenuPanel || !btnBottomMenu) return;
    bottomMenuPanel.hidden = true;
    btnBottomMenu.setAttribute("aria-expanded", "false");
  }

  function alternarMenuInferior() {
    if (!bottomMenuPanel || !btnBottomMenu) return;
    const vaiAbrir = bottomMenuPanel.hidden;
    bottomMenuPanel.hidden = !vaiAbrir;
    btnBottomMenu.setAttribute("aria-expanded", String(vaiAbrir));
  }

  async function sairDoSistema() {
    await registrarEvento({
      evento: "logout",
      pagina: "dashboard_profissional",
      perfil: "profissional",
      userId: currentUser?.id || null,
      email: currentProfile?.email || currentUser?.email || null
    });
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Erro ao sair:", error);
    }

    window.location.href = "/";
  }

  function preencherResumoConvite(nomePaciente, whatsappDigits, inviteLink) {
    currentInviteLink = inviteLink;
    currentInvitePatientName = nomePaciente;
    currentWhatsappDigits = whatsappDigits;

    if (summaryPatientName) {
      summaryPatientName.textContent = nomePaciente;
    }

    if (summaryPatientWhatsapp) {
      summaryPatientWhatsapp.textContent = formatarWhatsapp(whatsappDigits);
    }

    if (inviteSummaryBox) {
      inviteSummaryBox.hidden = false;
    }

    if (generatedLinkInput) {
      generatedLinkInput.value = inviteLink;
    }

    if (generatedLinkBox) {
      generatedLinkBox.hidden = false;
    }
  }

  function fecharPainelConvite() {
    if (invitePanel) {
      invitePanel.hidden = true;
    }

    esconderMensagem();
    limparResumoConvite();

    if (inviteForm) {
      inviteForm.reset();
    }

    if (patientWhatsappInput) {
      patientWhatsappInput.value = "";
    }
  }

  function renderInviteItem(convite, opcoes = {}) {
    const {
      mostrarBotaoCancelar = true,
      classeBadgeExtra = "",
      classeItemExtra = "",
      mostrarAcoes = true,
      linhasMeta = []
    } = opcoes;

    const criadoEm = formatarDataHora(convite.created_at);
    const whatsapp = formatarWhatsapp(convite.patient_whatsapp);
    const classeBadge = `invite-badge ${classeBadgeExtra}`.trim();
    const classeItem = `invite-item ${classeItemExtra}`.trim();

    const metas = [
      `Enviado em ${criadoEm}`,
      ...linhasMeta.filter(Boolean)
    ];

    return `
      <article class="${classeItem}">
        <div class="invite-item__top">
          <div>
            <strong>${convite.patient_name}</strong>
            <span>${whatsapp}</span>
          </div>
          <span class="${classeBadge}">${convite.status_exibicao || convite.status}</span>
        </div>

        <div class="invite-item__meta">
          ${metas.map((linha) => `<span>${linha}</span>`).join("")}
        </div>

        ${
          mostrarAcoes
            ? `
        <div class="invite-item__actions">
          <button
            class="mini-btn mini-btn--ghost"
            data-copy-link="${convite.invite_link}"
            type="button"
          >
            Copiar link
          </button>

          <button
            class="mini-btn"
            data-whatsapp="${convite.patient_whatsapp}"
            data-patient-name="${convite.patient_name}"
            data-link="${convite.invite_link}"
            type="button"
          >
            WhatsApp
          </button>

          ${
            mostrarBotaoCancelar
              ? `
          <button
            class="mini-btn mini-btn--danger"
            data-cancel-id="${convite.id}"
            type="button"
          >
            Cancelar convite
          </button>
          `
              : ""
          }
        </div>
        `
            : ""
        }
      </article>
    `;
  }

  function renderSection(listaEl, emptyEl, itens, emptyText, renderFn) {
    if (!listaEl || !emptyEl) return;

    if (!itens.length) {
      listaEl.innerHTML = "";
      emptyEl.hidden = false;
      emptyEl.textContent = emptyText;
      return;
    }

    emptyEl.hidden = true;
    listaEl.innerHTML = itens.map(renderFn).join("");
  }

  function esperar(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  async function pacienteTemVinculoAtivo(userId) {
    const { data, error } = await supabase
      .from("vinculos")
      .select("id")
      .eq("patient_user_id", userId)
      .eq("status", "ativo")
      .limit(1);

    if (error) {
      return false;
    }

    return Array.isArray(data) && data.length > 0;
  }

  async function redirecionarPorPerfil(userId, perfil) {
    if (perfil === "profissional") {
      window.location.href = "../../dashboard/profissional/index.html";
      return;
    }

    if (perfil === "paciente") {
      const temVinculo = await pacienteTemVinculoAtivo(userId);
      window.location.href = temVinculo
        ? "../../dashboard/paciente-com-vinculo/index.html"
        : "../../dashboard/paciente-sem-vinculo/index.html";
      return;
    }

    window.location.href = "../../auth/profissional-login/index.html";
  }

  async function obterUsuarioAutenticado() {
    for (let tentativa = 0; tentativa < 2; tentativa += 1) {
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(`Falha ao obter sessão autenticada: ${sessionError.message}`);
      }

      if (session?.user) {
        return session.user;
      }

      if (tentativa === 0) {
        await esperar(180);
      }
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError) {
      throw new Error(`Falha ao obter usuário autenticado: ${userError.message}`);
    }

    return user || null;
  }

  async function carregarUsuario() {
    try {
      const user = await obterUsuarioAutenticado();

      if (!user) {
        window.location.href = "../../auth/profissional-login/index.html";
        return;
      }

      currentUser = user;

      const { data: perfil, error } = await supabase
        .from("perfis")
        .select("nome, email, perfil")
        .eq("user_id", currentUser.id)
        .single();

      if (error || !perfil) {
        throw new Error("Perfil não encontrado.");
      }

      if (perfil.perfil !== "profissional") {
        await redirecionarPorPerfil(currentUser.id, perfil.perfil);
        return;
      }

      currentProfile = perfil;
      aplicarNomeNaTela(perfil.nome, perfil.email);
      await registrarAcessoPagina({
        pagina: "dashboard_profissional",
        perfil: "profissional",
        userId: currentUser.id,
        email: perfil.email || currentUser.email || null
      });
    } catch (error) {
      console.error("Erro ao carregar usuário:", error);
      mostrarMensagem(
        "Erro ao carregar os dados do profissional. Verifique o console.",
        "error"
      );
    }
  }

  async function atualizarNomeProfissional() {
    if (!currentUser || !currentProfile) {
      mostrarMensagem("Sessão inválida. Entre novamente.", "error");
      return;
    }

    const novoNome = editNameInput.value.trim();

    if (!novoNome) {
      mostrarMensagem("Informe um nome válido.", "error");
      return;
    }

    btnSaveName.disabled = true;
    btnSaveName.textContent = "Salvando...";

    try {
      const { error } = await supabase
        .from("perfis")
        .update({ nome: novoNome })
        .eq("user_id", currentUser.id);

      if (error) {
        throw error;
      }

      currentProfile.nome = novoNome;
      aplicarNomeNaTela(currentProfile.nome, currentProfile.email);
      fecharEdicaoNome();
      mostrarMensagem("Nome atualizado com sucesso.", "success");
    } catch (error) {
      console.error("Erro ao atualizar nome:", error);
      mostrarMensagem("Não foi possível atualizar o nome.", "error");
    } finally {
      btnSaveName.disabled = false;
      btnSaveName.textContent = "Salvar";
    }
  }

  async function carregarConvites() {
    if (!currentUser) return;

    try {
      const [{ data: convites, error: erroConvites }, { data: vinculos, error: erroVinculos }] =
        await Promise.all([
          supabase
            .from("convites")
            .select("id, token, patient_name, patient_whatsapp, invite_link, status, created_at")
            .eq("professional_user_id", currentUser.id)
            .in("status", ["pendente", "respondido", "aceito", "cancelado"])
            .order("created_at", { ascending: false }),
          supabase
            .from("vinculos")
            .select("token_convite, status, patient_email, respondeu_convite_at, confirmed_at")
            .eq("professional_user_id", currentUser.id)
        ]);

      if (erroConvites) throw erroConvites;
      if (erroVinculos) throw erroVinculos;

      const vinculosPorToken = new Map(
        (vinculos || []).map((item) => [item.token_convite, item])
      );

      const convitesComStatus = (convites || []).map((convite) => {
        const vinculo = vinculosPorToken.get(convite.token) || null;

        let categoria = "pendente";
        let statusExibicao = "pendente";
        const linhasMeta = [];

        if (vinculo?.patient_email) {
          linhasMeta.push(`E-mail informado: ${vinculo.patient_email}`);
        }

        if (vinculo?.respondeu_convite_at) {
          linhasMeta.push(`Respondeu em ${formatarDataHora(vinculo.respondeu_convite_at)}`);
        }

        if (vinculo?.confirmed_at) {
          linhasMeta.push(`Confirmou em ${formatarDataHora(vinculo.confirmed_at)}`);
        }

        if (convite.status === "cancelado") {
          categoria = "cancelado";
          statusExibicao = "cancelado";
        } else if (vinculo?.status === "ativo" || convite.status === "aceito") {
          categoria = "aceito";
          statusExibicao = "ativo";
        } else if (
          vinculo?.status === "aguardando_confirmacao_email" ||
          convite.status === "respondido"
        ) {
          categoria = "aguardando";
          statusExibicao = "aguardando confirmação";
        } else {
          categoria = "pendente";
          statusExibicao = "pendente";
        }

        return {
          ...convite,
          vinculo_status: vinculo?.status || null,
          patient_email: vinculo?.patient_email || null,
          respondeu_convite_at: vinculo?.respondeu_convite_at || null,
          confirmed_at: vinculo?.confirmed_at || null,
          categoria,
          status_exibicao: statusExibicao,
          linhasMeta
        };
      });

      const convitesPendentes = convitesComStatus.filter((item) => item.categoria === "pendente");
      const convitesAguardando = convitesComStatus.filter((item) => item.categoria === "aguardando");
      const convitesAceitos = convitesComStatus.filter((item) => item.categoria === "aceito");
      const convitesCancelados = convitesComStatus.filter((item) => item.categoria === "cancelado");

      renderSection(
        invitesList,
        emptyState,
        convitesPendentes,
        "Você ainda não enviou convites pendentes.",
        (item) =>
          renderInviteItem(item, {
            mostrarBotaoCancelar: true,
            mostrarAcoes: true,
            linhasMeta: item.linhasMeta
          })
      );

      renderSection(
        awaitingInvitesList,
        awaitingEmptyState,
        convitesAguardando,
        "Nenhum convite aguardando confirmação no momento.",
        (item) =>
          renderInviteItem(item, {
            mostrarBotaoCancelar: false,
            mostrarAcoes: false,
            classeBadgeExtra: "invite-badge--awaiting",
            classeItemExtra: "invite-item--awaiting",
            linhasMeta: item.linhasMeta
          })
      );

      renderSection(
        acceptedInvitesList,
        acceptedEmptyState,
        convitesAceitos,
        "Nenhum convite concluído até agora.",
        (item) =>
          renderInviteItem(item, {
            mostrarBotaoCancelar: false,
            mostrarAcoes: false,
            classeBadgeExtra: "invite-badge--accepted",
            classeItemExtra: "invite-item--accepted",
            linhasMeta: item.linhasMeta
          })
      );

      renderSection(
        canceledInvitesList,
        canceledEmptyState,
        convitesCancelados,
        "Você ainda não possui convites cancelados.",
        (item) =>
          renderInviteItem(item, {
            mostrarBotaoCancelar: false,
            mostrarAcoes: false,
            classeBadgeExtra: "invite-badge--canceled",
            classeItemExtra: "invite-item--canceled",
            linhasMeta: item.linhasMeta
          })
      );
    } catch (error) {
      console.error("Erro ao carregar convites:", error);

      renderSection(
        invitesList,
        emptyState,
        [],
        "Não foi possível carregar os convites.",
        () => ""
      );

      renderSection(
        awaitingInvitesList,
        awaitingEmptyState,
        [],
        "Não foi possível carregar os convites aguardando confirmação.",
        () => ""
      );

      renderSection(
        acceptedInvitesList,
        acceptedEmptyState,
        [],
        "Não foi possível carregar os convites concluídos.",
        () => ""
      );

      renderSection(
        canceledInvitesList,
        canceledEmptyState,
        [],
        "Não foi possível carregar os convites cancelados.",
        () => ""
      );
    }
  }

  async function copiarTexto(texto) {
    await navigator.clipboard.writeText(texto);
  }

  async function cancelarConvite(inviteId) {
    const { data: convite, error: erroBuscarConvite } = await supabase
      .from("convites")
      .select("id, token")
      .eq("id", inviteId)
      .eq("professional_user_id", currentUser.id)
      .single();

    if (erroBuscarConvite || !convite) {
      throw new Error("Não foi possível localizar o convite.");
    }

    const { error: erroCancelarConvite } = await supabase
      .from("convites")
      .update({ status: "cancelado" })
      .eq("id", inviteId)
      .eq("professional_user_id", currentUser.id);

    if (erroCancelarConvite) {
      throw erroCancelarConvite;
    }

    const { error: erroEncerrarVinculo } = await supabase
      .from("vinculos")
      .update({ status: "encerrado" })
      .eq("token_convite", convite.token)
      .eq("professional_user_id", currentUser.id);

    if (erroEncerrarVinculo) {
      throw erroEncerrarVinculo;
    }
  }

  async function criarEstruturaConvite({
    token,
    patientName,
    patientWhatsapp,
    inviteLink
  }) {
    const { error: erroCriarConvite } = await supabase.from("convites").insert({
      token,
      professional_user_id: currentUser.id,
      patient_name: patientName,
      patient_whatsapp: patientWhatsapp,
      invite_link: inviteLink,
      status: "pendente"
    });

    if (erroCriarConvite) {
      throw erroCriarConvite;
    }

    const { error: erroCriarVinculo } = await supabase.from("vinculos").insert({
      professional_user_id: currentUser.id,
      patient_user_id: null,
      token_convite: token,
      patient_name: patientName,
      patient_whatsapp: patientWhatsapp,
      patient_email: null,
      convite_created_at: new Date().toISOString(),
      respondeu_convite_at: null,
      confirmed_at: null,
      status: "pendente_convite"
    });

    if (erroCriarVinculo) {
      await supabase
        .from("convites")
        .delete()
        .eq("token", token)
        .eq("professional_user_id", currentUser.id);

      throw erroCriarVinculo;
    }
  }

  function abrirWhatsapp(numero, nomePaciente, link) {
    const digits = normalizarWhatsapp(numero);

    if (!digits) {
      mostrarMensagem("Informe um WhatsApp válido para abrir o envio.", "error");
      return;
    }

    const mensagem = encodeURIComponent(montarMensagemWhatsapp(nomePaciente, link));
    const url = `https://wa.me/${digits}?text=${mensagem}`;

    window.open(url, "_blank");

    fecharPainelConvite();
  }

  btnEditName.addEventListener("click", abrirEdicaoNome);
  btnCancelName.addEventListener("click", fecharEdicaoNome);
  btnSaveName.addEventListener("click", atualizarNomeProfissional);

  editNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      atualizarNomeProfissional();
    }

    if (event.key === "Escape") {
      fecharEdicaoNome();
    }
  });

  if (btnTasks) {
    btnTasks.addEventListener("click", () => {
      registrarEvento({
        evento: "gestao_tarefas_aberta",
        pagina: "dashboard_profissional",
        perfil: "profissional",
        userId: currentUser?.id || null,
        email: currentProfile?.email || currentUser?.email || null
      });
      window.location.href = "../profissional-tarefas/index.html";
    });
  }

  if (btnToggleInvite && invitePanel) {
    btnToggleInvite.addEventListener("click", () => {
      const vaiAbrir = invitePanel.hidden;

      if (vaiAbrir) {
        invitePanel.hidden = false;
        registrarEvento({
          evento: "painel_convite_aberto",
          pagina: "dashboard_profissional",
          perfil: "profissional",
          userId: currentUser?.id || null,
          email: currentProfile?.email || currentUser?.email || null
        });
        if (patientNameInput) {
          patientNameInput.focus();
        }
      } else {
        fecharPainelConvite();
      }
    });
  }

  if (patientWhatsappInput) {
    patientWhatsappInput.addEventListener("input", () => {
      patientWhatsappInput.value = formatarWhatsapp(patientWhatsappInput.value);
    });
  }

  if (inviteForm) {
    inviteForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      esconderMensagem();

      const patientName = patientNameInput.value.trim();
      const patientWhatsapp = normalizarWhatsapp(patientWhatsappInput.value);

      if (!patientName) {
        mostrarMensagem("Informe o nome do paciente.", "error");
        return;
      }

      if (patientWhatsapp.length < 10) {
        mostrarMensagem("Informe um WhatsApp válido com DDD.", "error");
        return;
      }

      if (!currentUser) {
        mostrarMensagem("Sessão inválida. Entre novamente.", "error");
        return;
      }

      const token = gerarTokenConvite();
      const inviteLink = montarLinkConvite(token);

      try {
        await criarEstruturaConvite({
          token,
          patientName,
          patientWhatsapp,
          inviteLink
        });

        preencherResumoConvite(patientName, patientWhatsapp, inviteLink);
        await registrarEvento({
          evento: "convite_criado",
          pagina: "dashboard_profissional",
          perfil: "profissional",
          userId: currentUser.id,
          email: currentProfile?.email || currentUser.email || null,
          contexto: {
            patient_name: patientName
          }
        });

        mostrarMensagem(
          "Convite gerado com sucesso! Agora envie pelo WhatsApp.",
          "success"
        );

        inviteForm.reset();
        patientWhatsappInput.value = "";
        await carregarConvites();
      } catch (error) {
        console.error("Erro ao gerar convite:", error);
        mostrarMensagem("Não foi possível gerar o convite.", "error");
      }
    });
  }

  if (btnCopyLink) {
    btnCopyLink.addEventListener("click", async () => {
      if (!currentInviteLink) return;

      try {
        await copiarTexto(currentInviteLink);
        await registrarEvento({
          evento: "link_convite_copiado",
          pagina: "dashboard_profissional",
          perfil: "profissional",
          userId: currentUser?.id || null,
          email: currentProfile?.email || currentUser?.email || null,
          contexto: {
            origem: "resumo_convite"
          }
        });
        mostrarMensagem("Link copiado para a área de transferência.", "success");
      } catch (error) {
        console.error("Erro ao copiar link:", error);
        mostrarMensagem("Não foi possível copiar o link.", "error");
      }
    });
  }

  if (btnOpenWhatsapp) {
    btnOpenWhatsapp.addEventListener("click", () => {
      const link = generatedLinkInput.value.trim();
      registrarEvento({
        evento: "whatsapp_convite_aberto",
        pagina: "dashboard_profissional",
        perfil: "profissional",
        userId: currentUser?.id || null,
        email: currentProfile?.email || currentUser?.email || null,
        contexto: {
          origem: "resumo_convite",
          patient_name: currentInvitePatientName || null
        }
      });

      abrirWhatsapp(
        currentWhatsappDigits,
        currentInvitePatientName || "paciente",
        link
      );
    });
  }

  document.addEventListener("click", async (event) => {
    const copyButton = event.target.closest("[data-copy-link]");
    const whatsappButton = event.target.closest("[data-whatsapp]");
    const cancelButton = event.target.closest("[data-cancel-id]");

    if (copyButton) {
      const link = copyButton.getAttribute("data-copy-link");

      try {
        await copiarTexto(link);
        await registrarEvento({
          evento: "link_convite_copiado",
          pagina: "dashboard_profissional",
          perfil: "profissional",
          userId: currentUser?.id || null,
          email: currentProfile?.email || currentUser?.email || null,
          contexto: {
            origem: "lista_convites"
          }
        });
        mostrarMensagem("Link copiado para a área de transferência.", "success");
      } catch (error) {
        console.error("Erro ao copiar link:", error);
        mostrarMensagem("Não foi possível copiar o link.", "error");
      }

      return;
    }

    if (whatsappButton) {
      const numero = whatsappButton.getAttribute("data-whatsapp");
      const nomePaciente = whatsappButton.getAttribute("data-patient-name");
      const link = whatsappButton.getAttribute("data-link");

      registrarEvento({
        evento: "whatsapp_convite_aberto",
        pagina: "dashboard_profissional",
        perfil: "profissional",
        userId: currentUser?.id || null,
        email: currentProfile?.email || currentUser?.email || null,
        contexto: {
          origem: "lista_convites",
          patient_name: nomePaciente || null
        }
      });
      abrirWhatsapp(numero, nomePaciente, link);
      return;
    }

    if (cancelButton) {
      const inviteId = cancelButton.getAttribute("data-cancel-id");
      const confirmar = window.confirm("Deseja cancelar este convite?");

      if (!confirmar) return;

      try {
        await cancelarConvite(inviteId);
        await registrarEvento({
          evento: "convite_cancelado",
          pagina: "dashboard_profissional",
          perfil: "profissional",
          userId: currentUser.id,
          email: currentProfile?.email || currentUser.email || null,
          contexto: {
            convite_id: inviteId
          }
        });
        mostrarMensagem("Convite cancelado com sucesso.", "success");
        await carregarConvites();
      } catch (error) {
        console.error("Erro ao cancelar convite:", error);
        mostrarMensagem("Não foi possível cancelar o convite.", "error");
      }
    }
  });

  if (btnBack) {
    btnBack.addEventListener("click", sairDoSistema);
  }

  if (btnBottomHome) {
    btnBottomHome.addEventListener("click", () => {
      window.location.href = "./index.html";
    });
  }

  if (btnBottomMenu) {
    btnBottomMenu.addEventListener("click", (event) => {
      event.stopPropagation();
      alternarMenuInferior();
    });
  }

  if (btnMenuProfile) {
    btnMenuProfile.addEventListener("click", () => {
      fecharMenuInferior();
      window.scrollTo({ top: 0, behavior: "smooth" });
      abrirEdicaoNome();
    });
  }

  if (btnMenuPatients) {
    btnMenuPatients.addEventListener("click", () => {
      fecharMenuInferior();
      window.scrollTo({ top: document.body.scrollHeight * 0.2, behavior: "smooth" });
      if (invitePanel?.hidden) {
        invitePanel.hidden = false;
      }
      if (patientNameInput) {
        window.setTimeout(() => patientNameInput.focus(), 250);
      }
    });
  }

  if (btnMenuTasks) {
    btnMenuTasks.addEventListener("click", () => {
      fecharMenuInferior();
      window.location.href = "../profissional-tarefas/index.html";
    });
  }

  if (btnMenuTaskBank) {
    btnMenuTaskBank.addEventListener("click", () => {
      fecharMenuInferior();
      window.location.href = "../banco-de-tarefas/index.html";
    });
  }

  if (btnMenuLogout) {
    btnMenuLogout.addEventListener("click", async () => {
      fecharMenuInferior();
      await sairDoSistema();
    });
  }

  document.addEventListener("click", (event) => {
    if (!bottomMenuPanel || bottomMenuPanel.hidden) return;
    if (event.target.closest(".bottom-nav__menu-wrap")) return;
    fecharMenuInferior();
  });

  async function iniciarDashboard() {
    await carregarUsuario();
    await carregarConvites();
  }

  iniciarDashboard();
});
