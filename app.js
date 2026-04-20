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
// CONVITE POR LINK
// ============================

function tratarEntradaPorLinkEmail() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || params.get("convite");

  if (!token) return false;

  const confirmar = window.confirm(
    "Você foi convidado por um profissional para acessar o PsicoTarefas.\n\nClique em OK para continuar."
  );

  if (!confirmar) return true;

  const destino = `./auth/paciente-cadastro/index.html?convite=${encodeURIComponent(token)}`;
  window.location.href = destino;
  return true;
}

// ============================
// CONFIRMAÇÃO DE E-MAIL
// ============================

function obterHashParams() {
  const hash = window.location.hash || "";
  return new URLSearchParams(hash.replace(/^#/, ""));
}

function obterSearchParams() {
  return new URLSearchParams(window.location.search || "");
}

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

  supabaseClient = supabaseClient || createSupabaseClient();

  if (!supabaseClient) {
    return false;
  }

  try {
    // CASO 1: confirmação normal, com sessão disponível após redirect
    const {
      data: { user }
    } = await supabaseClient.auth.getUser();

    if (user) {
      const perfil = user.user_metadata?.perfil;

      // Supabase usa type=email no link de confirmação de cadastro
      if (tipo === "email" || tipo === "signup") {
        if (perfil === "profissional") {
          const confirmou = window.confirm(
            "Você se cadastrou no sistema como PROFISSIONAL e confirmou seu email.\nAgora faça o acesso com seu email e senha na próxima tela"
          );

          if (confirmou) {
            window.location.href = "./auth/profissional-login/index.html";
          }

          return true;
        }

        if (perfil === "paciente") {
          const confirmou = window.confirm(
            "Você se cadastrou no sistema como PACIENTE e confirmou seu email.\nAgora faça o acesso com seu email e senha na próxima tela"
          );

          if (confirmou) {
            window.location.href = "./auth/paciente-login/index.html";
          }

          return true;
        }
      }

      // CASO 2: clicou de novo num link antigo e o usuário já está confirmado
      if (user.email_confirmed_at && tokenHash) {
        const confirmou = window.confirm(
          "Esse E-mail já foi confirmado anteriormente.\nBasta acessar o sistema na próxima tela."
        );

        if (confirmou) {
          window.location.href = "./auth/profissional-login/index.html";
        }

        return true;
      }
    }

    // CASO 3: redirect com erro no hash/query
    if (errorCode || errorDescription) {
      const textoErro = `${errorCode} ${errorDescription}`.toLowerCase();

      if (
        textoErro.includes("otp_expired") ||
        textoErro.includes("expired") ||
        textoErro.includes("invalid")
      ) {
        const confirmou = window.confirm(
          "Esse E-mail já foi confirmado anteriormente.\nBasta acessar o sistema na próxima tela."
        );

        if (confirmou) {
          window.location.href = "./auth/profissional-login/index.html";
        }

        return true;
      }
    }

    // CASO 4: fallback para links com type=email/token_hash, mesmo sem sessão
    if ((tipo === "email" || tipo === "signup") && tokenHash) {
      const confirmou = window.confirm(
        "Esse E-mail já foi confirmado anteriormente.\nBasta acessar o sistema na próxima tela."
      );

      if (confirmou) {
        window.location.href = "./auth/profissional-login/index.html";
      }

      return true;
    }

    return false;
  } catch (erro) {
    console.error("Erro ao tratar confirmação de e-mail:", erro);

    // fallback final: se veio com cara de link de confirmação, mostra a mensagem mesmo assim
    if ((tipo === "email" || tipo === "signup") && tokenHash) {
      const confirmou = window.confirm(
        "Esse E-mail já foi confirmado anteriormente.\nBasta acessar o sistema na próxima tela."
      );

      if (confirmou) {
        window.location.href = "./auth/profissional-login/index.html";
      }

      return true;
    }

    return false;
  }
}

// ============================
// RESTANTE
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

  const tratouConvite = tratarEntradaPorLinkEmail();
  if (tratouConvite) return;

  await checkExistingAdminSession();
}

inicializarTelaPrincipal();

