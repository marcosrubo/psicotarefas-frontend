import supabase from "../shared/supabase.js";

const BACKEND_URL = "https://psicotarefas-backend.onrender.com";

const params = new URLSearchParams(window.location.search);

const modo = params.get("modo") || "login";
const perfil = params.get("perfil") || "paciente";

const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authBadge = document.getElementById("authBadge");
const pillPerfil = document.getElementById("pillPerfil");
const pillModo = document.getElementById("pillModo");

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

function montarUrlDashboard(perfilReal) {
  if (perfilReal === "profissional") {
    return "../dashboard/index.html?perfil=profissional";
  }

  return "../dashboard/index.html?perfil=paciente&estado=sem_vinculo";
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
    footerLink.href = `./index.html?perfil=${perfil}`;
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
    footerLink.href = `./index.html?modo=signup&perfil=${perfil}`;
  }
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

async function cadastrarViaBackend({ nome, email, senha, perfil }) {
  const response = await fetch(`${BACKEND_URL}/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      nome,
      email,
      password: senha,
      perfil
    })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error || "Erro ao criar conta.");
  }

  return result;
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

async function fazerLogin(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  });

  if (error) {
    throw new Error("E-mail ou senha inválidos.");
  }

  if (!data || !data.user) {
    throw new Error("O Supabase não retornou um usuário válido no login.");
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

  if (!validarFormulario()) {
    mostrarMensagem("Revise os campos destacados e tente novamente.", "error");
    return;
  }

  const nome = nomeInput.value.trim();
  const email = emailInput.value.trim();
  const senha = senhaInput.value;

  btnSubmit.disabled = true;
  btnSubmit.textContent = ehModoSignup() ? "Criando conta..." : "Entrando...";

  try {
    if (ehModoSignup()) {
      await cadastrarViaBackend({
        nome,
        email,
        senha,
        perfil
      });

      const user = await fazerLogin(email, senha);
      const perfilUsuario = await buscarPerfilUsuario(user.id);

      mostrarMensagem("Conta criada com sucesso! Redirecionando...", "success");

      setTimeout(() => {
        window.location.href = montarUrlDashboard(perfilUsuario.perfil);
      }, 1200);

      return;
    }

    const user = await fazerLogin(email, senha);
    const perfilUsuario = await buscarPerfilUsuario(user.id);

    mostrarMensagem("Login realizado com sucesso! Redirecionando...", "success");

    setTimeout(() => {
      window.location.href = montarUrlDashboard(perfilUsuario.perfil);
    }, 1200);
  } catch (erro) {
    mostrarMensagem(erro.message || "Ocorreu um erro inesperado.", "error");
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = textoBotaoPadrao();
  }
});

configurarTela();

