import supabase from "../shared/supabase.js";

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

function montarUrlDashboard() {
  if (perfil === "profissional") {
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

  const email = emailInput.value.trim();
  const senha = senhaInput.value;
  const nome = nomeInput.value.trim();

  btnSubmit.disabled = true;
  btnSubmit.textContent = ehModoSignup() ? "Criando conta..." : "Entrando...";

  try {
    if (ehModoSignup()) {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: senha,
        options: {
          data: {
            nome,
            perfil
          }
        }
      });

      if (error) {
        if (error.message?.toLowerCase().includes("rate limit")) {
          mostrarMensagem(
            "Muitas tentativas de cadastro em pouco tempo. Aguarde um pouco e tente novamente.",
            "error"
          );
        } else {
          mostrarMensagem(error.message, "error");
        }
        return;
      }

      if (!data || !data.user) {
        mostrarMensagem(
          "O Supabase não retornou o usuário criado. Confira a configuração de autenticação por e-mail no projeto.",
          "error"
        );
        return;
      }

      mostrarMensagem("Conta criada com sucesso! Redirecionando...", "success");

      setTimeout(() => {
        window.location.href = montarUrlDashboard();
      }, 1200);

      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: senha
    });

    if (error) {
      mostrarMensagem("E-mail ou senha inválidos.", "error");
      return;
    }

    if (!data || !data.user) {
      mostrarMensagem(
        "O Supabase não retornou um usuário válido no login.",
        "error"
      );
      return;
    }

    mostrarMensagem("Login realizado com sucesso! Redirecionando...", "success");

    setTimeout(() => {
      window.location.href = montarUrlDashboard();
    }, 1200);
  } catch (erro) {
    console.error("AUTH catch error:", erro);
    mostrarMensagem("Ocorreu um erro inesperado. Tente novamente.", "error");
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = textoBotaoPadrao();
  }
});

configurarTela();

