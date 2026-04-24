import supabase from "../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js";
import {
  carregarDocumentosPublicados,
  guardarAceitesPendentes,
  registrarAceitesDocumentos
} from "../../shared/legal-documents.js";

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
const erroAceites = document.getElementById("erroAceites");

const formMessage = document.getElementById("formMessage");
const btnSubmit = document.getElementById("btnSubmit");
const toggleButtons = document.querySelectorAll(".toggle-password");
const authForm = document.getElementById("authForm");
const consentCard = document.getElementById("consentCard");
const consentList = document.getElementById("consentList");
const legalModal = document.getElementById("legalModal");
const legalModalTitle = document.getElementById("legalModalTitle");
const legalModalVersion = document.getElementById("legalModalVersion");
const legalModalContent = document.getElementById("legalModalContent");
const btnCloseLegalModal = document.getElementById("btnCloseLegalModal");

let conviteInfo = null;
let conviteBloqueado = false;
let consentimentosDisponiveis = [];
let consentimentosCarregados = false;

registrarAcessoPagina({
  pagina: "cadastro_paciente",
  perfil: "publico",
  contexto: conviteToken ? { convite: true } : {}
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

async function carregarConsentimentos() {
  const documentos = await carregarDocumentosPublicados(supabase, "paciente");
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

    guardarAceitesPendentes({
      perfil: "paciente",
      email,
      documentos: consentimentosDisponiveis.map(({ documento, versao }) => ({
        documento,
        versao
      }))
    });

    const sessionResult = await supabase.auth.getSession();
    const sessionUserId = sessionResult?.data?.session?.user?.id || resultadoCadastro?.user?.id || null;

    if (sessionResult?.data?.session?.user?.id) {
      await registrarAceitesDocumentos(supabase, {
        userId: sessionUserId,
        documentos: consentimentosDisponiveis.map(({ documento, versao }) => ({
          documento,
          versao
        }))
      });
    }

    if (conviteToken) {
      await registrarRespostaAoConviteAposCadastro({
        token: conviteToken,
        patientUserId: resultadoCadastro?.user?.id || null,
        patientEmail: email
      });
    }

    await registrarEvento({
      evento: "cadastro_paciente_sucesso",
      pagina: "cadastro_paciente",
      perfil: "paciente",
      userId: sessionUserId,
      email,
      contexto: {
        convite: Boolean(conviteToken)
      }
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
  try {
    await carregarConsentimentos();
  } catch (error) {
    console.error("Erro ao carregar documentos do cadastro de paciente:", error);
    mostrarMensagem(
      error.message || "Não foi possível carregar os documentos obrigatórios.",
      "error"
    );
    btnSubmit.disabled = true;
  }
  await validarConvite();
  aplicarContextoConviteNaTela();
}

inicializarCadastro();
