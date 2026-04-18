const SUPABASE_URL = "https://haawjoesqdlccertgpqi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_GsWcsI7pnPuUdW5Wz15YRQ_NbtgGABm";
const ADMIN_EMAIL = "marcos@rubo.com.br";
const ADMIN_DASHBOARD_URL = "./dashboard/admin/index.html";

let deferredPrompt = null;
let supabaseClient = null;

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
    return;
  }

  const {
    data: { session },
    error,
  } = await supabaseClient.auth.getSession();

  if (error || !session?.user) {
    return;
  }

  const email = session.user.email?.toLowerCase();

  if (email === ADMIN_EMAIL.toLowerCase()) {
    window.location.href = ADMIN_DASHBOARD_URL;
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

  setMessage("Acesso liberado. Redirecionando para a dashboard...", "success");

  window.setTimeout(() => {
    window.location.href = ADMIN_DASHBOARD_URL;
  }, 500);
}

if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", handleAdminLogin);
}

checkExistingAdminSession();