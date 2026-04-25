import supabase from "../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const ADMIN_EMAIL = "marcos@rubo.com.br";

  const userName = document.getElementById("userName");
  const userRole = document.getElementById("userRole");
  const userAvatar = document.getElementById("userAvatar");
  const welcomeTitle = document.getElementById("welcomeTitle");

  const statUsers = document.getElementById("statUsers");
  const statPerfis = document.getElementById("statPerfis");
  const statVinculos = document.getElementById("statVinculos");
  const statProfessionals = document.getElementById("statProfessionals");
  const statPatients = document.getElementById("statPatients");

  const statInvitesCreated = document.getElementById("statInvitesCreated");
  const statInvitesAccepted = document.getElementById("statInvitesAccepted");
  const statInvitesPending = document.getElementById("statInvitesPending");
  const statInvitesCanceled = document.getElementById("statInvitesCanceled");

  const professionalsAdminList = document.getElementById("professionalsAdminList");
  const professionalsEmpty = document.getElementById("professionalsEmpty");

  const patientsWithoutLinkList = document.getElementById("patientsWithoutLinkList");
  const patientsWithoutLinkEmpty = document.getElementById("patientsWithoutLinkEmpty");

  const recentInvitesList = document.getElementById("recentInvitesList");
  const recentInvitesEmpty = document.getElementById("recentInvitesEmpty");

  const btnBack = document.getElementById("btnBack");

  let currentUser = null;

  function limparNome(valor) {
    if (!valor) return "";
    return valor.includes("@") ? valor.split("@")[0] : valor;
  }

  function obterIniciais(nome) {
    return (nome || "AD")
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0].toUpperCase())
      .join("");
  }

  function formatarData(data) {
    return new Date(data).toLocaleString("pt-BR");
  }

  function escapeHtml(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function montarStatusBadge(status) {
    if (status === "ativo") return `<span class="status-badge status-badge--success">Ativo</span>`;
    if (status === "cancelado") return `<span class="status-badge status-badge--danger">Cancelado</span>`;
    if (status === "pendente") return `<span class="status-badge status-badge--primary">Pendente</span>`;
    if (status === "respondido") return `<span class="status-badge status-badge--primary">Respondido</span>`;
    if (status === "aceito") return `<span class="status-badge status-badge--success">Aceito</span>`;
    if (status === "aguardando_confirmacao_email") {
      return `<span class="status-badge status-badge--warning">Aguardando confirmação</span>`;
    }
    if (status === "pendente_convite") {
      return `<span class="status-badge status-badge--primary">Pendente convite</span>`;
    }
    if (status === "encerrado") {
      return `<span class="status-badge status-badge--muted">Encerrado</span>`;
    }
    return `<span class="status-badge status-badge--muted">${escapeHtml(status)}</span>`;
  }

  function montarBadgeConfirmacaoEmail(prof) {
    const temCampoBooleano = Object.prototype.hasOwnProperty.call(prof, "email_confirmed");
    const temCampoData = Object.prototype.hasOwnProperty.call(prof, "email_confirmed_at");

    if (temCampoBooleano) {
      return prof.email_confirmed
        ? `<span class="status-badge status-badge--success">E-mail confirmado</span>`
        : `<span class="status-badge status-badge--danger">E-mail não confirmado</span>`;
    }

    if (temCampoData) {
      return prof.email_confirmed_at
        ? `<span class="status-badge status-badge--success">E-mail confirmado</span>`
        : `<span class="status-badge status-badge--danger">E-mail não confirmado</span>`;
    }

    return `<span class="status-badge status-badge--muted">E-mail: não informado</span>`;
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

      const nomeProfissional = profissional?.nome || profissional?.email || "Profissional";
      return `CONVIDADO por ${nomeProfissional}`;
    }

    return "sem CONVITE";
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
      pagina: "admin",
      perfil: "admin",
      userId: session.user.id,
      email: session.user.email || ""
    });

    return true;
  }

  async function carregarDados() {
    const [
      { data: totalUsers },
      { data: perfis },
      { data: vinculos },
      { data: convites }
    ] = await Promise.all([
      supabase.rpc("admin_total_users"),
      supabase.from("perfis").select("*"),
      supabase.from("vinculos").select("*"),
      supabase.from("convites").select("*").order("created_at", { ascending: false })
    ]);

    return {
      totalUsers: totalUsers || 0,
      perfis: perfis || [],
      vinculos: vinculos || [],
      convites: convites || []
    };
  }

  function renderDashboard({ totalUsers, perfis, vinculos, convites }) {
    const professionals = perfis.filter((p) => p.perfil === "profissional");
    const patients = perfis.filter((p) => p.perfil === "paciente");

    const convitesPendentes = convites.filter((c) => c.status === "pendente");
    const convitesAceitos = convites.filter((c) => c.status === "aceito");
    const convitesCancelados = convites.filter((c) => c.status === "cancelado");

    statUsers.textContent = totalUsers;
    statPerfis.textContent = perfis.length;
    statVinculos.textContent = vinculos.length;
    statProfessionals.textContent = professionals.length;
    statPatients.textContent = patients.length;

    statInvitesCreated.textContent = convites.length;
    statInvitesAccepted.textContent = convitesAceitos.length;
    statInvitesPending.textContent = convitesPendentes.length;
    statInvitesCanceled.textContent = convitesCancelados.length;

    if (!professionals.length) {
      professionalsEmpty.hidden = false;
    } else {
      professionalsEmpty.hidden = true;

      professionalsAdminList.innerHTML = professionals
        .map((prof) => {
          const vinculosDoProf = vinculos.filter((v) => v.professional_user_id === prof.user_id);
          const convitesDoProf = convites.filter((c) => c.professional_user_id === prof.user_id);

          return `
          <div class="admin-card">
            <div class="admin-card__header">
              <div class="admin-card__avatar">${escapeHtml(obterIniciais(prof.nome || prof.email))}</div>
              <div class="admin-card__title">
                <strong>${escapeHtml(prof.nome || prof.email)}</strong>
                <span>${escapeHtml(prof.email || "")}</span>
              </div>
            </div>

            <div class="admin-card__block">
              <h4>Status do profissional</h4>
              <div class="items-stack">
                <div class="item-tag">
                  <div class="item-tag__top">
                    <strong>Status do e-mail</strong>
                    ${montarBadgeConfirmacaoEmail(prof)}
                  </div>
                </div>
              </div>
            </div>

            <div class="admin-card__block">
              <h4>Vínculos</h4>
              <div class="items-stack">
                ${
                  vinculosDoProf.length
                    ? vinculosDoProf
                        .map(
                          (v) => `
                        <div class="item-tag">
                          <div class="item-tag__top">
                            <strong>${escapeHtml(v.patient_name || "Paciente")}</strong>
                            ${montarStatusBadge(v.status)}
                          </div>
                        </div>
                      `
                        )
                        .join("")
                    : `<div class="empty-inline">Nenhum vínculo</div>`
                }
              </div>
            </div>

            <div class="admin-card__block">
              <h4>Convites</h4>
              <div class="items-stack">
                ${
                  convitesDoProf.length
                    ? convitesDoProf
                        .map(
                          (c) => `
                        <div class="item-tag">
                          <div class="item-tag__top">
                            <strong>${escapeHtml(c.patient_name || "Paciente")}</strong>
                            ${montarStatusBadge(c.status)}
                          </div>
                          <span>${escapeHtml(formatarData(c.created_at))}</span>
                        </div>
                      `
                        )
                        .join("")
                    : `<div class="empty-inline">Nenhum convite</div>`
                }
              </div>
            </div>
          </div>
        `;
        })
        .join("");
    }

    const pacientesSemVinculo = patients.filter((p) => {
      return !vinculos.some((v) => v.patient_user_id === p.user_id && v.status === "ativo");
    });

    if (!pacientesSemVinculo.length) {
      patientsWithoutLinkEmpty.hidden = false;
    } else {
      patientsWithoutLinkEmpty.hidden = true;

      patientsWithoutLinkList.innerHTML = pacientesSemVinculo
        .map((p) => {
          const descricao = obterDescricaoPacienteSemVinculo(p, vinculos, perfis);

          return `
            <div class="simple-item">
              <div>
                <strong>${escapeHtml(p.nome || p.email)}</strong>
                <small>${escapeHtml(descricao)}</small>
              </div>
              <span>${escapeHtml(p.email || "")}</span>
            </div>
          `;
        })
        .join("");
    }

    const recentes = convites.slice(0, 10);

    if (!recentes.length) {
      recentInvitesEmpty.hidden = false;
    } else {
      recentInvitesEmpty.hidden = true;

      recentInvitesList.innerHTML = recentes
        .map(
          (c) => `
        <div class="simple-item">
          <strong>${escapeHtml(c.patient_name || "Paciente")}</strong>
          <span>${escapeHtml(c.status || "")} • ${escapeHtml(formatarData(c.created_at))}</span>
        </div>
      `
        )
        .join("");
    }
  }

  if (btnBack) {
    btnBack.addEventListener("click", async () => {
      await registrarEvento({
        evento: "logout",
        pagina: "admin",
        perfil: "admin",
        userId: currentUser?.id || null,
        email: currentUser?.email || null
      });
      await supabase.auth.signOut();
      window.location.href = "/";
    });
  }

  async function iniciar() {
    const ok = await validarAdmin();
    if (!ok) return;

    const dados = await carregarDados();
    renderDashboard(dados);
  }

  iniciar();
});
