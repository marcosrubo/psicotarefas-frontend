import { registrarAcessoPagina, registrarEvento } from "./shared/activity-log.js";

const SUPABASE_URL = "https://haawjoesqdlccertgpqi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_GsWcsI7pnPuUdW5Wz15YRQ_NbtgGABm";
const ADMIN_EMAIL = "marcos@rubo.com.br";
const ADMIN_DASHBOARD_URL = "./dashboard/admin/index.html";

let deferredPrompt = null;
let supabaseClient = null;
let adminSessionActive = false;

const btnInstallAndroidDock = document.getElementById("btnInstallAndroidDock");
const btnInstallIosDock = document.getElementById("btnInstallIosDock");
const btnTestPatient = document.getElementById("btnTestPatient");
const btnTestProfessional = document.getElementById("btnTestProfessional");

const adminModal = document.getElementById("adminModal");
const adminModalBackdrop = document.getElementById("adminModalBackdrop");
const btnOpenAdminModal = document.getElementById("btnOpenAdminModal");
const btnCloseAdminModal = document.getElementById("btnCloseAdminModal");
const btnCancelAdminModal = document.getElementById("btnCancelAdminModal");
const adminLoginForm = document.getElementById("adminLoginForm");
const adminEmailInput = document.getElementById("adminEmail");
const adminPasswordInput = document.getElementById("adminPassword");
const adminLoginMessage = document.getElementById("adminLoginMessage");
const btnSubmitAdminLogin = document.getElementById("btnSubmitAdminLogin");
const iosInstallModal = document.getElementById("iosInstallModal");
const iosInstallModalBackdrop = document.getElementById("iosInstallModalBackdrop");
const btnCloseIosInstallModal = document.getElementById("btnCloseIosInstallModal");
const btnConfirmIosInstallModal = document.getElementById("btnConfirmIosInstallModal");

registrarAcessoPagina({
  pagina: "home",
  perfil: "publico"
});

// ============================
// HELPERS
// ============================

