import supabase from "../../shared/supabase.js?v=20260514-sem-auto-detect";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js?v=20260514-sem-auto-detect";
import {
  carregarDocumentosPublicados,
  guardarAceitesPendentes,
  registrarAceitesDocumentos
} from "../../shared/legal-documents.js";

const authForm = document.getElementById("authForm");
const nomeInput = document.getElementById("nome");
const telefoneInput = document.getElementById("telefone");
const emailInput = document.getElementById("email");
const senhaInput = document.getElementById("senha");
const confirmarSenhaInput = document.getElementById("confirmarSenha");

const erroNome = document.getElementById("erroNome");
const erroEmail = document.getElementById("erroEmail");
const erroSenha = document.getElementById("erroSenha");
const erroConfirmarSenha = document.getElementById("erroConfirmarSenha");
const erroAceites = document.getElementById("erroAceites");

const formMessage = document.getElementById("formMessage");
const btnSubmit = document.getElementById("btnSubmit");
const consentCard = document.getElementById("consentCard");
const consentList = document.getElementById("consentList");
const legalModal = document.getElementById("legalModal");
const legalModalTitle = document.getElementById("legalModalTitle");
const legalModalVersion = document.getElementById("legalModalVersion");
const legalModalContent = document.getElementById("legalModalContent");
const btnCloseLegalModal = document.getElementById("btnCloseLegalModal");

const toggleButtons = document.querySelectorAll(".toggle-password");
let consentimentosDisponiveis = [];
let consentimentosCarregados = false;

registrarAcessoPagina({
  pagina: "cadastro_profissional",
  perfil: "publico"
});

function limparErros() {
  erroNome.textContent = "";
  erroEmail.textContent = "";
  erroSenha.textContent = "";
  erroConfirmarSenha.textContent = "";
  erroAceites.textContent = "";
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizarTelefone(value) {
  return String(value || "").replace(/\D/g, "");
}

function formatarTelefone(value) {
  const digits = normalizarTelefone(value).slice(0, 13);

  if (!digits) return "";
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 11) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }

  return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
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

  if (!consentimentosCarregados || !consentimentosDisponiveis.length) {
    erroAceites.textContent = "Não foi possível validar os documentos obrigatórios.";
    valido = false;
  } else {
    const faltantes = consentimentosDisponiveis.filter((item) => {
      const checkbox = document.querySelector(`[data-consent-documento="${item.documento}"]`);
      return item.obrigatorio && !checkbox?.checked;
    });

    if (faltantes.length) {
      erroAceites.textContent = "Você precisa aceitar os documentos obrigatórios para continuar.";
      valido = false;
    }
  }

  return valido;
}

function renderizarConsentimentos(documentos) {
  consentimentosDisponiveis = documentos;
  consentimentosCarregados = true;

  if (!consentCard || !consentList) return;

  consentCard.hidden = false;
  consentList.innerHTML = documentos
    .map(
      (item) => `
        <label class="consent-item">
          <div class="consent-item__row">
            <input
              type="checkbox"
              data-consent-documento="${item.documento}"
            />
            <div class="consent-item__label">
              <strong>Li e aceito ${escapeHtml(item.titulo)}</strong>
              <span class="consent-item__meta">Versão ${escapeHtml(item.versao)}</span>
            </div>
          </div>
          <p class="consent-item__summary">${escapeHtml(item.resumo || "")}</p>
          <div class="consent-item__actions">
            <button
              class="consent-link"
              type="button"
              data-open-documento="${item.documento}"
            >
              Ler documento completo
            </button>
          </div>
        </label>
      `
    )
    .join("");
}

function abrirModalDocumento(documentoId) {
  const documento = consentimentosDisponiveis.find((item) => item.documento === documentoId);
  if (!documento || !legalModal || !legalModalTitle || !legalModalVersion || !legalModalContent) {
    return;
  }

  legalModalTitle.textContent = documento.titulo;
  legalModalVersion.textContent = `Versão ${documento.versao}`;
  legalModalContent.textContent = documento.conteudo || documento.resumo || "";
  legalModal.hidden = false;
}

