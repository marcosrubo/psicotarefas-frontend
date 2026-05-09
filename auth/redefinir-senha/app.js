import supabase from "../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js";

const params = new URLSearchParams(window.location.search);
const perfil = params.get("perfil") === "profissional" ? "profissional" : "paciente";
const loginUrl =
  perfil === "profissional"
    ? "../profissional-login/index.html"
    : "../paciente-login/index.html";

const authBadge = document.getElementById("authBadge");
const authSubtitle = document.getElementById("authSubtitle");
const loginLinkTop = document.getElementById("loginLinkTop");
const loginLinkCard = document.getElementById("loginLinkCard");
const loginLinkText = document.getElementById("loginLinkText");
const resetForm = document.getElementById("resetForm");
const novaSenhaInput = document.getElementById("novaSenha");
const confirmarSenhaInput = document.getElementById("confirmarSenha");
const erroNovaSenha = document.getElementById("erroNovaSenha");
const erroConfirmarSenha = document.getElementById("erroConfirmarSenha");
const formMessage = document.getElementById("formMessage");
const btnSubmit = document.getElementById("btnSubmit");
const toggleButtons = document.querySelectorAll(".toggle-password");

let recoverySession = null;

registrarAcessoPagina({
  pagina: "redefinir_senha",
  perfil,
  contexto: { origem: "email_recuperacao" }
});

function configurarTela() {
  const label = perfil === "profissional" ? "profissional" : "paciente";

  if (authBadge) authBadge.textContent = `Recuperação de acesso ${label}`;
  if (authSubtitle) {
    authSubtitle.textContent = `Digite uma nova senha para voltar ao painel de ${label}.`;
  }

  if (loginLinkTop) loginLinkTop.href = loginUrl;
  if (loginLinkCard) loginLinkCard.href = loginUrl;
  if (loginLinkText) {
    loginLinkText.textContent = `Acesse o login de ${label} depois de salvar a nova senha.`;
  }
}

function mostrarMensagem(texto, tipo = "error") {
  if (!formMessage) return;

  formMessage.hidden = false;
  formMessage.textContent = texto;
  formMessage.className = `form-message form-message--${tipo}`;
}

function esconderMensagem() {
  if (!formMessage) return;

  formMessage.hidden = true;
  formMessage.textContent = "";
  formMessage.className = "form-message";
}

function limparErros() {
  if (erroNovaSenha) erroNovaSenha.textContent = "";
  if (erroConfirmarSenha) erroConfirmarSenha.textContent = "";
  esconderMensagem();
}

function validarFormulario() {
  limparErros();

  const novaSenha = novaSenhaInput?.value || "";
  const confirmarSenha = confirmarSenhaInput?.value || "";
  let valido = true;

  if (!novaSenha) {
    erroNovaSenha.textContent = "Informe a nova senha.";
    valido = false;
  } else if (novaSenha.length < 6) {
    erroNovaSenha.textContent = "A senha deve ter pelo menos 6 caracteres.";
    valido = false;
  }

  if (!confirmarSenha) {
    erroConfirmarSenha.textContent = "Confirme a nova senha.";
    valido = false;
  } else if (novaSenha !== confirmarSenha) {
    erroConfirmarSenha.textContent = "As senhas não coincidem.";
    valido = false;
  }

  return valido;
}

function habilitarFormulario() {
  if (btnSubmit) btnSubmit.disabled = false;
  if (novaSenhaInput) novaSenhaInput.disabled = false;
  if (confirmarSenhaInput) confirmarSenhaInput.disabled = false;
}

function bloquearFormulario() {
  if (btnSubmit) btnSubmit.disabled = true;
  if (novaSenhaInput) novaSenhaInput.disabled = true;
  if (confirmarSenhaInput) confirmarSenhaInput.disabled = true;
}

async function carregarSessaoRecuperacao() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session) {
    recoverySession = session;
    habilitarFormulario();
    return;
  }

  mostrarMensagem(
    "Este link de redefinição expirou ou já foi usado. Peça um novo link em Esqueci minha senha.",
    "error"
  );
  bloquearFormulario();
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

supabase.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY" && session) {
    recoverySession = session;
    habilitarFormulario();
    esconderMensagem();
  }
});

resetForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validarFormulario()) {
    mostrarMensagem("Revise os campos destacados e tente novamente.", "error");
    return;
  }

  if (!recoverySession) {
    mostrarMensagem(
      "Não encontramos uma sessão válida de recuperação. Peça um novo link em Esqueci minha senha.",
      "error"
    );
    return;
  }

  btnSubmit.disabled = true;
  btnSubmit.textContent = "Salvando...";

  try {
    const { error } = await supabase.auth.updateUser({
      password: novaSenhaInput.value
    });

    if (error) {
      throw new Error(error.message || "Não foi possível redefinir a senha.");
    }

    await registrarEvento({
      evento: "senha_redefinida",
      pagina: "redefinir_senha",
      perfil,
      userId: recoverySession.user?.id || null,
      email: recoverySession.user?.email || null
    });

    mostrarMensagem("Senha redefinida com sucesso. Volte ao login e acesse com a nova senha.", "success");
    bloquearFormulario();
    await supabase.auth.signOut();
  } catch (erro) {
    mostrarMensagem(erro.message || "Erro ao redefinir a senha.", "error");
    btnSubmit.disabled = false;
    btnSubmit.textContent = "Salvar nova senha";
  }
});

configurarTela();
bloquearFormulario();
carregarSessaoRecuperacao().catch((error) => {
  console.error("Erro ao carregar sessão de recuperação:", error);
  mostrarMensagem(
    "Não foi possível validar o link de redefinição. Peça um novo link em Esqueci minha senha.",
    "error"
  );
  bloquearFormulario();
});