function createSupabaseClient() {
  if (!window.supabase || !SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return null;
  }

  if (
    SUPABASE_URL === "COLE_AQUI_SUA_SUPABASE_URL" ||
    SUPABASE_ANON_KEY === "COLE_AQUI_SUA_SUPABASE_ANON_KEY"
  ) {
    return null;
  }

  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

function obterHashParams() {
  const hash = window.location.hash || "";
  return new URLSearchParams(hash.replace(/^#/, ""));
}

function obterSearchParams() {
  return new URLSearchParams(window.location.search || "");
}

function obterTokenConviteAtual() {
  const params = obterSearchParams();
  return (params.get("token") || params.get("convite") || "").trim();
}

function montarUrlComConvite(baseUrl, token) {
  if (!token) return baseUrl;

  const separador = baseUrl.includes("?") ? "&" : "?";
  return `${baseUrl}${separador}convite=${encodeURIComponent(token)}`;
}

function obterLoginUrlPorPerfil(perfil, token = "") {
  if (perfil === "profissional") {
    return "./auth/profissional-login/index.html";
  }

  return montarUrlComConvite("./auth/paciente-login/index.html", token);
}

async function atualizarConfirmacaoEmailNoPerfil(userId, confirmedAtIso) {
  const { error } = await supabaseClient
    .from("perfis")
    .update({
      email_confirmed_at: confirmedAtIso
    })
    .eq("user_id", userId);

  if (error) {
    throw new Error("Não foi possível atualizar o status de confirmação do e-mail.");
  }
}

async function ativarVinculoDoPacientePorConvite({
  conviteToken,
  patientUserId,
  patientEmail,
  confirmedAtIso
}) {
  if (!conviteToken || !patientUserId || !patientEmail) {
    return;
  }

  const convite = await buscarConvitePublico(conviteToken);

  if (!convite) {
    return;
  }

  if (convite.status === "cancelado" || convite.status === "expirado") {
    return;
  }

  const { data: vinculoExistente, error: erroBuscarVinculo } = await supabaseClient
    .from("vinculos")
    .select("id, respondeu_convite_at")
    .eq("token_convite", conviteToken)
    .maybeSingle();

  if (erroBuscarVinculo || !vinculoExistente) {
    throw new Error("Não foi possível localizar o vínculo do convite.");
  }

  const payloadAtualizacao = {
    patient_user_id: patientUserId,
    patient_email: patientEmail,
    confirmed_at: confirmedAtIso,
    status: "ativo"
  };

  if (!vinculoExistente.respondeu_convite_at) {
    payloadAtualizacao.respondeu_convite_at = confirmedAtIso;
  }

  const { error: erroAtualizarVinculo } = await supabaseClient
    .from("vinculos")
    .update(payloadAtualizacao)
    .eq("id", vinculoExistente.id);

  if (erroAtualizarVinculo) {
    throw new Error("Não foi possível ativar o vínculo com o profissional.");
  }

  const { error: erroAtualizarConvite } = await supabaseClient
    .from("convites")
    .update({
      status: "aceito",
      accepted_at: confirmedAtIso
    })
    .eq("token", conviteToken);

  if (erroAtualizarConvite) {
    throw new Error("Não foi possível marcar o convite como aceito.");
  }
}

async function sincronizarConfirmacaoDeEmail(user, conviteToken = "") {
  if (!user?.id || !user.email_confirmed_at) {
    return;
  }

  await atualizarConfirmacaoEmailNoPerfil(user.id, user.email_confirmed_at);

  const perfil = user.user_metadata?.perfil || "paciente";
  const token =
    conviteToken ||
    user.user_metadata?.convite_token ||
    "";

  if (perfil !== "paciente" || !token) {
    return;
  }

  await ativarVinculoDoPacientePorConvite({
    conviteToken: token,
    patientUserId: user.id,
    patientEmail: user.email || "",
    confirmedAtIso: user.email_confirmed_at
  });
}

async function buscarConvitePublico(token) {
  supabaseClient = supabaseClient || createSupabaseClient();

  if (!supabaseClient) {
    return null;
  }

  const { data, error } = await supabaseClient.rpc("buscar_convite_publico", {
    p_token: token
  });

  if (error) {
    throw new Error("Não foi possível validar o convite.");
  }

  if (!data || data.length === 0) {
    return null;
  }

  return data[0];
}

async function buscarPerfilAutenticado(userId) {
  const { data, error } = await supabaseClient
    .from("perfis")
    .select("perfil")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

async function pacienteTemVinculoAtivo(userId) {
  const { data, error } = await supabaseClient
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

async function obterDestinoDashboardPorSessao(user) {
  if (!user) return "";

  if ((user.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase()) {
    return ADMIN_DASHBOARD_URL;
  }

  const perfil = await buscarPerfilAutenticado(user.id);

  if (!perfil?.perfil) {
    return "";
  }

  if (perfil.perfil === "profissional") {
    return "./dashboard/profissional/index.html";
  }

  if (perfil.perfil === "paciente") {
    const temVinculo = await pacienteTemVinculoAtivo(user.id);
    return temVinculo
      ? "./dashboard/paciente-com-vinculo/index.html"
      : "./dashboard/paciente-sem-vinculo/index.html";
  }

  return "";
}

// ============================
// CONVITE POR LINK
// ============================

async function tratarEntradaPorLinkEmail() {
  const token = obterTokenConviteAtual();

  if (!token) return false;

  try {
    const convite = await buscarConvitePublico(token);

    if (!convite) {
      window.confirm(
        "Este convite não foi encontrado ou não é mais válido."
      );
      return true;
    }

    const profissional = convite.professional_name || "Profissional";
    const status = convite.status || "";

    if (status === "pendente") {
      const confirmar = window.confirm(
        `Você foi convidado pelo profissional ${profissional}.\n\nClique em OK para continuar.`
      );

      if (confirmar) {
        const destino = `./auth/paciente-cadastro/index.html?convite=${encodeURIComponent(token)}`;
        window.location.href = destino;
      }

      return true;
    }

    if (status === "respondido") {
      const confirmar = window.confirm(
        `Você foi convidado pelo profissional ${profissional}.\n\nSeu cadastro já foi iniciado, mas ainda é necessário confirmar o e-mail informado.`
      );

      if (confirmar) {
        window.location.href = montarUrlComConvite(
          "./auth/paciente-login/index.html",
          token
        );
      }

      return true;
    }

    if (status === "aceito") {
      const confirmar = window.confirm(
        `Você já concluiu o vínculo com o profissional ${profissional}.\n\nClique em OK para acessar a próxima tela.`
      );

      if (confirmar) {
        window.location.href = montarUrlComConvite(
          "./auth/paciente-login/index.html",
          token
        );
      }

      return true;
    }

    if (status === "cancelado") {
      window.confirm(
        `Este convite foi cancelado por ${profissional}.`
      );
      return true;
    }

    if (status === "expirado") {
      window.confirm(
        `Este convite do profissional ${profissional} expirou.`
      );
      return true;
    }

    const confirmar = window.confirm(
      `Você foi convidado pelo profissional ${profissional}.\n\nClique em OK para continuar.`
    );

    if (confirmar) {
      const destino = `./auth/paciente-cadastro/index.html?convite=${encodeURIComponent(token)}`;
      window.location.href = destino;
    }

    return true;
  } catch (erro) {
    console.error("Erro ao tratar link de convite:", erro);
    window.confirm(
      "Não foi possível validar este convite agora."
    );
    return true;
  }
}

// ============================
// CONFIRMAÇÃO DE E-MAIL
// ============================

async function tratarConfirmacaoDeEmail() {
  const hashParams = obterHashParams();
  const searchParams = obterSearchParams();

  const tipoHash = hashParams.get("type");
  const tipoSearch = searchParams.get("type");
  const tipo = tipoHash || tipoSearch;

  const errorCode = hashParams.get("error_code") || searchParams.get("error_code") || "";
  const errorDescription =
    hashParams.get("error_description") ||
    searchParams.get("error_description") ||
    "";

  const tokenHash = searchParams.get("token_hash") || searchParams.get("token") || "";
  const tokenConvite = (searchParams.get("convite") || "").trim();
  const hasAccessToken = Boolean(hashParams.get("access_token"));

  supabaseClient = supabaseClient || createSupabaseClient();

  if (!supabaseClient) {
    return false;
  }

  try {
    const {
      data: { user }
    } = await supabaseClient.auth.getUser();

    if (user) {
      const perfil = user.user_metadata?.perfil || "paciente";
      const conviteToken =
        tokenConvite ||
        user.user_metadata?.convite_token ||
        "";

      const loginUrl = obterLoginUrlPorPerfil(perfil, conviteToken);

      if (user.email_confirmed_at) {
        await sincronizarConfirmacaoDeEmail(user, conviteToken);
      }

      if ((tipo === "email" || tipo === "signup" || hasAccessToken) && user.email_confirmed_at) {
        const confirmou = window.confirm(
          "Obrigado por confirmar o seu e-mail.\nAgora faça o acesso com seu e-mail e senha na próxima tela."
        );

        if (confirmou) {
          window.location.href = loginUrl;
        }

        return true;
      }

      if (tipo === "email" || tipo === "signup" || hasAccessToken) {
        window.confirm(
          "Não foi possível confirmar este e-mail automaticamente.\nTente novamente pelo link mais recente enviado para sua caixa de entrada."
        );
        return true;
      }

      if (user.email_confirmed_at && tokenHash) {
        const confirmou = window.confirm(
          "Esse E-mail já foi confirmado anteriormente.\nBasta acessar o sistema na próxima tela."
        );

        if (confirmou) {
          window.location.href = loginUrl;
        }

        return true;
      }
    }

    if (errorCode || errorDescription) {
      const textoErro = `${errorCode} ${errorDescription}`.toLowerCase();

      if (
        textoErro.includes("already") ||
        textoErro.includes("used")
      ) {
        const confirmou = window.confirm(
          "Esse E-mail já foi confirmado anteriormente.\nBasta acessar o sistema na próxima tela."
        );

        if (confirmou) {
          window.location.href = montarUrlComConvite(
            "./auth/paciente-login/index.html",
            tokenConvite
          );
        }

        return true;
      }

      if (
        textoErro.includes("otp_expired") ||
        textoErro.includes("expired") ||
        textoErro.includes("invalid")
      ) {
        window.confirm(
          "Este link de confirmação é inválido ou expirou.\nSolicite um novo e-mail de confirmação antes de entrar."
        );
        return true;
      }
    }

    if ((tipo === "email" || tipo === "signup") && tokenHash) {
      window.confirm(
        "Não foi possível confirmar este e-mail automaticamente.\nTente abrir novamente o link mais recente enviado para sua caixa de entrada."
      );

      return true;
    }

    return false;
  } catch (erro) {
    console.error("Erro ao tratar confirmação de e-mail:", erro);

    if ((tipo === "email" || tipo === "signup") && tokenHash) {
      window.confirm(
        "Não foi possível concluir a confirmação do e-mail agora.\nTente novamente pelo link mais recente enviado para sua caixa de entrada."
      );

      return true;
    }

    return false;
  }
}

// ============================
// RESTANTE
// ============================

function setMessage(text = "", type = "") {
  adminLoginMessage.textContent = text;
  adminLoginMessage.className = "form-message";

  if (type) {
    adminLoginMessage.classList.add(type);
  }
}

function setTestButtonLoading(button, isLoading, idleLabel = "TESTAR") {
  if (!button) return;

  button.disabled = isLoading;
  button.textContent = isLoading ? "ENTRANDO..." : idleLabel;
}

function setAdminLoadingState(isLoading) {
  btnSubmitAdminLogin.disabled = isLoading;
  btnSubmitAdminLogin.textContent = isLoading ? "ENTRANDO..." : "ENTRAR";
  adminPasswordInput.disabled = isLoading;
}

function openAdminModal() {
  if (!adminModal) return;

  if (adminSessionActive) {
    window.location.href = ADMIN_DASHBOARD_URL;
    return;
  }

  adminModal.classList.add("is-open");
  adminModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
  adminPasswordInput.value = "";
  setMessage();

  window.setTimeout(() => {
    adminPasswordInput.focus();
  }, 50);
}

function closeAdminModal() {
  if (!adminModal) return;

  adminModal.classList.remove("is-open");
  adminModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
  setAdminLoadingState(false);
  setMessage();
  adminLoginForm.reset();
  adminEmailInput.value = ADMIN_EMAIL;
}

function openIosInstallModal() {
  if (!iosInstallModal) return;

  iosInstallModal.classList.add("is-open");
  iosInstallModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("modal-open");
}

function closeIosInstallModal() {
  if (!iosInstallModal) return;

  iosInstallModal.classList.remove("is-open");
  iosInstallModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("modal-open");
}

async function handleAndroidInstall() {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    return;
  }

  window.alert(
    "A instalação automática não está disponível neste momento. Se você estiver no Android, abra o menu do navegador e procure a opção de instalar o aplicativo."
  );
}

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;
});

if (btnInstallAndroidDock) {
  btnInstallAndroidDock.addEventListener("click", () => {
    handleAndroidInstall();
  });
}

if (btnInstallIosDock) {
  btnInstallIosDock.addEventListener("click", openIosInstallModal);
}

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
});

if (btnOpenAdminModal) {
  btnOpenAdminModal.addEventListener("click", openAdminModal);
}

if (btnCloseAdminModal) {
  btnCloseAdminModal.addEventListener("click", closeAdminModal);
}

if (btnCancelAdminModal) {
  btnCancelAdminModal.addEventListener("click", closeAdminModal);
}

if (adminModalBackdrop) {
  adminModalBackdrop.addEventListener("click", closeAdminModal);
}

if (iosInstallModalBackdrop) {
  iosInstallModalBackdrop.addEventListener("click", closeIosInstallModal);
}

if (btnCloseIosInstallModal) {
  btnCloseIosInstallModal.addEventListener("click", closeIosInstallModal);
}

if (btnConfirmIosInstallModal) {
  btnConfirmIosInstallModal.addEventListener("click", closeIosInstallModal);
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && adminModal?.classList.contains("is-open")) {
    closeAdminModal();
  }

  if (event.key === "Escape" && iosInstallModal?.classList.contains("is-open")) {
    closeIosInstallModal();
  }
});

