import { registrarAcessoPagina, registrarEvento } from "./shared/activity-log.js?v=20260514-sem-auto-detect";

const SUPABASE_URL = "https://haawjoesqdlccertgpqi.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_GsWcsI7pnPuUdW5Wz15YRQ_NbtgGABm";
const ADMIN_EMAIL = "marcos@rubo.com.br";
const ADMIN_DASHBOARD_URL = criarUrlDoApp("dashboard/admin/index.html");

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
const sessionStatus = document.getElementById("sessionStatus");

registrarAcessoPagina({
  pagina: "home",
  perfil: "publico"
});

mostrarCaixaDepuracao(`Entrando no PsicoTarefas - ${obterOrigemDepuracaoEntrada()}`);

// ============================
// HELPERS
// ============================

function mostrarCaixaDepuracao(texto) {
  const overlay = document.createElement("div");
  overlay.style.position = "fixed";
  overlay.style.inset = "0";
  overlay.style.zIndex = "1000";
  overlay.style.display = "grid";
  overlay.style.placeItems = "center";
  overlay.style.padding = "20px";
  overlay.style.background = "rgba(31, 36, 48, 0.36)";

  const dialog = document.createElement("div");
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.style.width = "100%";
  dialog.style.maxWidth = "380px";
  dialog.style.display = "grid";
  dialog.style.gap = "14px";
  dialog.style.padding = "24px 20px";
  dialog.style.borderRadius = "18px";
  dialog.style.background = "#fff";
  dialog.style.boxShadow = "0 18px 42px rgba(31, 36, 48, 0.18)";
  dialog.style.textAlign = "center";

  const title = document.createElement("h2");
  title.textContent = texto;
  title.style.margin = "0";
  title.style.fontSize = "24px";
  title.style.lineHeight = "1.15";
  title.style.color = "#1f2430";

  const button = document.createElement("button");
  button.type = "button";
  button.textContent = "OK";
  button.style.minHeight = "50px";
  button.style.border = "none";
  button.style.borderRadius = "14px";
  button.style.background = "#1250e6";
  button.style.color = "#fff";
  button.style.font = "inherit";
  button.style.fontWeight = "800";
  button.style.cursor = "pointer";
  button.addEventListener("click", () => overlay.remove());

  dialog.append(title, button);
  overlay.append(dialog);
  document.body.append(overlay);
  button.focus();
}

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
      detectSessionInUrl: false
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

function veioDaConfirmacaoEmail() {
  const hashParams = obterHashParams();
  const searchParams = obterSearchParams();
  const tipo = hashParams.get("type") || searchParams.get("type") || "";

  return (
    tipo === "email" ||
    tipo === "signup" ||
    searchParams.get("confirmado") === "1" ||
    searchParams.get("ja_confirmado") === "1" ||
    Boolean(searchParams.get("code")) ||
    Boolean(searchParams.get("token_hash")) ||
    Boolean(searchParams.get("token")) ||
    Boolean(searchParams.get("error_code") || searchParams.get("error_description")) ||
    Boolean(hashParams.get("access_token")) ||
    Boolean(hashParams.get("error_code") || hashParams.get("error_description"))
  );
}

function obterOrigemDepuracaoEntrada() {
  return veioDaConfirmacaoEmail()
    ? "vindo da confirmação do email"
    : "Vindo do acesso normal";
}

function obterTokenConviteAtual() {
  const params = obterSearchParams();
  return (params.get("token") || params.get("convite") || "").trim();
}

