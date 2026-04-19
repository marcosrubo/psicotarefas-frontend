import supabase from "../shared/supabase.js";

const params = new URLSearchParams(window.location.search);

const modo = params.get("modo") || "login";
const perfil = params.get("perfil") || "paciente";
const conviteToken = (params.get("convite") || "").trim();

const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authBadge = document.getElementById("authBadge");
const pillPerfil = document.getElementById("pillPerfil");
const pillModo = document.getElementById("pillModo");

const inviteNotice = document.getElementById("inviteNotice");
const inviteNoticeTitle = document.getElementById("inviteNoticeTitle");
const inviteNoticeText = document.getElementById("inviteNoticeText");

const groupNome = document.getElementById("groupNome");
const groupConfirmarSenha = document.getElementById("groupConfirmarSenha");

const nomeInput = document.getElementById("nome");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const confirmarSenhaInput = document.getElementById("confirmarSenha");

const erroNome = document.getElementById("erroNome");
const erroEmail = document.getElementById("erroEmail");
const erroSenha = document.getElementById("erroSenha");
const erroConfirmarSenha = document.getElementById("erroConfirmarSenha");

const formOptions = document.getElementById("formOptions");
const formMessage = document.getElementById("formMessage");
const btnSubmit = document.getElementById("btnSubmit");

const footerText = document.getElementById("footerText");
const footerLink = document.getElementById("footerLink");

const toggleButtons = document.querySelectorAll(".toggle-password");
const authForm = document.getElementById("authForm");

let conviteInfo = null;
let conviteBloqueado = false;

function limparErros() {
  erroNome.textContent = "";
  erroEmail.textContent = "";
  erroSenha.textContent = "";
  erroConfirmarSenha.textContent = "";
  esconderMensagem();
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

function ehModoSignup() {
  return modo === "signup";
}

function perfilLabel() {
  return perfil === "profissional" ? "Profissional" : "Paciente";
}

function textoBotaoPadrao() {
  if (ehModoSignup()) {
    return perfil === "profissional"
      ? "Criar conta de profissional"
      : "Criar conta de paciente";
  }

  return "Entrar";
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

async function montarUrlDashboard(perfilReal, userId) {
  if (perfilReal === "profissional") {
    return "../dashboard/profissional/index.html";
  }

  const temVinculo = await pacienteTemVinculoAtivo(userId);

  if (temVinculo) {
    return "../dashboard/paciente-com-vinculo/index.html";
  }

  return "../dashboard/paciente-sem-vinculo/index.html";
}

function linkLogin() {
  const query = new URLSearchParams();
  query.set("perfil", perfil);

  if (conviteToken) {
    query.set("convite", conviteToken);
  }

  return `./index.html?${query.toString()}`;
}

function linkSignup() {
  const query = new URLSearchParams();
  query.set("modo", "signup");
  query.set("perfil", perfil);

  if (conviteToken) {
    query.set("convite", conviteToken);
  }

  return `./index.html?${query.toString()}`;
}

function configurarTela() {
  const signup = ehModoSignup();

  pillPerfil.textContent = perfilLabel();
  pillModo.textContent = signup ? "Cadastro" : "Login";

  groupNome.hidden = !signup;
  groupConfirmarSenha.hidden = !signup;
  formOptions.hidden = signup;

  if (!signup) {
    nomeInput.value = "";
    confirmarSenhaInput.value = "";
  }

  if (signup) {
    authBadge.textContent = `Cadastro de ${perfilLabel().toLowerCase()}`;
    authTitle.textContent =
      perfil === "profissional"
        ? "Criar conta de profissional"
        : "Criar conta de paciente";

    authSubtitle.textContent =
      perfil === "profissional"
        ? "Crie sua conta para começar a acompanhar pacientes, atribuir tarefas e organizar seu trabalho no PsicoTarefas."
        : "Crie sua conta para acessar a plataforma, acompanhar tarefas e, quando quiser, solicitar vínculo com um profissional.";

    btnSubmit.textContent = textoBotaoPadrao();

    footerText.textContent = "Já tem conta?";
    footerLink.textContent = "Entrar";
    footerLink.href = linkLogin();
  } else {
    authBadge.textContent = `Acesso de ${perfilLabel().toLowerCase()}`;
    authTitle.textContent =
      perfil === "profissional"
        ? "Entrar como profissional"
        : "Entrar como paciente";

    authSubtitle.textContent =
      perfil === "profissional"
        ? "Acesse sua conta para gerenciar pacientes, tarefas e respostas no PsicoTarefas."
        : "Acesse sua conta para consultar tarefas, responder atividades e acompanhar seu processo no PsicoTarefas.";

    btnSubmit.textContent = textoBotaoPadrao();

    footerText.textContent = "Ainda não tem conta?";
    footerLink.textContent =
      perfil === "profissional"
        ? "Criar conta de profissional"
        : "Criar conta de paciente";
    footerLink.href = linkSignup();
  }

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
        `Cadastre-se, entre no sistema e peça o vínculo. Você também pode solicitar um novo convite a ${profissional}.`;
    } else if (conviteInfo.status === "respondido") {
      texto =
        "Este convite já recebeu um cadastro. Confirme o e-mail informado e depois entre no sistema.";
    } else if (conviteInfo.status === "aceito") {
      texto = "Este convite já foi concluído. Entre com sua conta para continuar.";
    } else if (conviteInfo.status === "expirado") {
      texto = "Este convite expirou.";
    }

    mostrarAvisoConvite("Convite indisponível", texto, "error");
    btnSubmit.disabled = true;
    return;
  }

  const textoConvite = `Você está sendo convidado por ${profissional}.`;

  if (ehModoSignup()) {
    authBadge.textContent = "Convite de profissional";
    authTitle.textContent = "Criar conta com convite";
    authSubtitle.textContent =
      "Crie sua conta para se vincular ao profissional e acessar suas tarefas no PsicoTarefas.";
  } else {
    authBadge.textContent = "Convite de profissional";
    authTitle.textContent = "Entrar com convite";
    authSubtitle.textContent =
      "Entre na sua conta para continuar o vínculo com o profissional e acessar suas tarefas no PsicoTarefas.";
  }

  mostrarAvisoConvite("Convite identificado", textoConvite, "info");
}