async function checkExistingAdminSession() {
  supabaseClient = createSupabaseClient();

  if (!supabaseClient) {
    adminSessionActive = false;
    return;
  }

  try {
    const {
      data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session?.user) {
      adminSessionActive = false;
      return;
    }

    const destino = await obterDestinoDashboardPorSessao(session.user);

    if (destino) {
      window.location.href = destino;
      return;
    }

    adminSessionActive = false;
  } catch (error) {
    console.error("Erro ao verificar sessão existente na tela principal:", error);
    adminSessionActive = false;
  }
}

async function handleAdminLogin(event) {
  event.preventDefault();

  supabaseClient = supabaseClient || createSupabaseClient();

  if (!supabaseClient) {
    setMessage(
      "Configure no app.js a SUPABASE_URL e a SUPABASE_ANON_KEY com os mesmos dados usados no auth.",
      "error"
    );
    return;
  }

  const email = adminEmailInput.value.trim().toLowerCase();
  const password = adminPasswordInput.value.trim();

  if (email !== ADMIN_EMAIL.toLowerCase()) {
    setMessage("Este acesso é restrito ao administrador configurado.", "error");
    return;
  }

  if (!password) {
    setMessage("Digite a senha do administrador.", "error");
    adminPasswordInput.focus();
    return;
  }

  setAdminLoadingState(true);
  setMessage();

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data?.user) {
    setAdminLoadingState(false);
    setMessage("Senha de administrador inválida.", "error");
    adminPasswordInput.focus();
    adminPasswordInput.select();
    return;
  }

  if (data.user.email?.toLowerCase() !== ADMIN_EMAIL.toLowerCase()) {
    await supabaseClient.auth.signOut();
    setAdminLoadingState(false);
    setMessage("Usuário sem permissão de administrador.", "error");
    return;
  }

  adminSessionActive = true;
  await registrarEvento({
    evento: "login_admin_sucesso",
    pagina: "home",
    perfil: "admin",
    userId: data.user.id,
    email: data.user.email || email
  });
  setMessage("Acesso liberado. Redirecionando para a dashboard...", "success");

  window.setTimeout(() => {
    window.location.href = ADMIN_DASHBOARD_URL;
  }, 500);
}

