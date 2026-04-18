import supabase from "../../shared/supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  const ADMIN_EMAIL = "marcos@rubo.com.br";

  const userName = document.getElementById("userName");
  const userRole = document.getElementById("userRole");
  const userAvatar = document.getElementById("userAvatar");
  const welcomeTitle = document.getElementById("welcomeTitle");
  const welcomeText = document.getElementById("welcomeText");

  const statProfessionals = document.getElementById("statProfessionals");
  const statPatients = document.getElementById("statPatients");
  const statActiveLinks = document.getElementById("statActiveLinks");
  const statWithoutLink = document.getElementById("statWithoutLink");
  const statPendingInvites = document.getElementById("statPendingInvites");
  const statPendingRequests = document.getElementById("statPendingRequests");

  const professionalsAdminList = document.getElementById("professionalsAdminList");
  const professionalsEmpty = document.getElementById("professionalsEmpty");

  const patientsWithoutLinkList = document.getElementById("patientsWithoutLinkList");
  const patientsWithoutLinkEmpty = document.getElementById("patientsWithoutLinkEmpty");

  const recentInvitesList = document.getElementById("recentInvitesList");
  const recentInvitesEmpty = document.getElementById("recentInvitesEmpty");

  const btnLogout = document.getElementById("btnLogout");

  let currentUser = null;
  let currentProfile = null;

  function obterIniciais(nome) {
    if (!nome) return "AD";

    return nome
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0].toUpperCase())
      .join("");
  }

  function limparNome(valor) {
    const texto = (valor || "").trim();

    if (!texto) return "";

    if (texto.includes("@")) {
      const antesDoArroba = texto.split("@")[0].trim();
      return antesDoArroba || "";
    }

    return texto;
  }

  function obterPrimeiroNome(nomeCompleto) {
    const nomeLimpo = limparNome(nomeCompleto);
    if (!nomeLimpo) return "Admin";
    return nomeLimpo.split(" ")[0];
  }

  function nomeExibicao(perfil) {
    return limparNome(perfil?.nome || perfil?.email || "") || "Sem nome";
  }

  function formatarDataHora(dataIso) {
    return new Date(dataIso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function renderPatientTag(patient, extraText = "") {
    const nome = nomeExibicao(patient);
    const email = patient?.email || "";

    return `
      <div class="item-tag">
        <strong>${nome}</strong>
        <span>${email}</span>
        ${extraText ? `<small>${extraText}</small>` : ""}
      </div>
    `;
  }

  function renderInviteTag(invite) {
    const patientName = invite.patient_name || "Paciente";
    const patientWhatsapp = invite.patient_whatsapp || "";
    const data = formatarDataHora(invite.created_at);

    return `
      <div class="item-tag">
        <strong>${patientName}</strong>
        <span>${patientWhatsapp}</span>
        <small>${invite.status || "pendente"} • ${data}</small>
      </div>
    `;
  }

  function renderProfessionalCard(professional, activeLinks, pendingInvites, patientMap) {
    const nome = nomeExibicao(professional);
    const email = professional.email || "";

    const pacientesHtml =
      activeLinks.length > 0
        ? activeLinks
            .map((link) => {
              const patient = patientMap.get(link.patient_user_id);
              if (!patient) return "";

              return renderPatientTag(
                patient,
                `Vínculo ativo desde ${formatarDataHora(link.created_at)}`
              );
            })
            .join("")
        : `<div class="empty-inline">Nenhum paciente vinculado.</div>`;

    const invitesHtml =
      pendingInvites.length > 0
        ? pendingInvites.map((invite) => renderInviteTag(invite)).join("")
        : `<div class="empty-inline">Nenhum convite pendente.</div>`;

    return `
      <article class="admin-card">
        <div class="admin-card__header">
          <div class="admin-card__avatar">${obterIniciais(nome)}</div>

          <div class="admin-card__title">
            <strong>${nome}</strong>
            <span>${email}</span>
          </div>

          <div class="admin-card__stats">
            <span>${activeLinks.length} vínculo(s)</span>
            <span>${pendingInvites.length} convite(s)</span>
          </div>
        </div>

        <div class="admin-card__block">
          <h4>Pacientes vinculados</h4>
          <div class="items-stack">
            ${pacientesHtml}
          </div>
        </div>

        <div class="admin-card__block">
          <h4>Pacientes convidados</h4>
          <div class="items-stack">
            ${invitesHtml}
          </div>
        </div>
      </article>
    `;
  }

  function renderSimplePatient(patient, statusText = "") {
    const nome = nomeExibicao(patient);
    const email = patient.email || "";

    return `
      <article class="simple-item">
        <div>
          <strong>${nome}</strong>
          <span>${email}</span>
        </div>
        <small>${statusText || "Sem vínculo ativo"}</small>
      </article>
    `;
  }

  function renderSimpleInvite(invite, professionalMap) {
    const professional = professionalMap.get(invite.professional_user_id);
    const nomeProfissional = professional ? nomeExibicao(professional) : "Profissional";

    return `
      <article class="simple-item">
        <div>
          <strong>${invite.patient_name || "Paciente"}</strong>
          <span>${nomeProfissional}</span>
        </div>
        <small>${invite.status || "pendente"} • ${formatarDataHora(invite.created_at)}</small>
      </article>
    `;
  }

  async function validarAdmin() {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href = "../../auth/index.html?perfil=profissional";
      return false;
    }

    currentUser = session.user;

    const emailSessao = (session.user.email || "").toLowerCase();

    if (emailSessao !== ADMIN_EMAIL.toLowerCase()) {
      await supabase.auth.signOut();
      window.location.href = "../../auth/index.html?perfil=profissional";
      return false;
    }

    const { data: perfil, error } = await supabase
      .from("perfis")
      .select("user_id, nome, email, perfil")
      .eq("user_id", currentUser.id)
      .single();

    if (error || !perfil) {
      await supabase.auth.signOut();
      window.location.href = "../../auth/index.html?perfil=profissional";
      return false;
    }

    currentProfile = perfil;

    const nome = nomeExibicao(perfil);
    const primeiroNome = obterPrimeiroNome(perfil.nome || perfil.email || "");

    userName.textContent = nome;
    userRole.textContent = "Administrador";
    userAvatar.textContent = obterIniciais(nome);
    welcomeTitle.textContent = `Olá, ${primeiroNome}`;
    welcomeText.textContent =
      "Acompanhe profissionais, pacientes, vínculos e convites em uma visão centralizada do sistema.";

    return true;
  }

  async function carregarDados() {
    const [
      { data: perfis, error: perfisError },
      { data: vinculos, error: vinculosError },
      { data: convites, error: convitesError }
    ] = await Promise.all([
      supabase
        .from("perfis")
        .select("user_id, nome, email, perfil")
        .order("nome", { ascending: true }),
      supabase
        .from("vinculos")
        .select("id, professional_user_id, patient_user_id, status, created_at")
        .order("created_at", { ascending: false }),
      supabase
        .from("convites")
        .select("id, professional_user_id, patient_name, patient_whatsapp, status, created_at")
        .order("created_at", { ascending: false })
    ]);

    if (perfisError) throw perfisError;
    if (vinculosError) throw vinculosError;
    if (convitesError) throw convitesError;

    return {
      perfis: perfis || [],
      vinculos: vinculos || [],
      convites: convites || []
    };
  }

  function preencherEstatisticas({
    professionals,
    patients,
    activeLinks,
    patientsWithoutActiveLink,
    pendingInvites,
    pendingRequests
  }) {
    statProfessionals.textContent = String(professionals.length);
    statPatients.textContent = String(patients.length);
    statActiveLinks.textContent = String(activeLinks.length);
    statWithoutLink.textContent = String(patientsWithoutActiveLink.length);
    statPendingInvites.textContent = String(pendingInvites.length);
    statPendingRequests.textContent = String(pendingRequests.length);
  }

  function renderDashboard({ perfis, vinculos, convites }) {
    const professionals = perfis.filter((item) => item.perfil === "profissional");
    const patients = perfis.filter((item) => item.perfil === "paciente");

    const activeLinks = vinculos.filter((item) => item.status === "ativo");
    const pendingRequests = vinculos.filter((item) => item.status === "pendente");
    const pendingInvites = convites.filter((item) => item.status === "pendente");

    const perfilMap = new Map(perfis.map((item) => [item.user_id, item]));
    const professionalMap = new Map(professionals.map((item) => [item.user_id, item]));
    const patientMap = new Map(patients.map((item) => [item.user_id, item]));

    const patientIdsWithActiveLink = new Set(activeLinks.map((item) => item.patient_user_id));

    const patientsWithoutActiveLink = patients.filter(
      (patient) => !patientIdsWithActiveLink.has(patient.user_id)
    );

    preencherEstatisticas({
      professionals,
      patients,
      activeLinks,
      patientsWithoutActiveLink,
      pendingInvites,
      pendingRequests
    });

    if (professionals.length === 0) {
      professionalsAdminList.innerHTML = "";
      professionalsEmpty.hidden = false;
    } else {
      professionalsEmpty.hidden = true;

      professionalsAdminList.innerHTML = professionals
        .map((professional) => {
          const professionalActiveLinks = activeLinks.filter(
            (link) => link.professional_user_id === professional.user_id
          );

          const professionalPendingInvites = pendingInvites.filter(
            (invite) => invite.professional_user_id === professional.user_id
          );

          return renderProfessionalCard(
            professional,
            professionalActiveLinks,
            professionalPendingInvites,
            patientMap
          );
        })
        .join("");
    }

    if (patientsWithoutActiveLink.length === 0) {
      patientsWithoutLinkList.innerHTML = "";
      patientsWithoutLinkEmpty.hidden = true;
      patientsWithoutLinkEmpty.hidden = false;
    } else {
      patientsWithoutLinkEmpty.hidden = true;

      patientsWithoutLinkList.innerHTML = patientsWithoutActiveLink
        .map((patient) => {
          const pendingRequest = pendingRequests.find(
            (item) => item.patient_user_id === patient.user_id
          );

          let texto = "Sem vínculo ativo";

          if (pendingRequest) {
            const professional = perfilMap.get(pendingRequest.professional_user_id);
            const nomeProfissional = professional ? nomeExibicao(professional) : "Profissional";
            texto = `Solicitação pendente com ${nomeProfissional}`;
          }

          return renderSimplePatient(patient, texto);
        })
        .join("");
    }

    const recentInvites = convites.slice(0, 12);

    if (recentInvites.length === 0) {
      recentInvitesList.innerHTML = "";
      recentInvitesEmpty.hidden = false;
    } else {
      recentInvitesEmpty.hidden = true;
      recentInvitesList.innerHTML = recentInvites
        .map((invite) => renderSimpleInvite(invite, professionalMap))
        .join("");
    }
  }

  btnLogout.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "../../auth/index.html?perfil=profissional";
  });

  async function iniciarDashboard() {
    try {
      const ok = await validarAdmin();
      if (!ok) return;

      const dados = await carregarDados();
      renderDashboard(dados);
    } catch (error) {
      console.error("Erro ao iniciar dashboard admin:", error);
      alert("Não foi possível carregar a dashboard admin.");
    }
  }

  iniciarDashboard();
});