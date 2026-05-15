import supabase from "../../shared/supabase.js?v=20260514-sem-auto-detect";
import { processarAceitesPendentesNoLogin } from "../../shared/legal-documents.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js?v=20260514-sem-auto-detect";

const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");

const erroEmail = document.getElementById("erroEmail");
const erroSenha = document.getElementById("erroSenha");

const formMessage = document.getElementById("formMessage");
const btnResendConfirmation = document.getElementById("btnResendConfirmation");
const btnSubmit = document.getElementById("btnSubmit");

const toggleButtons = document.querySelectorAll(".toggle-password");
const linkEsqueciSenha = document.getElementById("linkEsqueciSenha");
const delayedInputs = [emailInput, senhaInput].filter(Boolean);
const DASHBOARD_PROFISSIONAL_URL = "../../dashboard/profissional/index.html";
const LOGIN_TIMEOUT_MS = 15000;
const PERFIL_TIMEOUT_MS = 7000;
const TAREFA_POS_LOGIN_TIMEOUT_MS = 4500;

let usuarioLiberouCampo = false;
const params = new URLSearchParams(window.location.search);
const hashParams = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
const emailConfirmado = obterEmailConfirmado();
guardarEmailConfirmadoParaLogin(emailConfirmado);

registrarAcessoPagina({
  pagina: "login_profissional",
  perfil: "publico"
});

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded = padding ? normalized + "=".repeat(4 - padding) : normalized;

  return window.atob(padded);
}

function obterEmailDoAccessToken(token) {
  try {
    const payload = token.split(".")[1] || "";

    if (!payload) return "";

    const dados = JSON.parse(decodeBase64Url(payload));
    return String(dados.email || "");
  } catch {
    return "";
  }
}

function obterEmailConfirmado() {
  const emailDaUrl = (
    params.get("email") ||
    hashParams.get("email") ||
    obterEmailDoAccessToken(hashParams.get("access_token") || "")
  )
    .trim()
    .toLowerCase();

  if (emailDaUrl) return emailDaUrl;

  if (!temSinalConfirmacaoNaUrl()) return "";

  try {
    const emailDaSessao = (
      window.sessionStorage.getItem("psicotarefas_email_confirmado_valor") || ""
    ).trim().toLowerCase();

    if (emailDaSessao) return emailDaSessao;
  } catch {
    // Sem sessionStorage, tenta o armazenamento persistente abaixo.
  }

  try {
    return (
      window.localStorage.getItem("psicotarefas_email_confirmacao_pendente") || ""
    ).trim().toLowerCase();
  } catch {
    return "";
  }
}

function temSinalConfirmacaoNaUrl() {
  return (
    params.get("confirmado") === "1" ||
    params.get("type") === "signup" ||
    params.get("type") === "email" ||
    hashParams.get("type") === "signup" ||
    hashParams.get("type") === "email" ||
    Boolean(params.get("code") || params.get("token_hash") || params.get("token")) ||
    Boolean(hashParams.get("access_token")) ||
    linkConfirmacaoJaFoiUsado()
  );
}

function guardarEmailConfirmadoParaLogin(email) {
  if (!email) return;

  try {
    window.sessionStorage.setItem("psicotarefas_email_confirmado_recentemente", "1");
    window.sessionStorage.setItem("psicotarefas_email_confirmado_valor", email.toLowerCase());
    window.localStorage.setItem("psicotarefas_email_confirmacao_pendente", email.toLowerCase());
  } catch {
    // Se storage estiver bloqueado, o e-mail da URL ainda é usado nesta tela.
  }
}

function removerEmailConfirmacaoPendente() {
  try {
    window.localStorage.removeItem("psicotarefas_email_confirmacao_pendente");
    window.sessionStorage.removeItem("psicotarefas_email_confirmado_valor");
    window.sessionStorage.removeItem("psicotarefas_email_confirmado_recentemente");
  } catch {
    // Nada a remover quando o armazenamento local não está disponível.
  }
}

