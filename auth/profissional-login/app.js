import supabase from "../../shared/supabase.js";

const authForm = document.getElementById("authForm");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");

const erroEmail = document.getElementById("erroEmail");
const erroSenha = document.getElementById("erroSenha");

const formMessage = document.getElementById("formMessage");
const btnSubmit = document.getElementById("btnSubmit");

const toggleButtons = document.querySelectorAll(".toggle-password");
const linkEsqueciSenha = document.getElementById("linkEsqueciSenha");

function limparErros() {
  erroEmail.textContent = "";
  erroSenha.textContent = "";
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

async function fazerLogin(email, senha) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: senha
  });

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
  const { data, error } = await supabase
    .from("perfis")
    .select("perfil, nome, email")
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
      "A recuperação de senha ainda será implementada. Por enquanto, use um e-mail já confirmado e sua senha atual.",
      "error"
    );
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

  try {
    const user = await fazerLogin(email, senha);
    const perfilUsuario = await buscarPerfilUsuario(user.id);

    if (perfilUsuario.perfil !== "profissional") {
      await supabase.auth.signOut();
      mostrarMensagem(
        "Este login não pertence a um profissional. Use a área correta de acesso.",
        "error"
      );
      return;
    }

    const confirmedAtIso = user.email_confirmed_at || new Date().toISOString();
    await atualizarConfirmacaoEmailNoPerfil(user.id, confirmedAtIso);

    mostrarMensagem("Login realizado com sucesso! Redirecionando...", "success");

    window.setTimeout(() => {
      window.location.href = "../../dashboard/profissional/index.html";
    }, 1000);
  } catch (erro) {
    mostrarMensagem(erro.message || "Ocorreu um erro inesperado.", "error");
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.textContent = "Entrar como profissional";
  }
});

async function inicializarLogin() {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Erro ao limpar sessão no login de profissional:", error);
  }
}

inicializarLogin();