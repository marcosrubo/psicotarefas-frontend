import supabase from "../../shared/supabase.js?v=20260514-sem-auto-detect";
import { processarAceitesPendentesNoLogin } from "../../shared/legal-documents.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js?v=20260514-sem-auto-detect";

const params = new URLSearchParams(window.location.search);
const conviteToken = (params.get("convite") || "").trim();
const hashParams = new URLSearchParams((window.location.hash || "").replace(/^#/, ""));
const emailConfirmado = obterEmailConfirmado();
guardarEmailConfirmadoParaLogin(emailConfirmado);

const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authBadge = document.getElementById("authBadge");
const pillPerfil = document.getElementById("pillPerfil");
const pillModo = document.getElementById("pillModo");

const inviteNotice = document.getElementById("inviteNotice");
const inviteNoticeTitle = document.getElementById("inviteNoticeTitle");
const inviteNoticeText = document.getElementById("inviteNoticeText");

const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");

const erroEmail = document.getElementById("erroEmail");
const erroSenha = document.getElementById("erroSenha");

const formMessage = document.getElementById("formMessage");
const btnResendConfirmation = document.getElementById("btnResendConfirmation");
const btnSubmit = document.getElementById("btnSubmit");
const toggleButtons = document.querySelectorAll(".toggle-password");
const authForm = document.getElementById("authForm");
const linkEsqueciSenha = document.getElementById("linkEsqueciSenha");
const delayedInputs = [emailInput, senhaInput].filter(Boolean);

let conviteInfo = null;
let conviteBloqueado = false;
let usuarioLiberouCampo = false;

function obterEmailConfirmado() {
  const emailDaUrl = (
    params.get("email") ||
    hashParams.get("email") ||
    obterEmailDoAccessToken(hashParams.get("access_token") || "")
  )
    .trim()
    .toLowerCase();

  if (emailDaUrl) return emailDaUrl;

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

async function obterEmailPeloConvite(token) {
  if (!token) return "";

  try {
    const convite = await buscarConvitePublico(token);
    return String(convite?.patient_email || convite?.email || "").trim().toLowerCase();
  } catch {
    return "";
  }
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

function veioDeConfirmacaoEmail() {
  try {
    if (window.sessionStorage.getItem("psicotarefas_email_confirmado_recentemente") === "1") {
      return true;
    }
  } catch {
    // Sem sessionStorage, usa somente os sinais da URL.
  }

  return false;
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
    ? "Este e-mail já foi confirmado."
    : "Obrigado por confirmar seu E-mail.";
  title.style.margin = "0";
  title.style.fontSize = "24px";
  title.style.lineHeight = "1.15";
  title.style.color = "#1f2430";

  const text = document.createElement("p");
  text.textContent = "Agora digite somente sua senha para entrar.";
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

function obterConvitePendenteSalvo(email) {
  if (!email) return "";

  try {
    return (
      window.localStorage.getItem(`psicotarefas_convite_pendente:${email.toLowerCase()}`) ||
      ""
    ).trim();
  } catch {
    return "";
  }
}

function guardarConvitePendente(email, token) {
  if (!email || !token) return;

  try {
    window.localStorage.setItem(
      `psicotarefas_convite_pendente:${email.toLowerCase()}`,
      token
    );
  } catch {
    // Sem armazenamento local, o fluxo segue pelo token da URL.
  }
}

function removerConvitePendenteSalvo(email) {
  if (!email) return;

  try {
    window.localStorage.removeItem(`psicotarefas_convite_pendente:${email.toLowerCase()}`);
  } catch {
    // Nada a remover quando o armazenamento local não está disponível.
  }
}

registrarAcessoPagina({
  pagina: "login_paciente",
  perfil: "publico",
  contexto: conviteToken ? { convite: true } : {}
});

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

function mostrarAvisoConvite(titulo, texto, tipo = "info") {
  if (!inviteNotice) return;

  inviteNotice.hidden = false;
  inviteNotice.className = `invite-notice invite-notice--${tipo}`;
  inviteNoticeTitle.textContent = titulo;
  inviteNoticeText.textContent = texto;
}

function esconderAvisoConvite() {
  if (!inviteNotice) return;

  inviteNotice.hidden = true;
  inviteNotice.className = "invite-notice";
  inviteNoticeTitle.textContent = "";
  inviteNoticeText.textContent = "";
}

function configurarTelaBase() {
  pillPerfil.textContent = "Paciente";
  pillModo.textContent = "Login";

  authBadge.textContent = "";
  authTitle.textContent = "Paciente";
  authSubtitle.textContent = "";

  esconderAcaoReenviarConfirmacao();
  aplicarContextoConviteNaTela();
}

function aplicarContextoConviteNaTela() {
  esconderAvisoConvite();

  if (!conviteInfo) return;

  const profissional = conviteInfo.professional_name || "Profissional";

  if (conviteBloqueado) {
    let texto = "Este convite não pode mais ser utilizado.";

    if (conviteInfo.status === "cancelado") {
      texto =
        `Este convite foi cancelado por ${profissional}.\n` +
        `Peça um novo convite para continuar o vínculo.`;
    } else if (conviteInfo.status === "expirado") {
      texto = "Este convite expirou.";
    }

    mostrarAvisoConvite("Convite indisponível", texto, "error");
    btnSubmit.disabled = true;
    return;
  }

  authBadge.textContent = "";
  authTitle.textContent = "Paciente";
  authSubtitle.textContent = "";

  mostrarAvisoConvite(
    "Convite identificado",
    `Você está sendo convidado por ${profissional}.`,
    "info"
  );
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

async function buscarConvitePublico(token) {
  const { data, error } = await supabase.rpc("buscar_convite_publico", {
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

async function validarConvite() {
  if (!conviteToken) {
    conviteInfo = null;
    conviteBloqueado = false;
    return;
  }

  conviteInfo = await buscarConvitePublico(conviteToken);

  if (!conviteInfo) {
    conviteBloqueado = true;
    mostrarAvisoConvite(
      "Convite inválido",
      "Este convite não foi encontrado ou não é mais válido.",
      "error"
    );
    return;
  }

  const status = conviteInfo.status;

  if (status === "cancelado" || status === "expirado") {
    conviteBloqueado = true;
    return;
  }

  conviteBloqueado = false;
}

async function fazerLogin(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  });

  if (error) {
    const msg = (error.message || "").toLowerCase();

    if (
      msg.includes("email not confirmed") ||
      msg.includes("email_not_confirmed")
    ) {
      throw new Error(
        "Seu e-mail ainda não foi confirmado. Verifique sua caixa de entrada antes de entrar."
      );
    }

    throw new Error("E-mail ou senha inválidos.");
  }

  if (!data || !data.user) {
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

function montarRedirectUrlConfirmacao() {
  const query = new URLSearchParams();
  query.set("perfil", "paciente");

  const email = emailInput.value.trim().toLowerCase();
  if (email) {
    query.set("email", email);
    try {
      window.localStorage.setItem("psicotarefas_email_confirmacao_pendente", email);
    } catch {
      // Sem armazenamento local, o fluxo segue pelo e-mail da URL.
    }
  }

  if (conviteToken) {
    query.set("convite", conviteToken);
  }

  return `${window.location.origin}/auth/email-confirmado/index.html?${query.toString()}`;
}

function montarRedirectUrlRecuperacaoSenha() {
  const url = new URL("../redefinir-senha/index.html", window.location.href);
  url.searchParams.set("perfil", "paciente");
  return url.href;
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
    throw new Error(
      error.message || "Não foi possível reenviar o e-mail de confirmação."
    );
  }
}

async function enviarRecuperacaoSenha(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: montarRedirectUrlRecuperacaoSenha()
  });

  if (error) {
    throw new Error(error.message || "Não foi possível enviar o e-mail de recuperação.");
  }
}

async function buscarPerfilUsuario(userId) {
  const { data, error } = await supabase
    .from("perfis")
    .select("perfil, nome, email, email_confirmed_at")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    throw new Error("Não foi possível localizar o perfil do usuário.");
  }

  return data;
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
    throw new Error("Não foi possível verificar o vínculo do paciente.");
  }

  return Array.isArray(data) && data.length > 0;
}

async function obterDestinoPorPerfil(userId, perfil) {
  if (perfil === "profissional") {
    return "../../dashboard/profissional/index.html";
  }

  const temVinculo = await pacienteTemVinculoAtivo(userId);
  return temVinculo
    ? "../../dashboard/paciente-com-vinculo/index.html"
    : "../../dashboard/paciente-sem-vinculo/index.html";
}

async function processarConviteParaPaciente(userId, patientEmail, token = conviteToken) {
  if (!token) {
    return false;
  }

  const convite =
    token === conviteToken && conviteInfo
      ? conviteInfo
      : await buscarConvitePublico(token);

  if (!convite) {
    throw new Error("Convite não encontrado.");
  }

  if (convite.status === "cancelado") {
    throw new Error("Este convite foi cancelado e não pode mais ser utilizado.");
  }

  if (convite.status === "expirado") {
    throw new Error("Este convite expirou.");
  }

  const { data: vinculoExistente, error: erroBuscarVinculo } = await supabase
    .from("vinculos")
    .select("id, status, patient_user_id, patient_email, respondeu_convite_at")
    .eq("token_convite", token)
    .maybeSingle();

  if (erroBuscarVinculo || !vinculoExistente) {
    throw new Error("Não foi possível localizar o vínculo do convite.");
  }

  const payloadAtualizacao = {
    patient_user_id: userId,
    patient_email: patientEmail,
    confirmed_at: new Date().toISOString(),
    status: "ativo"
  };

  if (!vinculoExistente.respondeu_convite_at) {
    payloadAtualizacao.respondeu_convite_at = new Date().toISOString();
  }

  const { error: erroAtualizarVinculo } = await supabase
    .from("vinculos")
    .update(payloadAtualizacao)
    .eq("id", vinculoExistente.id);

  if (erroAtualizarVinculo) {
    throw new Error("Não foi possível ativar o vínculo com o profissional.");
  }

  const { error: erroAtualizarConvite } = await supabase
    .from("convites")
    .update({
      status: "aceito",
      accepted_at: new Date().toISOString()
    })
    .eq("token", token);

  if (erroAtualizarConvite) {
    throw new Error("Não foi possível marcar o convite como aceito.");
  }

  if (token === conviteToken) {
    conviteInfo = {
      ...convite,
      status: "aceito"
    };
  }

  return true;
}

async function buscarVinculoPendenteDoPaciente(userId, patientEmail) {
  const statusPendentes = [
    "pendente_convite",
    "aguardando_confirmacao_email",
    "respondido"
  ];

  const consultarVinculo = (campo, valor) =>
    supabase
      .from("vinculos")
      .select("id, token_convite, status, patient_user_id, patient_email, respondeu_convite_at, convite_created_at")
      .in("status", statusPendentes)
      .eq(campo, valor)
      .order("convite_created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  const { data: vinculoPorUsuario, error: erroUsuario } = await consultarVinculo(
    "patient_user_id",
    userId
  );

  if (!erroUsuario && vinculoPorUsuario?.token_convite) {
    return vinculoPorUsuario;
  }

  const { data: vinculoPorEmail, error: erroEmail } = await consultarVinculo(
    "patient_email",
    patientEmail
  );

  if (!erroEmail && vinculoPorEmail?.token_convite) {
    return vinculoPorEmail;
  }

  return null;
}

async function processarVinculoPendenteDoPaciente(userId, patientEmail) {
  const vinculoPendente = await buscarVinculoPendenteDoPaciente(userId, patientEmail);

  if (!vinculoPendente?.token_convite) {
    return false;
  }

  return processarConviteParaPaciente(userId, patientEmail, vinculoPendente.token_convite);
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
        pagina: "login_paciente",
        perfil: "paciente",
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

    btnResendConfirmation.disabled = true;
    btnResendConfirmation.textContent = "Reenviando...";

    try {
      guardarConvitePendente(email, conviteToken);
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

  if (conviteBloqueado) {
    mostrarMensagem("Este convite não pode ser utilizado.", "error");
    return;
  }

  if (!validarFormulario()) {
    mostrarMensagem("Revise os campos destacados e tente novamente.", "error");
    return;
  }

  const email = emailInput.value.trim().toLowerCase();
  const senha = senhaInput.value;

  btnSubmit.disabled = true;
  btnSubmit.textContent = "Entrando...";

  try {
    const user = await fazerLogin(email, senha);
    const perfilUsuario = await buscarPerfilUsuario(user.id);

    if (perfilUsuario.perfil !== "paciente") {
      const destino = await obterDestinoPorPerfil(user.id, perfilUsuario.perfil);
      mostrarMensagem(
        "Esta conta já está ativa em outro painel. Redirecionando...",
        "success"
      );
      window.setTimeout(() => {
        window.location.href = destino;
      }, 800);
      return;
    }

    const confirmedAtIso = user.email_confirmed_at || new Date().toISOString();
    await atualizarConfirmacaoEmailNoPerfil(user.id, confirmedAtIso);
    await processarAceitesPendentesNoLogin(supabase, {
      perfil: "paciente",
      email,
      userId: user.id
    });

    let conviteProcessado = false;
    const tokenConviteParaProcessar = conviteToken || obterConvitePendenteSalvo(email);

    if (tokenConviteParaProcessar) {
      conviteProcessado = await processarConviteParaPaciente(
        user.id,
        email,
        tokenConviteParaProcessar
      );
    } else {
      conviteProcessado = await processarVinculoPendenteDoPaciente(user.id, email);
    }

    if (conviteProcessado) {
      removerConvitePendenteSalvo(email);
    }

    removerEmailConfirmacaoPendente();

    const temVinculo = await pacienteTemVinculoAtivo(user.id);
    const destino = temVinculo
      ? "../../dashboard/paciente-com-vinculo/index.html"
      : "../../dashboard/paciente-sem-vinculo/index.html";

    await registrarEvento({
      evento: "login_paciente_sucesso",
      pagina: "login_paciente",
      perfil: "paciente",
      userId: user.id,
      email,
      contexto: {
        destino: temVinculo ? "paciente_com_vinculo" : "paciente_sem_vinculo",
        convite: Boolean(conviteToken || conviteProcessado)
      }
    });

    mostrarMensagem("Login realizado com sucesso! Redirecionando...", "success");

    window.setTimeout(() => {
      window.location.href = destino;
    }, 1000);
  } catch (erro) {
    const mensagem = erro.message || "Ocorreu um erro inesperado.";

    if (mensagem.toLowerCase().includes("não foi confirmado")) {
      mostrarAcaoReenviarConfirmacao();
    }

    mostrarMensagem(mensagem, "error");
  } finally {
    btnSubmit.disabled = conviteBloqueado;
    btnSubmit.textContent = "Entrar como paciente";
  }
});

async function inicializarLogin() {
  configurarTelaBase();

  let emailParaPreencher = emailConfirmado;

  if (!emailParaPreencher) {
    emailParaPreencher = await obterEmailPorCodigoConfirmacao();
    guardarEmailConfirmadoParaLogin(emailParaPreencher);
  }

  if (!emailParaPreencher) {
    emailParaPreencher = await obterEmailPeloConvite(conviteToken);
    guardarEmailConfirmadoParaLogin(emailParaPreencher);
  }

  const temSinalConfirmacao =
    veioDeConfirmacaoEmail() ||
    params.get("confirmado") === "1" ||
    params.get("type") === "signup" ||
    params.get("type") === "email" ||
    hashParams.get("type") === "signup" ||
    hashParams.get("type") === "email" ||
    Boolean(params.get("code") || params.get("token_hash") || params.get("token")) ||
    Boolean(hashParams.get("access_token")) ||
    linkConfirmacaoJaFoiUsado();

  aplicarEmailConfirmadoNaTela(emailParaPreencher);

  if (temSinalConfirmacao) {
    mostrarCaixaConfirmacaoEmail({
      jaConfirmado: linkConfirmacaoJaFoiUsado()
    });
  }

  try {
    await validarConvite();
    aplicarContextoConviteNaTela();
  } catch (erro) {
    mostrarAvisoConvite(
      "Não foi possível validar o convite agora",
      "Digite sua senha e tente entrar. Se o vínculo ainda não aparecer, peça um novo convite ao profissional.",
      "error"
    );
  }

  const emailDoConvite =
    (conviteInfo?.patient_email || conviteInfo?.email || "").trim().toLowerCase();

  if (!emailParaPreencher && emailDoConvite) {
    aplicarEmailConfirmadoNaTela(emailDoConvite);
  }
}

inicializarLogin().catch((erro) => {
  mostrarMensagem(erro.message || "Não foi possível preparar a tela de login.", "error");
});
