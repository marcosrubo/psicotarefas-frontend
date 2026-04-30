import supabase from "../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const professionalEmail = document.getElementById("professionalEmail");
  const professionalName = document.getElementById("professionalName");
  const professionalCouncil = document.getElementById("professionalCouncil");
  const professionalPhone = document.getElementById("professionalPhone");
  const defaultInteractionType = document.getElementById("defaultInteractionType");
  const defaultInteractionLimitField = document.getElementById("defaultInteractionLimitField");
  const defaultInteractionLimit = document.getElementById("defaultInteractionLimit");
  const profileForm = document.getElementById("profileForm");
  const screenMessage = document.getElementById("screenMessage");
  const formMessage = document.getElementById("formMessage");
  const btnCancelProfile = document.getElementById("btnCancelProfile");
  const btnSaveProfile = document.getElementById("btnSaveProfile");
  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");

  let currentUser = null;
  let currentProfile = null;

  function setScreenMessage(text = "", type = "error") {
    if (!screenMessage) return;

    if (!text) {
      screenMessage.hidden = true;
      screenMessage.textContent = "";
      screenMessage.className = "screen-message";
      return;
    }

    screenMessage.hidden = false;
    screenMessage.textContent = text;
    screenMessage.className = `screen-message screen-message--${type}`;
  }

  function setFormMessage(text = "", type = "error") {
    if (!formMessage) return;

    if (!text) {
      formMessage.hidden = true;
      formMessage.textContent = "";
      formMessage.className = "screen-message";
      return;
    }

    formMessage.hidden = false;
    formMessage.textContent = text;
    formMessage.className = `screen-message screen-message--${type}`;
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

  function normalizarTipoInteracao(value) {
    if (value === "limitado" || value === "ilimitado") return value;
    return "nao_permitir";
  }

  function normalizarLimiteInteracao(tipo, value) {
    if (tipo !== "limitado") return null;

    const numero = Number.parseInt(String(value || "1"), 10);
    return Number.isFinite(numero) && numero > 0 ? numero : 1;
  }

  function syncDefaultInteractionVisibility() {
    if (!defaultInteractionLimitField || !defaultInteractionType || !defaultInteractionLimit) return;

    const mostrarLimite = defaultInteractionType.value === "limitado";
    defaultInteractionLimitField.hidden = !mostrarLimite;
    defaultInteractionLimit.disabled = !mostrarLimite;

    if (!mostrarLimite) {
      defaultInteractionLimit.value = "";
    }
  }

  function fecharMenuInferior() {
    if (!bottomMenuPanel || !btnBottomMenu) return;
    bottomMenuPanel.hidden = true;
    btnBottomMenu.setAttribute("aria-expanded", "false");
  }

  function alternarMenuInferior() {
    if (!bottomMenuPanel || !btnBottomMenu) return;
    const vaiAbrir = bottomMenuPanel.hidden;
    bottomMenuPanel.hidden = !vaiAbrir;
    btnBottomMenu.setAttribute("aria-expanded", String(vaiAbrir));
  }

  function fecharTelaMeusDados() {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = "../profissional/index.html";
  }

  async function obterUsuarioAutenticado() {
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(`Falha ao obter sessão autenticada: ${sessionError.message}`);
    }

    if (session?.user) {
      return session.user;
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError) {
      throw new Error(`Falha ao obter usuário autenticado: ${userError.message}`);
    }

    return user || null;
  }

  async function validarProfissional() {
    const user = await obterUsuarioAutenticado();

    if (!user) {
      window.location.href = "../../auth/profissional-login/index.html";
      return false;
    }

    currentUser = user;

    const { data: perfil, error } = await supabase
      .from("perfis")
      .select("*")
      .eq("user_id", currentUser.id)
      .single();

    if (error) {
      throw new Error(`Falha ao carregar perfil do profissional: ${error.message}`);
    }

    if (!perfil || perfil.perfil !== "profissional") {
      window.location.href = "../../auth/profissional-login/index.html";
      return false;
    }

    currentProfile = perfil;

    await registrarAcessoPagina({
      pagina: "meus_dados_profissional",
      perfil: "profissional",
      userId: currentUser.id,
      email: perfil.email || currentUser.email || ""
    });

    return true;
  }

  function preencherFormulario() {
    if (!currentProfile) return;

    if (professionalEmail) {
      professionalEmail.value = currentProfile.email || currentUser?.email || "";
    }

    if (professionalName) {
      professionalName.value = currentProfile.nome || "";
    }

    if (professionalCouncil) {
      professionalCouncil.value =
        currentProfile.registro_conselho || "";
    }

    if (professionalPhone) {
      professionalPhone.value = formatarTelefone(currentProfile.telefone || "");
    }

    const tipoInteracao = normalizarTipoInteracao(currentProfile.tarefa_interacao_padrao_tipo);
    const limiteInteracao = normalizarLimiteInteracao(
      tipoInteracao,
      currentProfile.tarefa_interacao_padrao_limite
    );

    if (defaultInteractionType) {
      defaultInteractionType.value = tipoInteracao;
    }

    if (defaultInteractionLimit) {
      defaultInteractionLimit.value = limiteInteracao || "";
    }

    syncDefaultInteractionVisibility();
  }

  async function sairDoSistema() {
    await registrarEvento({
      evento: "logout",
      pagina: "meus_dados_profissional",
      perfil: "profissional",
      userId: currentUser?.id || null,
      email: currentProfile?.email || currentUser?.email || null
    });

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Erro ao sair:", error);
    }

    window.location.href = "../../auth/profissional-login/index.html";
  }

  async function salvarPerfil(event) {
    event.preventDefault();

    if (!currentUser || !currentProfile) {
      setFormMessage("Sessão inválida. Entre novamente.", "error");
      return;
    }

    const nome = professionalName?.value.trim() || "";
    const registro = professionalCouncil?.value.trim() || null;
    const telefoneFormatado = professionalPhone?.value.trim() || "";
    const telefone = telefoneFormatado ? formatarTelefone(telefoneFormatado) : null;
    const tipoInteracao = normalizarTipoInteracao(defaultInteractionType?.value);
    const limiteInteracao = normalizarLimiteInteracao(
      tipoInteracao,
      defaultInteractionLimit?.value
    );

    if (!nome) {
      setFormMessage("O nome é obrigatório.", "error");
      return;
    }

    if (tipoInteracao === "limitado" && !limiteInteracao) {
      setFormMessage("Informe o número de interações permitidas.", "error");
      return;
    }

    if (btnSaveProfile) {
      btnSaveProfile.disabled = true;
      btnSaveProfile.textContent = "Gravando...";
    }

    setFormMessage();

    const payloadCompleto = {
      nome,
      registro_conselho: registro,
      telefone,
      tarefa_interacao_padrao_tipo: tipoInteracao,
      tarefa_interacao_padrao_limite: limiteInteracao
    };

    try {
      const { error } = await supabase
        .from("perfis")
        .update(payloadCompleto)
        .eq("user_id", currentUser.id);

      if (error) {
        throw error;
      }

      currentProfile.nome = nome;
      currentProfile.registro_conselho = registro;
      currentProfile.telefone = telefone;
      currentProfile.tarefa_interacao_padrao_tipo = tipoInteracao;
      currentProfile.tarefa_interacao_padrao_limite = limiteInteracao;

      await registrarEvento({
        userId: currentUser.id,
        email: currentProfile.email || currentUser.email || "",
        perfil: "profissional",
        evento: "perfil_profissional_atualizado",
        pagina: "meus_dados_profissional"
      });

      setFormMessage();
      window.alert("Dados atualizados com sucesso.");
      fecharTelaMeusDados();
    } catch (error) {
      console.error("Erro ao atualizar dados do profissional:", error);
      setFormMessage("Não foi possível atualizar os dados.", "error");
    } finally {
      if (btnSaveProfile) {
        btnSaveProfile.disabled = false;
        btnSaveProfile.textContent = "Gravar";
      }
    }
  }

  if (professionalPhone) {
    professionalPhone.addEventListener("input", () => {
      professionalPhone.value = formatarTelefone(professionalPhone.value);
    });
  }

  if (defaultInteractionType) {
    defaultInteractionType.addEventListener("change", syncDefaultInteractionVisibility);
  }

  if (profileForm) {
    profileForm.addEventListener("submit", salvarPerfil);
  }

  if (btnCancelProfile) {
    btnCancelProfile.addEventListener("click", (event) => {
      event.preventDefault();
      fecharTelaMeusDados();
    });
  }

  if (btnBottomMenu) {
    btnBottomMenu.addEventListener("click", alternarMenuInferior);
  }

  if (btnMenuLogout) {
    btnMenuLogout.addEventListener("click", sairDoSistema);
  }

  document.addEventListener("click", (event) => {
    if (!bottomMenuPanel || !btnBottomMenu) return;

    const clicouDentroDoMenu = bottomMenuPanel.contains(event.target);
    const clicouNoBotao = btnBottomMenu.contains(event.target);

    if (!clicouDentroDoMenu && !clicouNoBotao) {
      fecharMenuInferior();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      fecharMenuInferior();
    }
  });

  async function iniciar() {
    setScreenMessage();
    setFormMessage();

    const ok = await validarProfissional();
    if (!ok) return;

    preencherFormulario();
  }

  iniciar().catch((error) => {
    console.error("Erro na tela meus-dados:", error);
    setScreenMessage(error.message || "Não foi possível carregar os dados do profissional.");
  });
});