function linkConfirmacaoJaFoiUsado() {
  const erro = [
    params.get("error"),
    params.get("error_code"),
    params.get("error_description"),
    hashParams.get("error"),
    hashParams.get("error_code"),
    hashParams.get("error_description")
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    params.get("ja_confirmado") === "1" ||
    hashParams.get("ja_confirmado") === "1" ||
    erro.includes("expired") ||
    erro.includes("invalid") ||
    erro.includes("otp_expired") ||
    erro.includes("access_denied")
  );
}

function veioDeConfirmacaoEmail() {
  if (!temSinalConfirmacaoNaUrl()) return false;

  try {
    if (window.sessionStorage.getItem("psicotarefas_email_confirmado_recentemente") === "1") {
      return true;
    }
  } catch {
    // Sem sessionStorage, usa somente os sinais da URL.
  }

  return false;
}

function veioDoFluxoConfirmacaoEmail() {
  return (
    veioDeConfirmacaoEmail() ||
    temSinalConfirmacaoNaUrl()
  );
}

async function obterEmailPorCodigoConfirmacao() {
  const code = (params.get("code") || hashParams.get("code") || "").trim();

  if (!code) return "";

  try {
    const result = await supabase.auth.exchangeCodeForSession(code);
    const user = result?.data?.user || result?.data?.session?.user || null;
    return String(user?.email || "").trim().toLowerCase();
  } catch {
    return "";
  }
}

function aplicarEmailConfirmadoNaTela(email) {
  if (!email || !emailInput) return;

  emailInput.value = email;
  usuarioLiberouCampo = true;
  emailInput.dataset.userUnlocked = "true";
  emailInput.removeAttribute("readonly");
  emailInput.removeAttribute("inputmode");

  if (senhaInput) {
    senhaInput.focus();
  }
}

function mostrarCaixaConfirmacaoEmail({ jaConfirmado = false } = {}) {
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
  dialog.style.maxWidth = "420px";
  dialog.style.display = "grid";
  dialog.style.gap = "14px";
  dialog.style.padding = "24px 20px";
  dialog.style.borderRadius = "18px";
  dialog.style.background = "#fff";
  dialog.style.boxShadow = "0 18px 42px rgba(31, 36, 48, 0.18)";
  dialog.style.textAlign = "center";

  const title = document.createElement("h2");
  title.textContent = jaConfirmado
    ? "Este link de confirmação já foi usado ou expirou."
    : "Obrigado por confirmar seu E-mail.";
  title.style.margin = "0";
  title.style.fontSize = "24px";
  title.style.lineHeight = "1.15";
  title.style.color = "#1f2430";

  const text = document.createElement("p");
  text.textContent = jaConfirmado
    ? "Use seu e-mail e senha para se conectar."
    : "Agora digite somente sua senha para entrar.";
  text.style.margin = "0";
  text.style.color = "#667085";
  text.style.fontSize = "16px";
  text.style.lineHeight = "1.45";

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

  button.addEventListener("click", () => {
    overlay.remove();
    if (senhaInput) senhaInput.focus();
  });

  dialog.append(title, text, button);
  overlay.append(dialog);
  document.body.append(overlay);
  button.focus();
}

function bloquearEntradaInicial({ resetUnlock = true } = {}) {
  if (!resetUnlock && usuarioLiberouCampo) return;

  usuarioLiberouCampo = false;

  delayedInputs.forEach((input) => {
    delete input.dataset.userUnlocked;
    input.setAttribute("readonly", "readonly");
    input.setAttribute("inputmode", "none");
    input.blur();
  });

  if (
    document.activeElement === emailInput ||
    document.activeElement === senhaInput
  ) {
    document.activeElement.blur();
  }

  window.scrollTo(0, 0);
}

window.addEventListener("load", () => {
  bloquearEntradaInicial({ resetUnlock: false });

  setTimeout(() => {
    bloquearEntradaInicial({ resetUnlock: false });
  }, 60);
});

window.addEventListener("pageshow", () => {
  bloquearEntradaInicial();
});