function validarFormulario() {
  limparErros();

  let valido = true;

  const nome = nomeInput.value.trim();
  const email = emailInput.value.trim();
  const senha = senhaInput.value;
  const confirmarSenha = confirmarSenhaInput.value;

  if (ehModoSignup() && !nome) {
    erroNome.textContent = "Informe seu nome.";
    valido = false;
  }

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
  } else if (senha.length < 6) {
    erroSenha.textContent = "A senha deve ter pelo menos 6 caracteres.";
    valido = false;
  }

  if (ehModoSignup()) {
    if (!confirmarSenha) {
      erroConfirmarSenha.textContent = "Confirme sua senha.";
      valido = false;
    } else if (senha !== confirmarSenha) {
      erroConfirmarSenha.textContent = "As senhas não coincidem.";
      valido = false;
    }
  }

  return valido;
}

async function buscarPerfilUsuario(userId) {
  const { data, error } = await supabase
    .from("perfis")
    .select("perfil, nome, email")
    .eq("user_id", userId)
    .single();

  if (error) {
    throw new Error("Não foi possível localizar o perfil do usuário.");
  }

  return data;
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

  if (ehModoSignup() && (status === "respondido" || status === "aceito")) {
    conviteBloqueado = true;
    return;
  }

  conviteBloqueado = false;
}

async function registrarRespostaAoConviteAposCadastro({ token, patientUserId, patientEmail }) {
  if (!token || perfil !== "paciente") {
    return;
  }

  const { data: vinculo, error: erroBuscarVinculo } = await supabase
    .from("vinculos")
    .select("id, status")
    .eq("token_convite", token)
    .maybeSingle();

  if (erroBuscarVinculo || !vinculo) {
    throw new Error("Não foi possível localizar o vínculo deste convite.");
  }

  const payloadAtualizacao = {
    patient_email: patientEmail,
    respondeu_convite_at: new Date().toISOString(),
    status: "aguardando_confirmacao_email"
  };

  if (patientUserId) {
    payloadAtualizacao.patient_user_id = patientUserId;
  }

  const { error: erroAtualizarVinculo } = await supabase
    .from("vinculos")
    .update(payloadAtualizacao)
    .eq("id", vinculo.id);

  if (erroAtualizarVinculo) {
    throw new Error("Não foi possível registrar a resposta ao convite.");
  }

  const { error: erroAtualizarConvite } = await supabase
    .from("convites")
    .update({ status: "respondido" })
    .eq("token", token);

  if (erroAtualizarConvite) {
    throw new Error("Não foi possível marcar o convite como respondido.");
  }

  if (conviteInfo) {
    conviteInfo = {
      ...conviteInfo,
      status: "respondido"
    };
  }
}