async function handleTestLogin(perfil) {
  const button = perfil === "paciente" ? btnTestPatient : btnTestProfessional;

  supabaseClient = supabaseClient || createSupabaseClient();

  if (!supabaseClient) {
    window.alert("Não foi possível iniciar o acesso de teste agora.");
    return;
  }

  const credentials =
    perfil === "paciente"
      ? { email: "pac1@psicotarefas.com.br", password: "senhaforte" }
      : { email: "prof1@psicotarefas.com.br", password: "senhaforte" };

  try {
    setTestButtonLoading(button, true);

    const { data, error } = await supabaseClient.auth.signInWithPassword(credentials);

    if (error || !data?.user) {
      throw new Error("Não foi possível entrar com a conta de teste.");
    }

    const destino = await obterDestinoDashboardPorSessao(data.user);

    await registrarEvento({
      evento: perfil === "paciente" ? "login_teste_paciente_sucesso" : "login_teste_profissional_sucesso",
      pagina: "home",
      perfil: "publico",
      userId: data.user.id,
      email: data.user.email || credentials.email
    });

    if (!destino) {
      throw new Error("A conta de teste entrou, mas não foi possível definir o destino.");
    }

    window.location.href = destino;
  } catch (error) {
    console.error(`Erro ao entrar com conta de teste de ${perfil}:`, error);
    window.alert(error.message || "Não foi possível acessar a conta de teste.");
  } finally {
    setTestButtonLoading(button, false);
  }
}

if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", handleAdminLogin);
}

if (btnTestPatient) {
  btnTestPatient.addEventListener("click", () => {
    handleTestLogin("paciente");
  });
}

if (btnTestProfessional) {
  btnTestProfessional.addEventListener("click", () => {
    handleTestLogin("profissional");
  });
}

async function inicializarTelaPrincipal() {
  const tratouConfirmacao = await tratarConfirmacaoDeEmail();
  if (tratouConfirmacao) return;

  const tratouConvite = await tratarEntradaPorLinkEmail();
  if (tratouConvite) return;

  await checkExistingAdminSession();
}

inicializarTelaPrincipal();
