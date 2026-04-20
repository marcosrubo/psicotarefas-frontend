import supabase from "../../shared/supabase.js";

const authForm = document.getElementById("authForm");
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

async function cadastrarProfissional({ nome, email, senha }) {
  const redirectUrl = `${window.location.origin}/auth/profissional-login/index.html`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        nome,
        perfil: "profissional"
      }
    }
  });

  if (error) {
    throw new Error(error.message || "Erro ao criar conta de profissional.");
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
    await cadastrarProfissional({
      nome,
      email,
      senha
    });

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
    btnSubmit.disabled = false;
    btnSubmit.textContent = "Criar conta de profissional";
  }
});

async function inicializarCadastro() {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Erro ao limpar sessão no cadastro de profissional:", error);
  }
}

inicializarCadastro();