import supabase from "../../shared/supabase.js";
import { processarAceitesPendentesNoLogin } from "../../shared/legal-documents.js";

const params = new URLSearchParams(window.location.search);
const conviteToken = (params.get("convite") || "").trim();

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

let conviteInfo = null;
let conviteBloqueado = false;

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

  authBadge.textContent = "Acesso de paciente";
  authTitle.textContent = "Entrar como paciente";
  authSubtitle.textContent =
    "Acesse sua conta para consultar tarefas, responder atividades e acompanhar seu processo no PsicoTarefas.";

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

  authBadge.textContent = "Convite de profissional";
  authTitle.textContent = "Entrar com convite";
  authSubtitle.textContent =
    "Entre na sua conta para continuar o vínculo com o profissional e acessar suas tarefas no PsicoTarefas.";

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

  if (conviteToken) {
    query.set("convite", conviteToken);
  }

  return `${window.location.origin}/?${query.toString()}`;
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

async function processarConviteParaPaciente(userId, patientEmail) {
  if (!conviteToken) {
    return;
  }

  const convite = conviteInfo || (await buscarConvitePublico(conviteToken));

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
    .eq("token_convite", conviteToken)
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
    .eq("token", conviteToken);

  if (erroAtualizarConvite) {
    throw new Error("Não foi possível marcar o convite como aceito.");
  }

  conviteInfo = {
    ...convite,
    status: "aceito"
  };
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
  linkEsqueciSenha.addEventListener("click", () => {
    mostrarMensagem(
      "A recuperação de senha ainda será implementada. Por enquanto, use seu e-mail confirmado e sua senha atual.",
      "error"
    );
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
      await supabase.auth.signOut();
      mostrarMensagem(
        "Este login não pertence a um paciente. Use a área correta de acesso.",
        "error"
      );
      return;
    }

    const confirmedAtIso = user.email_confirmed_at || new Date().toISOString();
    await atualizarConfirmacaoEmailNoPerfil(user.id, confirmedAtIso);
    await processarAceitesPendentesNoLogin(supabase, {
      perfil: "paciente",
      email,
      userId: user.id
    });

    if (conviteToken) {
      await processarConviteParaPaciente(user.id, email);
    }

    const temVinculo = await pacienteTemVinculoAtivo(user.id);
    const destino = temVinculo
      ? "../../dashboard/paciente-com-vinculo/index.html"
      : "../../dashboard/paciente-sem-vinculo/index.html";

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
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Erro ao limpar sessão no login de paciente:", error);
  }

  configurarTelaBase();
  await validarConvite();
  aplicarContextoConviteNaTela();
}

inicializarLogin();