async function processarConviteParaPaciente(userId, patientEmail) {
  if (!conviteToken || perfil !== "paciente") {
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
    .select("id, status, patient_user_id, patient_email")
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
    .update({ status: "aceito" })
    .eq("token", conviteToken);

  if (erroAtualizarConvite) {
    throw new Error("Não foi possível marcar o convite como aceito.");
  }

  conviteInfo = {
    ...convite,
    status: "aceito"
  };
}

async function cadastrarUsuario({ nome, email, senha, perfil }) {
  const query = new URLSearchParams();
  query.set("perfil", perfil);

  if (conviteToken) {
    query.set("convite", conviteToken);
  }

  const redirectUrl = `${window.location.origin}/auth/index.html?${query.toString()}`;

  const metadata = {
    nome,
    perfil
  };

  if (conviteToken) {
    metadata.convite_token = conviteToken;
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      emailRedirectTo: redirectUrl,
      data: metadata
    }
  });

  if (error) {
    throw new Error(error.message || "Erro ao criar conta.");
  }

  return data;
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

  const nome = nomeInput.value.trim();
  const email = emailInput.value.trim().toLowerCase();
  const senha = senhaInput.value;

  btnSubmit.disabled = true;
  btnSubmit.textContent = ehModoSignup() ? "Criando conta..." : "Entrando...";

  try {
    if (ehModoSignup()) {
      const resultadoCadastro = await cadastrarUsuario({
        nome,
        email,
        senha,
        perfil
      });

      if (conviteToken && perfil === "paciente") {
        await registrarRespostaAoConviteAposCadastro({
          token: conviteToken,
          patientUserId: resultadoCadastro?.user?.id || null,
          patientEmail: email
        });
      }

      mostrarMensagem(
        "Conta criada com sucesso! Agora confirme seu e-mail para entrar no sistema.",
        "success"
      );

      window.setTimeout(() => {
        const confirmou = window.confirm(
          "Conta criada com sucesso! Agora confirme seu e-mail para entrar no sistema."
        );

        if (confirmou) {
          window.location.href = "/";
        }
      }, 50);

      return;
    }

    const user = await fazerLogin(email, senha);
    const perfilUsuario = await buscarPerfilUsuario(user.id);

    if (perfilUsuario.perfil !== perfil) {
      await supabase.auth.signOut();

      const mensagem =
        perfil === "paciente"
          ? "Este login pertence a um profissional. Entre pela área do profissional."
          : "Este login pertence a um paciente. Entre pela área do paciente.";

      mostrarMensagem(mensagem, "error");
      return;
    }

    if (conviteToken && perfilUsuario.perfil === "paciente") {
      await processarConviteParaPaciente(user.id, email);
    }

    const destino = await montarUrlDashboard(perfilUsuario.perfil, user.id);

    mostrarMensagem("Login realizado com sucesso! Redirecionando...", "success");

    setTimeout(() => {
      window.location.href = destino;
    }, 1200);
  } catch (erro) {
    mostrarMensagem(erro.message || "Ocorreu um erro inesperado.", "error");
  } finally {
    btnSubmit.disabled = conviteBloqueado;
    btnSubmit.textContent = textoBotaoPadrao();
  }
});

async function inicializarAuth() {
  // Sempre que entrar no AUTH, limpa qualquer sessão existente para evitar
  // login automático e manter o fluxo previsível.
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Erro ao limpar sessão no auth:", error);
  }

  await validarConvite();
  configurarTela();
}

inicializarAuth();
