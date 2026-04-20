const SUPABASE_URL = "https://haawjoesqdlccertgpqi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_GsWcsI7pnPuUdW5Wz15YRQ_NbtgGABm";
const ADMIN_EMAIL = "marcos@rubo.com.br";
const ADMIN_DASHBOARD_URL = "./dashboard/admin/index.html";

let deferredPrompt = null;
let supabaseClient = null;
let adminSessionActive = false;

const installBox = document.getElementById("installBox");
const btnInstall = document.getElementById("btnInstall");

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

  return window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
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
      window.confirm(
        `Você foi convidado pelo profissional ${profissional}.\n\nSeu cadastro já foi iniciado, mas ainda é necessário confirmar o e-mail informado.`
      );
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

      if (tipo === "email" || tipo === "signup" || hasAccessToken) {
        const confirmou = window.confirm(
          "Obrigado por confirmar o seu e-mail.\nAgora faça o acesso com seu e-mail e senha na próxima tela."
        );

        if (confirmou) {
          window.location.href = loginUrl;
        }

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
        textoErro.includes("otp_expired") ||
        textoErro.includes("expired") ||
        textoErro.includes("invalid") ||
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
    }

    if ((tipo === "email" || tipo === "signup") && tokenHash) {
      const confirmou = window.confirm(
        "Obrigado por confirmar o seu e-mail.\nAgora faça o acesso com seu e-mail e senha na próxima tela."
      );

      if (confirmou) {
        window.location.href = montarUrlComConvite(
          "./auth/paciente-login/index.html",
          tokenConvite
        );
      }

      return true;
    }

    return false;
  } catch (erro) {
    console.error("Erro ao tratar confirmação de e-mail:", erro);

    if ((tipo === "email" || tipo === "signup") && tokenHash) {
      const confirmou = window.confirm(
        "Obrigado por confirmar o seu e-mail.\nAgora faça o acesso com seu e-mail e senha na próxima tela."
      );

      if (confirmou) {
        window.location.href = montarUrlComConvite(
          "./auth/paciente-login/index.html",
          tokenConvite
        );
      }

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

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;

  if (installBox) {
    installBox.hidden = false;
  }
});

if (btnInstall) {
  btnInstall.addEventListener("click", async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;

    if (installBox) {
      installBox.hidden = true;
    }
  });
}

window.addEventListener("appinstalled", () => {
  if (installBox) {
    installBox.hidden = true;
  }
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

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && adminModal?.classList.contains("is-open")) {
    closeAdminModal();
  }
});

async function checkExistingAdminSession() {
  supabaseClient = createSupabaseClient();

  if (!supabaseClient) {
    adminSessionActive = false;
    return;
  }

  try {
    await supabaseClient.auth.signOut();
  } catch (error) {
    console.error("Erro ao limpar sessão na tela principal:", error);
  }

  adminSessionActive = false;
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
  setMessage("Acesso liberado. Redirecionando para a dashboard...", "success");

  window.setTimeout(() => {
    window.location.href = ADMIN_DASHBOARD_URL;
  }, 500);
}

if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", handleAdminLogin);
}

async function inicializarTelaPrincipal() {
  const tratouConfirmacao = await tratarConfirmacaoDeEmail();
  if (tratouConfirmacao) return;

  const tratouConvite = await tratarEntradaPorLinkEmail();
  if (tratouConvite) return;

  await checkExistingAdminSession();
}

inicializarTelaPrincipal();

