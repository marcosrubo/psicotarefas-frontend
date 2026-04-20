import supabase from "../../shared/supabase.js";

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

const nomeInput = document.getElementById("nome");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const confirmarSenhaInput = document.getElementById("confirmarSenha");

const erroNome = document.getElementById("erroNome");
const erroEmail = document.getElementById("erroEmail");
const erroSenha = document.getElementById("erroSenha");
const erroConfirmarSenha = document.getElementById("erroConfirmarSenha");

const formMessage = document.getElementById("formMessage");
const btnSubmit = document.getElementById("btnSubmit");
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

function configurarTelaBase() {
  pillPerfil.textContent = "Paciente";
  pillModo.textContent = "Cadastro";

  authBadge.textContent = "Cadastro de paciente";
  authTitle.textContent = "Criar conta de paciente";
  authSubtitle.textContent =
    "Crie sua conta para acessar a plataforma, acompanhar tarefas e, quando quiser, se vincular a um profissional no PsicoTarefas.";

  aplicarContextoConviteNaTela();
}

function aplicarContextoConviteNaTela() {
  esconderAvisoConvite();

  if (!conviteInfo) {
    authBadge.textContent = "Cadastro de paciente";
    authTitle.textContent = "Criar conta de paciente";
    authSubtitle.textContent =
      "Crie sua conta para acessar a plataforma, acompanhar tarefas e, quando quiser, se vincular a um profissional no PsicoTarefas.";
    return;
  }

  const profissional = conviteInfo.professional_name || "Profissional";

  if (conviteBloqueado) {
    let texto = "Este convite não pode mais ser utilizado.";

    if (conviteInfo.status === "cancelado") {
      texto =
        `Este convite foi cancelado por ${profissional}.\n` +
        `Você ainda pode criar sua conta normalmente e depois escolher um profissional.`;
    } else if (conviteInfo.status === "respondido") {
      texto =
        "Este convite já recebeu um cadastro. Confirme o e-mail informado e depois entre no sistema.";
    } else if (conviteInfo.status === "aceito") {
      texto =
        "Este convite já foi concluído. Entre com sua conta para continuar.";
    } else if (conviteInfo.status === "expirado") {
      texto =
        `Este convite de ${profissional} expirou.\n` +
        `Você ainda pode criar sua conta normalmente e depois escolher um profissional.`;
    }

    authBadge.textContent = "Convite indisponível";
    authTitle.textContent = "Convite não disponível";
    authSubtitle.textContent =
      "Não é possível continuar este cadastro com o convite atual.";

    mostrarAvisoConvite("Convite indisponível", texto, "error");
    btnSubmit.disabled = true;
    return;
  }

  authBadge.textContent = "Convite de profissional";
  authTitle.textContent = "Criar conta com convite";
  authSubtitle.textContent =
    "Crie sua conta para se vincular ao profissional e acessar suas tarefas no PsicoTarefas.";

  mostrarAvisoConvite(
    "Convite identificado",
    `Você está sendo convidado por ${profissional}.`,
    "info"
  );
}

function validarFormulario() {
  limparErros();

  let valido = true;
  const nome = nomeInput.value.trim();
  const email = emailInput.value.trim();
  const senha = senhaInput.value;
  const confirmarSenha = confirmarSenhaInput.value;

  if (!nome) {
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

  if (!confirmarSenha) {
    erroConfirmarSenha.textContent = "Confirme sua senha.";
    valido = false;
  } else if (senha !== confirmarSenha) {
    erroConfirmarSenha.textContent = "As senhas não coincidem.";
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
    btnSubmit.disabled = true;
    return;
  }

  const status = conviteInfo.status;

  if (status === "cancelado" || status === "expirado") {
    conviteBloqueado = true;
    aplicarContextoConviteNaTela();
    return;
  }

  if (status === "respondido" || status === "aceito") {
    conviteBloqueado = true;
    aplicarContextoConviteNaTela();
    return;
  }

  conviteBloqueado = false;
}

async function registrarRespostaAoConviteAposCadastro({
  token,
  patientUserId,
  patientEmail
}) {
  if (!token) {
    return;
  }

  const { error } = await supabase.rpc("registrar_resposta_convite", {
    p_token: token,
    p_patient_email: patientEmail,
    p_patient_user_id: patientUserId || null
  });

  if (error) {
    throw new Error(
      error.message || "Não foi possível registrar a resposta ao convite."
    );
  }

  if (conviteInfo) {
    conviteInfo = {
      ...conviteInfo,
      status: "respondido"
    };
  }
}

async function cadastrarPaciente({ nome, email, senha }) {
  const query = new URLSearchParams();
  query.set("perfil", "paciente");

  if (conviteToken) {
    query.set("convite", conviteToken);
  }

  const redirectUrl = `${window.location.origin}/?${query.toString()}`;

  const metadata = {
    nome,
    perfil: "paciente"
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
  btnSubmit.textContent = "Criando conta...";

  try {
    const resultadoCadastro = await cadastrarPaciente({
      nome,
      email,
      senha
    });

    if (conviteToken) {
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
        window.location.href = "../../index.html";
      }
    }, 50);
  } catch (erro) {
    mostrarMensagem(erro.message || "Ocorreu um erro inesperado.", "error");
  } finally {
    btnSubmit.disabled = conviteBloqueado;
    btnSubmit.textContent = "Criar conta de paciente";
  }
});

async function inicializarCadastro() {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Erro ao limpar sessão no cadastro de paciente:", error);
  }

  configurarTelaBase();
  await validarConvite();
  aplicarContextoConviteNaTela();
}

inicializarCadastro();