function liberarCampoAoInteragir(input) {
  if (!input) return;

  const unlock = () => {
    usuarioLiberouCampo = true;
    input.dataset.userUnlocked = "true";
    input.removeAttribute("readonly");
    input.removeAttribute("inputmode");
  };

  input.addEventListener("pointerdown", unlock, { passive: true });
  input.addEventListener("touchstart", unlock, { passive: true });
  input.addEventListener("mousedown", unlock, { passive: true });
  input.addEventListener("focus", () => {
    if (input.dataset.userUnlocked === "true") return;

    input.blur();
    window.scrollTo(0, 0);
  });
}

delayedInputs.forEach(liberarCampoAoInteragir);

document.addEventListener("DOMContentLoaded", () => {
  bloquearEntradaInicial();
});

function limparErros() {
  erroEmail.textContent = "";
  erroSenha.textContent = "";
  esconderMensagem();
  esconderAcaoReenviarConfirmacao();
}

function mostrarMensagem(texto, tipo = "error") {
  formMessage.hidden = false;
  formMessage.textContent = texto;
  formMessage.className = `form-message form-message--${tipo}`;
}

function esconderMensagem() {
  formMessage.hidden = true;
  formMessage.textContent = "";
  formMessage.className = "form-message";
}

function mostrarAcaoReenviarConfirmacao() {
  if (!btnResendConfirmation) return;
  btnResendConfirmation.hidden = false;
}

function esconderAcaoReenviarConfirmacao() {
  if (!btnResendConfirmation) return;
  btnResendConfirmation.hidden = true;
  btnResendConfirmation.disabled = false;
  btnResendConfirmation.textContent = "Reenviar e-mail de confirmação";
}

function comTempoLimite(promise, timeoutMs, mensagemErro) {
  let timeoutId;

  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error(mensagemErro));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    window.clearTimeout(timeoutId);
  });
}

function validarFormulario() {
  limparErros();

  let valido = true;
  const email = emailInput.value.trim();
  const senha = senhaInput.value;

  if (!email) {
    erroEmail.textContent = "Informe seu e-mail.";
    valido = false;
  } else if (!email.includes("@") || !email.includes(".")) {
    erroEmail.textContent = "Informe um e-mail válido.";
    valido = false;
  }

  if (!senha) {
    erroSenha.textContent = "Informe sua senha.";
    valido = false;
  }

  return valido;
}

function montarRedirectUrlRecuperacaoSenha() {
  const url = new URL("../redefinir-senha/index.html", window.location.href);
  url.searchParams.set("perfil", "profissional");
  return url.href;
}

function montarRedirectUrlConfirmacao() {
  const url = new URL("../email-confirmado/index.html", window.location.href);
  url.searchParams.set("perfil", "profissional");

  const email = emailInput.value.trim().toLowerCase();
  if (email) {
    url.searchParams.set("email", email);
    try {
      window.localStorage.setItem("psicotarefas_email_confirmacao_pendente", email);
    } catch {
      // Sem armazenamento local, o fluxo segue pelo e-mail da URL.
    }
  }

  return url.href;
}

async function enviarRecuperacaoSenha(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: montarRedirectUrlRecuperacaoSenha()
  });

  if (error) {
    throw new Error(error.message || "Não foi possível enviar o e-mail de recuperação.");
  }
}

async function reenviarEmailDeConfirmacao(email) {
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: montarRedirectUrlConfirmacao()
    }
  });

  if (error) {
    throw new Error(error.message || "Não foi possível reenviar o e-mail de confirmação.");
  }
}

async function fazerLogin(email, senha) {
  const { data, error } = await comTempoLimite(
    supabase.auth.signInWithPassword({
      email,
      password: senha
    }),
    LOGIN_TIMEOUT_MS,
    "O login demorou mais que o esperado. Verifique sua conexão e tente novamente."
  );

  if (error) {
    const msg = (error.message || "").toLowerCase();

    if (msg.includes("email not confirmed") || msg.includes("email_not_confirmed")) {
      throw new Error(
        "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada antes de entrar."
      );
    }

    throw new Error("E-mail ou senha inválidos.");
  }

  if (!data?.user) {
    throw new Error("O Supabase não retornou um usuário válido no login.");
  }

  if (!data.user.email_confirmed_at) {
    await supabase.auth.signOut();
    throw new Error(
      "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada antes de entrar."
    );
  }

  return data.user;
}

