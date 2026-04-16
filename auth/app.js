const params = new URLSearchParams(window.location.search);

const modo = params.get("modo") || "login";
const perfil = params.get("perfil") || "paciente";

const authTitle = document.getElementById("authTitle");
const authSubtitle = document.getElementById("authSubtitle");
const authBadge = document.getElementById("authBadge");
const pillPerfil = document.getElementById("pillPerfil");
const pillModo = document.getElementById("pillModo");

const authForm = document.getElementById("authForm");
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

function capitalizar(texto) {
  if (!texto) return "";
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

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

function modoLabel() {
  return ehModoSignup() ? "Cadastro" : "Login";
}

function configurarTela() {
  pillPerfil.textContent = perfilLabel();
  pillModo.textContent = modoLabel();

  if (ehModoSignup()) {
    authBadge.textContent = `Cadastro de ${perfilLabel().toLowerCase()}`;
    authTitle.textContent =
      perfil === "profissional"
        ? "Criar conta de profissional"
        : "Criar conta de paciente";

    authSubtitle.textContent =
      perfil === "profissional"
        ? "Crie sua conta para começar a acompanhar pacientes, atribuir tarefas e organizar seu trabalho no PsicoTarefas."
        : "Crie sua conta para acessar a plataforma, acompanhar tarefas e, quando quiser, solicitar vínculo com um profissional.";

    groupNome.hidden = false;
    groupConfirmarSenha.hidden = false;
    formOptions.hidden = true;

    btnSubmit.textContent =
      perfil === "profissional"
        ? "Criar conta de profissional"
        : "Criar conta de paciente";

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

    groupNome.hidden = true;
    groupConfirmarSenha.hidden = true;
    formOptions.hidden = false;

    btnSubmit.textContent = "Entrar";

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

  if (ehModoSignup()) {
    if (!nome) {
      erroNome.textContent = "Informe seu nome.";
      valido = false;
    }
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

authForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!validarFormulario()) {
    mostrarMensagem("Revise os campos destacados e tente novamente.", "error");
    return;
  }

  if (ehModoSignup()) {
    mostrarMensagem(
      `Cadastro de ${perfilLabel().toLowerCase()} validado com sucesso. No próximo passo vamos ligar esta tela ao Supabase.`,
      "success"
    );
  } else {
    mostrarMensagem(
      `Login de ${perfilLabel().toLowerCase()} validado com sucesso. No próximo passo vamos ligar esta tela ao Supabase.`,
      "success"
    );
  }
});

configurarTela();