function fecharModalDocumento() {
  if (!legalModal) return;
  legalModal.hidden = true;
}

async function cadastrarProfissional({ nome, telefone, email, senha }) {
  const query = new URLSearchParams();
  query.set("perfil", "profissional");
  query.set("email", email);
  const redirectUrl = `${window.location.origin}/auth/email-confirmado/index.html?${query.toString()}`;

  const { data, error } = await supabase.auth.signUp({
    email,
    password: senha,
    options: {
      emailRedirectTo: redirectUrl,
      data: {
        nome,
        perfil: "profissional",
        telefone
      }
    }
  });

  if (error) {
    throw new Error(error.message || "Erro ao criar conta de profissional.");
  }

  if (!data.user?.identities?.length) {
    throw new Error("Não conseguimos criar a conta com este e-mail. Se já tem cadastro, faça login. Caso contrário, use outro e-mail.");
  }

  return data;
}

async function registrarTelefoneNoPerfil(userId, telefone) {
  if (!userId) return;

  const { error } = await supabase
    .from("perfis")
    .update({ telefone })
    .eq("user_id", userId);

  if (error) {
    console.warn("Não foi possível atualizar o WhatsApp do profissional no perfil:", error);
  }
}

async function carregarConsentimentos() {
  const documentos = await carregarDocumentosPublicados(supabase, "profissional");
  renderizarConsentimentos(documentos);
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

if (telefoneInput) {
  telefoneInput.addEventListener("input", () => {
    telefoneInput.value = formatarTelefone(telefoneInput.value);
  });
}

if (consentList) {
  consentList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-open-documento]");
    if (!button) return;

    abrirModalDocumento(button.getAttribute("data-open-documento"));
  });
}

if (btnCloseLegalModal) {
  btnCloseLegalModal.addEventListener("click", fecharModalDocumento);
}

if (legalModal) {
  legalModal.addEventListener("click", (event) => {
    if (event.target.matches("[data-close-legal-modal]")) {
      fecharModalDocumento();
    }
  });
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validarFormulario()) {
    mostrarMensagem("Revise os campos destacados e tente novamente.", "error");
    return;
  }

  const nome = nomeInput.value.trim();
  const telefoneFormatado = telefoneInput?.value.trim() || "";
  const telefone = telefoneFormatado ? formatarTelefone(telefoneFormatado) : null;
  const email = emailInput.value.trim().toLowerCase();
  const senha = senhaInput.value;

  btnSubmit.disabled = true;
  btnSubmit.textContent = "Criando conta...";

  try {
    const resultadoCadastro = await cadastrarProfissional({
      nome,
      telefone,
      email,
      senha
    });

    guardarAceitesPendentes({
      perfil: "profissional",
      email,
      documentos: consentimentosDisponiveis.map(({ documento, versao }) => ({
        documento,
        versao
      }))
    });

    const sessionUserId = resultadoCadastro?.session?.user?.id || null;

    if (sessionUserId) {
      await registrarTelefoneNoPerfil(sessionUserId, telefone);
    }

    if (sessionUserId) {
      await registrarAceitesDocumentos(supabase, {
        userId: sessionUserId,
        documentos: consentimentosDisponiveis.map(({ documento, versao }) => ({
          documento,
          versao
        }))
      });
    }

    await registrarEvento({
      evento: "cadastro_profissional_sucesso",
      pagina: "cadastro_profissional",
      perfil: "profissional",
      userId: sessionUserId,
      email
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

  try {
    await carregarConsentimentos();
  } catch (error) {
    console.error("Erro ao carregar documentos do cadastro de profissional:", error);
    mostrarMensagem(
      error.message || "Não foi possível carregar os documentos obrigatórios.",
      "error"
    );
    btnSubmit.disabled = true;
  }
}

inicializarCadastro();