async function buscarPerfilUsuario(userId) {
  const { data, error } = await comTempoLimite(
    supabase
      .from("perfis")
      .select("perfil, nome, email")
      .eq("user_id", userId)
      .single(),
    PERFIL_TIMEOUT_MS,
    "A consulta do perfil demorou mais que o esperado."
  );

  if (error || !data) {
    throw new Error("Não foi possível localizar o perfil do usuário.");
  }

  return data;
}

async function buscarPerfilUsuarioComFallback(user) {
  try {
    return await buscarPerfilUsuario(user.id);
  } catch (error) {
    const perfilMetadata = user.user_metadata?.perfil;

    if (!perfilMetadata) {
      throw error;
    }

    console.warn("Usando perfil do metadata após falha ao consultar tabela perfis:", error);
    return {
      perfil: perfilMetadata,
      nome: user.user_metadata?.nome || "",
      email: user.email || ""
    };
  }
}

async function atualizarConfirmacaoEmailNoPerfil(userId, confirmedAtIso) {
  const { error } = await supabase
    .from("perfis")
    .update({
      email_confirmed_at: confirmedAtIso
    })
    .eq("user_id", userId);

  if (error) {
    throw new Error("Não foi possível atualizar o status de confirmação do e-mail.");
  }
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

async function obterDestinoPorPerfil(userId, perfil) {
  if (perfil === "profissional") {
    return DASHBOARD_PROFISSIONAL_URL;
  }

  const temVinculo = await pacienteTemVinculoAtivo(userId);
  return temVinculo
    ? "../../dashboard/paciente-com-vinculo/index.html"
    : "../../dashboard/paciente-sem-vinculo/index.html";
}

async function executarTarefaPosLogin(nome, tarefa) {
  try {
    await comTempoLimite(
      tarefa(),
      TAREFA_POS_LOGIN_TIMEOUT_MS,
      `${nome} demorou mais que o esperado.`
    );
  } catch (error) {
    console.warn(`Login continuará sem concluir a tarefa: ${nome}`, error);
  }
}

async function executarTarefasPosLogin({ user, email }) {
  const confirmedAtIso = user.email_confirmed_at || new Date().toISOString();

  await Promise.all([
    executarTarefaPosLogin("atualizar confirmação do e-mail", () =>
      atualizarConfirmacaoEmailNoPerfil(user.id, confirmedAtIso)
    ),
    executarTarefaPosLogin("registrar aceites pendentes", () =>
      processarAceitesPendentesNoLogin(supabase, {
        perfil: "profissional",
        email,
        userId: user.id
      })
    ),
    executarTarefaPosLogin("registrar log de login", () =>
      registrarEvento({
        evento: "login_profissional_sucesso",
        pagina: "login_profissional",
        perfil: "profissional",
        userId: user.id,
        email
      })
    )
  ]);
}

toggleButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const targetId = button.getAttribute("data-target");
    const input = document.getElementById(targetId);

    if (!input) return;

    if (input.type === "password") {
      input.type = "text";
      button.textContent = "Ocultar";
    } else {
      input.type = "password";
      button.textContent = "Mostrar";
    }
  });
});

if (linkEsqueciSenha) {
  linkEsqueciSenha.addEventListener("click", async () => {
    limparErros();

    const email = emailInput.value.trim().toLowerCase();

    if (!email) {
      erroEmail.textContent = "Informe seu e-mail para recuperar a senha.";
      mostrarMensagem("Preencha o e-mail e toque novamente em Esqueci minha senha.", "error");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      erroEmail.textContent = "Informe um e-mail válido.";
      mostrarMensagem("Revise o e-mail antes de pedir a recuperação de senha.", "error");
      return;
    }

    linkEsqueciSenha.textContent = "Enviando...";
    linkEsqueciSenha.style.pointerEvents = "none";

    try {
      await enviarRecuperacaoSenha(email);
      await registrarEvento({
        evento: "recuperacao_senha_solicitada",
        pagina: "login_profissional",
        perfil: "profissional",
        email
      });
      mostrarMensagem(
        "Enviamos um e-mail para redefinir sua senha. Abra o link recebido e cadastre uma nova senha.",
        "success"
      );
    } catch (erro) {
      mostrarMensagem(erro.message || "Não foi possível enviar a recuperação de senha.", "error");
    } finally {
      linkEsqueciSenha.textContent = "Esqueci minha senha";
      linkEsqueciSenha.style.pointerEvents = "";
    }
  });
}