function criarUrlDoApp(path = "") {
  const cleanPath = String(path).replace(/^\.?\//, "");
  return new URL(`/${cleanPath}`, window.location.origin).href;
}

function montarUrlComConvite(baseUrl, token) {
  const url = new URL(baseUrl, window.location.origin);

  if (token) {
    url.searchParams.set("convite", token);
  }

  return url.href;
}

function obterLoginUrlPorPerfil(perfil, token = "") {
  if (perfil === "profissional") {
    return criarUrlDoApp("auth/profissional-login/index.html");
  }

  return montarUrlComConvite(criarUrlDoApp("auth/paciente-login/index.html"), token);
}

function obterTipoLinkAutenticacao() {
  const hashParams = obterHashParams();
  const searchParams = obterSearchParams();
  return hashParams.get("type") || searchParams.get("type") || "";
}

function montarUrlRedefinicaoSenha() {
  const hashParams = obterHashParams();
  const searchParams = obterSearchParams();
  const perfil = searchParams.get("perfil") === "profissional" ? "profissional" : "paciente";
  const destino = new URL(criarUrlDoApp("auth/redefinir-senha/index.html"));

  destino.searchParams.set("perfil", perfil);

  searchParams.forEach((value, key) => {
    if (key !== "perfil") {
      destino.searchParams.set(key, value);
    }
  });

  const hash = hashParams.toString();

  if (hash) {
    destino.hash = hash;
  }

  return destino.href;
}

function esconderStatusSessao() {
  if (!sessionStatus) return;
  sessionStatus.hidden = true;
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
        const destino = montarUrlComConvite(
          criarUrlDoApp("auth/paciente-cadastro/index.html"),
          token
        );
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
          criarUrlDoApp("auth/paciente-login/index.html"),
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
          criarUrlDoApp("auth/paciente-login/index.html"),
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
      const destino = montarUrlComConvite(
        criarUrlDoApp("auth/paciente-cadastro/index.html"),
        token
      );
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

function tratarRecuperacaoDeSenha() {
  const tipo = obterTipoLinkAutenticacao();
  const hashParams = obterHashParams();
  const searchParams = obterSearchParams();
  const errorCode = hashParams.get("error_code") || searchParams.get("error_code") || "";
  const errorDescription =
    hashParams.get("error_description") ||
    searchParams.get("error_description") ||
    "";
  const temTokenRecuperacao =
    Boolean(hashParams.get("access_token")) ||
    Boolean(hashParams.get("refresh_token")) ||
    Boolean(searchParams.get("token_hash")) ||
    Boolean(searchParams.get("token"));

  if (tipo !== "recovery") {
    return false;
  }

  if (errorCode || errorDescription) {
    const textoErro = `${errorCode} ${errorDescription}`.toLowerCase();

    if (
      textoErro.includes("otp_expired") ||
      textoErro.includes("expired") ||
      textoErro.includes("invalid")
    ) {
      window.confirm(
        "Este link de redefinição de senha é inválido ou expirou.\nPeça um novo link em Esqueci minha senha."
      );
      return true;
    }
  }

  if (temTokenRecuperacao) {
    window.location.href = montarUrlRedefinicaoSenha();
    return true;
  }

  window.confirm(
    "Não foi possível validar este link de redefinição de senha.\nPeça um novo link em Esqueci minha senha."
  );
  return true;
}

function montarUrlLoginConfirmado(perfil, token = "") {
  const destino = new URL(obterLoginUrlPorPerfil(perfil, token));
  destino.searchParams.set("confirmado", "1");
  return destino.href;
}

function tratarConfirmacaoDeEmail() {
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

  const codigo = searchParams.get("code") || "";
  const tokenHash =
    searchParams.get("token_hash") ||
    ((tipo === "email" || tipo === "signup") ? searchParams.get("token") : "") ||
    "";
  const tokenConvite = (searchParams.get("convite") || "").trim();
  const perfil = searchParams.get("perfil") === "profissional" ? "profissional" : "paciente";
  const accessToken = hashParams.get("access_token") || "";
  const hasAccessToken = Boolean(accessToken);
  const deveTratarConfirmacao =
    tipo === "email" ||
    tipo === "signup" ||
    Boolean(codigo) ||
    hasAccessToken ||
    Boolean(tokenHash) ||
    Boolean(errorCode || errorDescription);

  if (!deveTratarConfirmacao) {
    return false;
  }

  if (errorCode || errorDescription) {
    const textoErro = `${errorCode} ${errorDescription}`.toLowerCase();

    if (
      textoErro.includes("otp_expired") ||
      textoErro.includes("expired") ||
      textoErro.includes("invalid")
    ) {
      window.location.replace(obterLoginUrlPorPerfil(perfil, tokenConvite));
      return true;
    }
  }

  window.location.replace(montarUrlLoginConfirmado(perfil, tokenConvite));
  return true;
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

    const destino =
      perfil === "profissional"
        ? criarUrlDoApp("dashboard/profissional/index.html")
        : criarUrlDoApp("dashboard/paciente-com-vinculo/index.html");

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
  const tratouRecuperacaoSenha = tratarRecuperacaoDeSenha();
  if (tratouRecuperacaoSenha) return;

  const tratouConfirmacao = await tratarConfirmacaoDeEmail();
  if (tratouConfirmacao) return;

  const tratouConvite = await tratarEntradaPorLinkEmail();
  if (tratouConvite) return;

  adminSessionActive = false;
  esconderStatusSessao();
}

inicializarTelaPrincipal();
