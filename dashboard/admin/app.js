import supabase from "../../shared/supabase.js";

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

  const recentInvitesList = document.getElementById("recentInvitesList");
  const recentInvitesEmpty = document.getElementById("recentInvitesEmpty");

  const btnLogout = document.getElementById("btnLogout");

  let currentUser = null;

  function obterIniciais(nome) {
    if (!nome) return "AD";
    return nome
      .trim()
      .split(" ")
      .slice(0, 2)
      .map((p) => p[0].toUpperCase())
      .join("");
  }

  function limparNome(valor) {
    const texto = (valor || "").trim();
    if (!texto) return "";
    if (texto.includes("@")) return texto.split("@")[0];
    return texto;
  }

  function obterPrimeiroNome(nomeCompleto) {
    const nome = limparNome(nomeCompleto);
    return nome ? nome.split(" ")[0] : "Admin";
  }

  function formatarDataHora(dataIso) {
    return new Date(dataIso).toLocaleString("pt-BR");
  }

  function montarTextoConvite(invite) {
    const partes = [];

    if (invite.status) {
      partes.push(invite.status);
    }

    if (invite.created_at) {
      partes.push(formatarDataHora(invite.created_at));
    }

    return partes.join(" • ");
  }

  async function validarAdmin() {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href = "/";
      return false;
    }

    currentUser = session.user;

    if (session.user.email.toLowerCase() !== ADMIN_EMAIL) {
      await supabase.auth.signOut();
      window.location.href = "/";
      return false;
    }

    const nome = limparNome(session.user.email);

    userName.textContent = nome;
    userRole.textContent = "Administrador";
    userAvatar.textContent = obterIniciais(nome);
    welcomeTitle.textContent = `Olá, ${obterPrimeiroNome(nome)}`;

    return true;
  }

  async function carregarDados() {
    const [
      { data: totalUsers, error: totalUsersError },
      { data: perfis, error: perfisError },
      { data: vinculos, error: vinculosError },
      { data: convites, error: convitesError }
    ] = await Promise.all([
      supabase.rpc("admin_total_users"),
      supabase.from("perfis").select("*"),
      supabase.from("vinculos").select("*"),
      supabase.from("convites").select("*").order("created_at", { ascending: false })
    ]);

    if (totalUsersError) throw totalUsersError;
    if (perfisError) throw perfisError;
    if (vinculosError) throw vinculosError;
    if (convitesError) throw convitesError;

    return {
      totalUsers,
      perfis: perfis || [],
      vinculos: vinculos || [],
      convites: convites || []
    };
  }

  function renderDashboard({ totalUsers, perfis, vinculos, convites }) {
    const professionals = perfis.filter((p) => p.perfil === "profissional");
    const patients = perfis.filter((p) => p.perfil === "paciente");

    const convitesAceitos = convites.filter((c) => c.status === "aceito");
    const convitesPendentes = convites.filter((c) => c.status === "pendente");
    const convitesCancelados = convites.filter((c) => c.status === "cancelado");
    const convitesRespondidos = convites.filter((c) => c.status === "respondido");

    const vinculosPendentesConvite = vinculos.filter(
      (v) => v.status === "pendente_convite"
    );
    const vinculosAguardandoConfirmacao = vinculos.filter(
      (v) => v.status === "aguardando_confirmacao_email"
    );
    const vinculosAtivos = vinculos.filter((v) => v.status === "ativo");

    statUsers.textContent = totalUsers || 0;
    statPerfis.textContent = perfis.length;
    statVinculos.textContent = vinculos.length;
    statProfessionals.textContent = professionals.length;
    statPatients.textContent = patients.length;

    // Mantive os cards que você já tinha no HTML
    statInvitesCreated.textContent = convites.length;
    statInvitesAccepted.textContent = convitesAceitos.length;
    statInvitesPending.textContent = convitesPendentes.length;
    statInvitesCanceled.textContent = convitesCancelados.length;

    const recent = convites.slice(0, 10);

    if (recent.length === 0) {
      recentInvitesEmpty.hidden = false;
      recentInvitesList.innerHTML = "";
    } else {
      recentInvitesEmpty.hidden = true;
      recentInvitesList.innerHTML = recent
        .map(
          (invite) => `
            <div class="simple-item">
              <strong>${invite.patient_name || "Paciente"}</strong>
              <span>${montarTextoConvite(invite)}</span>
            </div>
          `
        )
        .join("");
    }

    console.log("Resumo admin:", {
      totalUsers: totalUsers || 0,
      totalPerfis: perfis.length,
      totalVinculos: vinculos.length,
      professionals: professionals.length,
      patients: patients.length,
      convitesCriados: convites.length,
      convitesPendentes: convitesPendentes.length,
      convitesRespondidos: convitesRespondidos.length,
      convitesAceitos: convitesAceitos.length,
      convitesCancelados: convitesCancelados.length,
      vinculosPendentesConvite: vinculosPendentesConvite.length,
      vinculosAguardandoConfirmacao: vinculosAguardandoConfirmacao.length,
      vinculosAtivos: vinculosAtivos.length
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error("Erro ao sair:", error);
      }

      window.location.href = "/";
    });
  }

  async function iniciarDashboard() {
    try {
      const ok = await validarAdmin();
      if (!ok) return;

      const dados = await carregarDados();
      renderDashboard(dados);
    } catch (error) {
      console.error(error);
      alert("Não foi possível carregar a dashboard admin.");
    }
  }

  iniciarDashboard();
});