if (btnResendConfirmation) {
  btnResendConfirmation.addEventListener("click", async () => {
    const email = emailInput.value.trim().toLowerCase();

    if (!email) {
      erroEmail.textContent = "Informe seu e-mail para reenviar a confirmação.";
      mostrarMensagem("Preencha o e-mail antes de pedir um novo link.", "error");
      return;
    }

    if (!email.includes("@") || !email.includes(".")) {
      erroEmail.textContent = "Informe um e-mail válido.";
      mostrarMensagem("Revise o e-mail antes de pedir um novo link.", "error");
      return;
    }

    btnResendConfirmation.disabled = true;
    btnResendConfirmation.textContent = "Reenviando...";

    try {
      await reenviarEmailDeConfirmacao(email);
      mostrarMensagem(
        "Enviamos um novo e-mail de confirmação. Abra a mensagem mais recente para concluir seu acesso.",
        "success"
      );
    } catch (erro) {
      mostrarMensagem(erro.message || "Não foi possível reenviar a confirmação.", "error");
    } finally {
      btnResendConfirmation.disabled = false;
      btnResendConfirmation.textContent = "Reenviar e-mail de confirmação";
    }
  });
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validarFormulario()) {
    mostrarMensagem("Revise os campos destacados e tente novamente.", "error");
    return;
  }

  const email = emailInput.value.trim().toLowerCase();
  const senha = senhaInput.value;

  btnSubmit.disabled = true;
  btnSubmit.textContent = "Entrando...";
  let loginConcluido = false;

  try {
    const user = await fazerLogin(email, senha);
    const perfilUsuario = await buscarPerfilUsuarioComFallback(user);

    if (perfilUsuario.perfil !== "profissional") {
      const destino = await obterDestinoPorPerfil(user.id, perfilUsuario.perfil);
      mostrarMensagem(
        "Esta conta já está ativa em outro painel. Redirecionando...",
        "success"
      );
      window.setTimeout(() => {
        window.location.href = destino;
      }, 800);
      loginConcluido = true;
      return;
    }

    await executarTarefasPosLogin({ user, email });
    removerEmailConfirmacaoPendente();

    mostrarMensagem("Login realizado com sucesso! Redirecionando...", "success");
    btnSubmit.textContent = "Redirecionando...";
    loginConcluido = true;

    window.setTimeout(() => {
      window.location.href = DASHBOARD_PROFISSIONAL_URL;
    }, 250);
  } catch (erro) {
    const mensagem = erro.message || "Ocorreu um erro inesperado.";

    if (mensagem.toLowerCase().includes("não foi confirmado")) {
      mostrarAcaoReenviarConfirmacao();
    }

    mostrarMensagem(mensagem, "error");
  } finally {
    if (!loginConcluido) {
      btnSubmit.disabled = false;
      btnSubmit.textContent = "Entrar";
    }
  }
});

async function inicializarLoginProfissional() {
  let emailParaPreencher = emailConfirmado;

  if (!emailParaPreencher) {
    emailParaPreencher = await obterEmailPorCodigoConfirmacao();
    guardarEmailConfirmadoParaLogin(emailParaPreencher);
  }

  aplicarEmailConfirmadoNaTela(emailParaPreencher);

  if (veioDoFluxoConfirmacaoEmail()) {
    mostrarCaixaConfirmacaoEmail({
      jaConfirmado: linkConfirmacaoJaFoiUsado()
    });
  }
}

inicializarLoginProfissional().catch((erro) => {
  mostrarMensagem(erro.message || "Não foi possível preparar a tela de login.", "error");
});
