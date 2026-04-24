import supabase from "../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const professionalLine = document.getElementById("professionalLine");
  const screenMessage = document.getElementById("screenMessage");
  const btnToggleDefaultPolicy = document.getElementById("btnToggleDefaultPolicy");
  const defaultPolicySummaryValue = document.getElementById("defaultPolicySummaryValue");
  const defaultPolicyEditor = document.getElementById("defaultPolicyEditor");
  const defaultInteractionType = document.getElementById("defaultInteractionType");
  const defaultInteractionLimitGroup = document.getElementById("defaultInteractionLimitGroup");
  const defaultInteractionLimit = document.getElementById("defaultInteractionLimit");
  const defaultPolicyMessage = document.getElementById("defaultPolicyMessage");
  const btnCancelDefaultPolicy = document.getElementById("btnCancelDefaultPolicy");
  const btnSaveDefaultPolicy = document.getElementById("btnSaveDefaultPolicy");

  const patientsGrid = document.getElementById("patientsGrid");
  const patientsEmptyState = document.getElementById("patientsEmptyState");
  const patientsPanel = document.getElementById("patientsPanel");

  const tasksTitle = document.getElementById("tasksTitle");
  const tasksSubtitle = document.getElementById("tasksSubtitle");
  const tasksList = document.getElementById("tasksList");
  const tasksEmptyState = document.getElementById("tasksEmptyState");
  const tasksPanel = document.getElementById("tasksPanel");

  const btnNewTask = document.getElementById("btnNewTask");

  const aliasBox = document.getElementById("aliasBox");
  const patientAliasInput = document.getElementById("patientAliasInput");
  const btnCancelAlias = document.getElementById("btnCancelAlias");
  const btnSaveAlias = document.getElementById("btnSaveAlias");

  const taskFormCard = document.getElementById("taskFormCard");
  const taskFormTitle = document.getElementById("taskFormTitle");
  const btnOpenTaskBank = document.getElementById("btnOpenTaskBank");
  const btnUploadTaskPdf = document.getElementById("btnUploadTaskPdf");
  const taskPdfUploadInput = document.getElementById("taskPdfUploadInput");
  const taskBankBrowser = document.getElementById("taskBankBrowser");
  const taskBankThemes = document.getElementById("taskBankThemes");
  const taskBankList = document.getElementById("taskBankList");
  const taskBankEmptyState = document.getElementById("taskBankEmptyState");
  const btnCloseTaskBank = document.getElementById("btnCloseTaskBank");
  const selectedBankTaskBox = document.getElementById("selectedBankTaskBox");
  const selectedBankTaskLabel = document.getElementById("selectedBankTaskLabel");
  const selectedBankTaskTitle = document.getElementById("selectedBankTaskTitle");
  const selectedBankTaskMeta = document.getElementById("selectedBankTaskMeta");
  const btnOpenSelectedBankPdf = document.getElementById("btnOpenSelectedBankPdf");
  const btnClearSelectedBankTask = document.getElementById("btnClearSelectedBankTask");
  const taskTitleInput = document.getElementById("taskTitleInput");
  const taskDescriptionInput = document.getElementById("taskDescriptionInput");
  const taskInteractionTypeSelect = document.getElementById("taskInteractionTypeSelect");
  const taskInteractionLimitGroup = document.getElementById("taskInteractionLimitGroup");
  const taskInteractionLimitInput = document.getElementById("taskInteractionLimitInput");
  const btnToggleTaskAi = document.getElementById("btnToggleTaskAi");
  const taskAiBox = document.getElementById("taskAiBox");
  const taskAiAgeRange = document.getElementById("taskAiAgeRange");
  const taskAiGoal = document.getElementById("taskAiGoal");
  const taskAiTone = document.getElementById("taskAiTone");
  const taskAiEstimatedTime = document.getElementById("taskAiEstimatedTime");
  const taskAiFormat = document.getElementById("taskAiFormat");
  const taskAiFrequency = document.getElementById("taskAiFrequency");
  const taskAiContext = document.getElementById("taskAiContext");
  const taskAiObserveAfter = document.getElementById("taskAiObserveAfter");
  const taskAiPromptInput = document.getElementById("taskAiPromptInput");
  const btnGenerateTaskWithAi = document.getElementById("btnGenerateTaskWithAi");
  const btnCloseTaskAi = document.getElementById("btnCloseTaskAi");
  const taskAiMessage = document.getElementById("taskAiMessage");
  const taskAiPreview = document.getElementById("taskAiPreview");
  const taskAiPreviewTitle = document.getElementById("taskAiPreviewTitle");
  const taskAiPreviewSummary = document.getElementById("taskAiPreviewSummary");
  const taskAiPreviewContent = document.getElementById("taskAiPreviewContent");
  const btnCancelTask = document.getElementById("btnCancelTask");
  const btnCreateTask = document.getElementById("btnCreateTask");
  const taskFormMessage = document.getElementById("taskFormMessage");

  const selectedTaskBox = document.getElementById("selectedTaskBox");
  const selectedTaskName = document.getElementById("selectedTaskName");
  const selectedTaskDescription = document.getElementById("selectedTaskDescription");
  const selectedTaskCreatedAt = document.getElementById("selectedTaskCreatedAt");
  const selectedTaskPatient = document.getElementById("selectedTaskPatient");
  const selectedTaskPdfBox = document.getElementById("selectedTaskPdfBox");
  const selectedTaskPdfTitle = document.getElementById("selectedTaskPdfTitle");
  const selectedTaskPdfMeta = document.getElementById("selectedTaskPdfMeta");
  const btnOpenTaskPdf = document.getElementById("btnOpenTaskPdf");
  const btnEditTask = document.getElementById("btnEditTask");
  const interactionsDivider = document.getElementById("interactionsDivider");
  const interactionPanel = document.getElementById("interactionPanel");

  const interactionsEmptyState = document.getElementById("interactionsEmptyState");
  const interactionsList = document.getElementById("interactionsList");
  const interactionPolicyState = document.getElementById("interactionPolicyState");
  const mobileStepPatients = document.getElementById("mobileStepPatients");
  const mobileStepTasks = document.getElementById("mobileStepTasks");
  const mobileStepInteractions = document.getElementById("mobileStepInteractions");

  const interactionEditCard = document.getElementById("interactionEditCard");
  const interactionEditInput = document.getElementById("interactionEditInput");
  const interactionEditMessage = document.getElementById("interactionEditMessage");
  const btnCancelEditInteraction = document.getElementById("btnCancelEditInteraction");
  const btnSaveEditInteraction = document.getElementById("btnSaveEditInteraction");

  const interactionFormCard = document.getElementById("interactionFormCard");
  const interactionTextInput = document.getElementById("interactionTextInput");
  const interactionFormMessage = document.getElementById("interactionFormMessage");
  const btnClearInteraction = document.getElementById("btnClearInteraction");
  const btnCreateInteraction = document.getElementById("btnCreateInteraction");

  const PDF_BUCKET = "banco-tarefas-pdf";

  let currentUser = null;
  let currentProfile = null;
  let patients = [];
  let tasks = [];
  let bankThemes = [];
  let bankTasks = [];
  let interactionsByTask = new Map();
  let selectedPatientId = null;
  let selectedTaskId = null;
  let selectedBankThemeId = null;
  let selectedBankTask = null;
  let selectedCustomPdfFile = null;
  let selectedCustomPdfPreviewUrl = null;
  let taskFormMode = "create";
  let editingInteractionId = null;
  let mobileView = "patients";
  let autoRefreshTimer = null;
  let isRefreshingData = false;
  let lastGeneratedAiMaterial = null;
  let hasLoadedTaskBank = false;

  function normalizarTipoInteracao(valor) {
    if (valor === "limitado" || valor === "ilimitado") return valor;
    return "nao_permitir";
  }

  function normalizarLimiteInteracao(tipo, valor) {
    if (tipo !== "limitado") return null;

    const numero = Number.parseInt(String(valor || "1"), 10);
    return Number.isFinite(numero) && numero > 0 ? numero : 1;
  }

  function obterPadraoInteracaoDoProfissional() {
    const tipo = normalizarTipoInteracao(currentProfile?.tarefa_interacao_padrao_tipo);
    const limite = normalizarLimiteInteracao(tipo, currentProfile?.tarefa_interacao_padrao_limite);

    return { tipo, limite };
  }

  function obterConfiguracaoInteracaoDaTarefa(task) {
    const tipo = normalizarTipoInteracao(task?.interacao_paciente_tipo);
    const limite = normalizarLimiteInteracao(tipo, task?.interacao_paciente_limite);

    return { tipo, limite };
  }

  function contarInteracoesDaTarefa(taskId) {
    return getTaskInteractions(taskId).length;
  }

  function obterPermissaoInteracaoDaTarefa(task) {
    const { tipo, limite } = obterConfiguracaoInteracaoDaTarefa(task);
    const usadas = task ? contarInteracoesDaTarefa(task.id) : 0;

    if (tipo === "ilimitado") {
      return { tipo, limite, usadas, permitido: true, mensagem: "" };
    }

    if (tipo === "limitado") {
      const permitido = usadas < limite;
      return {
        tipo,
        limite,
        usadas,
        permitido,
        mensagem: permitido
          ? ""
          : `Esta tarefa já atingiu o limite de ${limite} interação(ões).`
      };
    }

    return {
      tipo,
      limite,
      usadas,
      permitido: false,
      mensagem: "Esta tarefa está configurada para não permitir interações."
    };
  }

  function obterResumoInteracaoPaciente(task) {
    const { tipo, limite } = obterConfiguracaoInteracaoDaTarefa(task);

    if (tipo === "ilimitado") return "Interações: Ilimitadas";
    if (tipo === "limitado") return `Interações: Permitir até ${limite}`;
    return "Interações: Não permitir";
  }

  function obterResumoPadraoInteracao(tipo, limite) {
    if (tipo === "ilimitado") return "Ilimitadas";
    if (tipo === "limitado") return `Permitir até [N]: ${limite}`;
    return "Não permitir";
  }

  function syncDefaultPolicyVisibility() {
    if (!defaultInteractionLimitGroup || !defaultInteractionType) return;
    defaultInteractionLimitGroup.hidden = defaultInteractionType.value !== "limitado";
  }

  function syncTaskPolicyVisibility() {
    if (!taskInteractionLimitGroup || !taskInteractionTypeSelect) return;
    taskInteractionLimitGroup.hidden = taskInteractionTypeSelect.value !== "limitado";
  }

  function aplicarPadraoProfissionalNaTela() {
    const { tipo, limite } = obterPadraoInteracaoDoProfissional();

    if (defaultInteractionType) {
      defaultInteractionType.value = tipo;
    }

    if (defaultInteractionLimit) {
      defaultInteractionLimit.value = String(limite || 1);
    }

    if (defaultPolicySummaryValue) {
      defaultPolicySummaryValue.textContent = obterResumoPadraoInteracao(tipo, limite || 1);
    }

    syncDefaultPolicyVisibility();
  }

  function closeDefaultPolicyEditor() {
    if (defaultPolicyEditor) {
      defaultPolicyEditor.hidden = true;
    }
    setDefaultPolicyMessage();
    aplicarPadraoProfissionalNaTela();
  }

  function openDefaultPolicyEditor() {
    if (defaultPolicyEditor) {
      defaultPolicyEditor.hidden = false;
    }
    aplicarPadraoProfissionalNaTela();
    setDefaultPolicyMessage();
  }

  function closeAliasBox() {
    if (aliasBox) {
      aliasBox.hidden = true;
    }
  }

  function openAliasBox() {
    const patient = getSelectedPatient();
    if (!patient || !aliasBox) return;

    aliasBox.hidden = false;

    if (patientAliasInput) {
      patientAliasInput.value = patient.alias;
      patientAliasInput.focus();
      patientAliasInput.select();
    }
  }

  function showScreenError(text) {
    if (!screenMessage) return;
    screenMessage.hidden = false;
    screenMessage.textContent = text;
  }

  function hideScreenError() {
    if (!screenMessage) return;
    screenMessage.hidden = true;
    screenMessage.textContent = "";
  }

  function setTaskFormMessage(text = "", type = "") {
    if (!taskFormMessage) return;

    taskFormMessage.textContent = text;
    taskFormMessage.className = "form-message";

    if (type) {
      taskFormMessage.classList.add(`form-message--${type}`);
      taskFormMessage.hidden = false;
    } else {
      taskFormMessage.hidden = true;
    }
  }

  function setTaskAiMessage(text = "", type = "") {
    if (!taskAiMessage) return;

    taskAiMessage.textContent = text;
    taskAiMessage.className = "form-message";

    if (type) {
      taskAiMessage.classList.add(`form-message--${type}`);
      taskAiMessage.hidden = false;
    } else {
      taskAiMessage.hidden = true;
    }
  }

  function setDefaultPolicyMessage(text = "", type = "") {
    if (!defaultPolicyMessage) return;

    defaultPolicyMessage.textContent = text;
    defaultPolicyMessage.className = "form-message";

    if (type) {
      defaultPolicyMessage.classList.add(`form-message--${type}`);
      defaultPolicyMessage.hidden = false;
    } else {
      defaultPolicyMessage.hidden = true;
    }
  }

  function setInteractionFormMessage(text = "", type = "") {
    if (!interactionFormMessage) return;

    interactionFormMessage.textContent = text;
    interactionFormMessage.className = "form-message";

    if (type) {
      interactionFormMessage.classList.add(`form-message--${type}`);
      interactionFormMessage.hidden = false;
    } else {
      interactionFormMessage.hidden = true;
    }
  }

  function setInteractionEditMessage(text = "", type = "") {
    if (!interactionEditMessage) return;

    interactionEditMessage.textContent = text;
    interactionEditMessage.className = "form-message";

    if (type) {
      interactionEditMessage.classList.add(`form-message--${type}`);
      interactionEditMessage.hidden = false;
    } else {
      interactionEditMessage.hidden = true;
    }
  }

  function getStatusLabel(status) {
    const map = {
      publicada: "Publicada",
      oculta: "Oculta",
      arquivada: "Arquivada",
      pendente: "Pendente"
    };

    return map[status] || status || "Sem status";
  }

  function slugifyFileName(value) {
    return String(value || "arquivo")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  }

  function getTaskMaterialInfo(task) {
    if (!task?.pdf_path) return null;

    if (task.origem_tipo === "banco" || task.origem_banco_tarefa_id) {
      return {
        tipo: "banco",
        label: "PDF do banco vinculado",
        meta: "Material do banco de tarefas disponível para consulta nesta tarefa."
      };
    }

    if (task.pdf_path.includes("/manual/")) {
      return {
        tipo: "manual",
        label: "PDF do profissional",
        meta: "Material exclusivo enviado pelo profissional para esta tarefa."
      };
    }

    return {
      tipo: "ia",
      label: "PDF gerado com IA",
      meta: "Material gerado por IA disponível para consulta nesta tarefa."
    };
  }

  function slugifyFileName(value) {
    return String(value || "arquivo")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  }

  function getTaskMaterialInfo(task) {
    if (!task?.pdf_path) return null;

    if (task.origem_tipo === "banco" || task.origem_banco_tarefa_id) {
      return {
        tipo: "banco",
        label: "PDF do banco vinculado",
        meta: "Material do banco de tarefas disponível para consulta nesta tarefa."
      };
    }

    if (task.pdf_path.includes("/manual/")) {
      return {
        tipo: "manual",
        label: "PDF do profissional",
        meta: "Material exclusivo enviado pelo profissional para esta tarefa."
      };
    }

    return {
      tipo: "ia",
      label: "PDF gerado com IA",
      meta: "Material gerado por IA disponível para consulta nesta tarefa."
    };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  async function abrirPdfDoBanco(pdfPath) {
    if (!pdfPath) return;

    try {
      const { data, error } = await supabase.storage
        .from(PDF_BUCKET)
        .createSignedUrl(pdfPath, 60);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "Não foi possível abrir o PDF.");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      window.alert(error.message || "Não foi possível abrir o PDF.");
    }
  }

  async function uploadCustomTaskPdf(file) {
    if (!currentUser?.id) {
      throw new Error("Sessão inválida para enviar o PDF.");
    }

    const baseName = file.name.replace(/\.pdf$/i, "") || "material";
    const safeBase = slugifyFileName(baseName) || "material";
    const fileName = `${Date.now()}-${safeBase}.pdf`;
    const storagePath = `${currentUser.id}/manual/${fileName}`;

    const { error } = await supabase.storage.from(PDF_BUCKET).upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: "application/pdf"
    });

    if (error) {
      throw new Error(`Não foi possível enviar o PDF: ${error.message}`);
    }

    return {
      pdfPath: storagePath,
      pdfName: file.name
    };
  }

  async function uploadCustomTaskPdf(file) {
    if (!currentUser?.id) {
      throw new Error("Sessão inválida para enviar o PDF.");
    }

    const baseName = file.name.replace(/\.pdf$/i, "") || "material";
    const safeBase = slugifyFileName(baseName) || "material";
    const fileName = `${Date.now()}-${safeBase}.pdf`;
    const storagePath = `${currentUser.id}/manual/${fileName}`;

    const { error } = await supabase.storage.from(PDF_BUCKET).upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: "application/pdf"
    });

    if (error) {
      throw new Error(`Não foi possível enviar o PDF: ${error.message}`);
    }

    return {
      pdfPath: storagePath,
      pdfName: file.name
    };
  }

  function getAiEndpoint() {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocal) {
      return "http://localhost:3000/api/ai/task-material-preview";
    }

    return "https://psicotarefas-backend.onrender.com/api/ai/task-material-preview";
  }

  function getAiPdfEndpoint() {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocal) {
      return "http://localhost:3000/api/ai/task-material-pdf";
    }

    return "https://psicotarefas-backend.onrender.com/api/ai/task-material-pdf";
  }

  function getSelectedOptionLabel(element) {
    if (!element) return "";
    const option = element.options?.[element.selectedIndex];
    return option?.value ? option.textContent.trim() : "";
  }

  function buildAiParameters() {
    return {
      age_range: getSelectedOptionLabel(taskAiAgeRange),
      goal: getSelectedOptionLabel(taskAiGoal),
      tone: getSelectedOptionLabel(taskAiTone),
      estimated_time: getSelectedOptionLabel(taskAiEstimatedTime),
      format: getSelectedOptionLabel(taskAiFormat),
      frequency: getSelectedOptionLabel(taskAiFrequency),
      context: getSelectedOptionLabel(taskAiContext),
      observe_after: taskAiObserveAfter?.value.trim() || ""
    };
  }

  function closeTaskAiBox() {
    if (taskAiBox) {
      taskAiBox.hidden = true;
    }

    if (btnToggleTaskAi) {
      btnToggleTaskAi.textContent = "Utilizar IA";
    }
  }

  function openTaskAiBox() {
    if (taskAiBox) {
      taskAiBox.hidden = false;
    }

    if (btnToggleTaskAi) {
      btnToggleTaskAi.textContent = "Ocultar IA";
    }
  }

  function toggleTaskAiBox() {
    if (!taskAiBox) return;

    if (taskAiBox.hidden) {
      openTaskAiBox();
    } else {
      closeTaskAiBox();
    }
  }

  async function carregarBancoDeTarefasDisponivel() {
    const [themesResponse, tasksResponse] = await Promise.all([
      supabase
        .from("banco_tarefas_temas")
        .select("id, nome, descricao_curta, ordem, ativo")
        .eq("ativo", true)
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true }),
      supabase
        .from("banco_tarefas_itens")
        .select("id, tema_id, titulo, descricao_curta, pdf_path, pdf_nome, autor_nome, status, ativo, created_at")
        .eq("ativo", true)
        .eq("status", "publicada")
        .order("created_at", { ascending: false })
    ]);

    if (themesResponse.error) {
      throw new Error(`Falha ao carregar temas do banco: ${themesResponse.error.message}`);
    }

    if (tasksResponse.error) {
      throw new Error(`Falha ao carregar tarefas do banco: ${tasksResponse.error.message}`);
    }

    const loadedTasks = tasksResponse.data || [];

    bankThemes = (themesResponse.data || []).map((theme) => ({
      ...theme,
      total: loadedTasks.filter((task) => task.tema_id === theme.id).length
    }));
    bankTasks = loadedTasks;

    if (!bankThemes.length) {
      selectedBankThemeId = null;
    } else if (!bankThemes.some((theme) => theme.id === selectedBankThemeId)) {
      selectedBankThemeId = bankThemes[0].id;
    }

    hasLoadedTaskBank = true;
  }

  function renderTaskBankThemes() {
    if (!taskBankThemes) return;

    if (!bankThemes.length) {
      taskBankThemes.innerHTML = `
        <div class="empty-state">
          Nenhum tema público disponível no banco ainda.
        </div>
      `;
      return;
    }

    taskBankThemes.innerHTML = bankThemes
      .map(
        (theme) => `
          <button
            class="task-bank-theme ${theme.id === selectedBankThemeId ? "is-active" : ""}"
            type="button"
            data-bank-theme-id="${theme.id}"
          >
            <div class="task-bank-theme__top">
              <h6>${escapeHtml(theme.nome)}</h6>
              <span class="patient-meta-chip">${theme.total} tarefa(s)</span>
            </div>
            <p>${escapeHtml(theme.descricao_curta || "Tema público colaborativo do banco de tarefas.")}</p>
          </button>
        `
      )
      .join("");
  }

  function renderTaskBankList() {
    if (!taskBankList || !taskBankEmptyState) return;

    const filteredTasks = bankTasks.filter((task) => task.tema_id === selectedBankThemeId);

    if (!filteredTasks.length) {
      taskBankList.innerHTML = "";
      taskBankEmptyState.hidden = false;
      return;
    }

    taskBankEmptyState.hidden = true;

    taskBankList.innerHTML = filteredTasks
      .map(
        (task) => `
          <article class="task-bank-item">
            <div class="task-bank-item__top">
              <h6>${escapeHtml(task.titulo)}</h6>
              <span class="patient-meta-chip">${escapeHtml(getStatusLabel(task.status))}</span>
            </div>
            <p class="task-bank-item__summary">${escapeHtml(task.descricao_curta || "Sem descrição curta informada.")}</p>
            <div class="task-bank-item__meta">
              <span class="patient-meta-chip">${escapeHtml(task.pdf_nome || "PDF sem nome")}</span>
              <span class="patient-meta-chip">${escapeHtml(task.autor_nome || "Profissional")}</span>
              <span class="patient-meta-chip">${escapeHtml(formatDateTime(task.created_at))}</span>
            </div>
            <div class="task-bank-browser__actions">
              <button
                class="btn-secondary btn-secondary--small"
                type="button"
                data-action="preview-bank-pdf"
                data-pdf-path="${escapeHtml(task.pdf_path)}"
              >
                Abrir PDF
              </button>
              <button
                class="btn-secondary btn-secondary--small"
                type="button"
                data-action="use-bank-task"
                data-bank-task-id="${task.id}"
              >
                Usar esta tarefa
              </button>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderSelectedBankTaskSummary() {
    if (
      !selectedBankTaskBox ||
      !selectedBankTaskLabel ||
      !selectedBankTaskTitle ||
      !selectedBankTaskMeta
    ) {
      return;
    }

    if (!selectedBankTask && !selectedCustomPdfFile) {
      selectedBankTaskBox.hidden = true;
      return;
    }

    if (selectedCustomPdfFile) {
      selectedBankTaskLabel.textContent = "PDF próprio do profissional";
      selectedBankTaskTitle.textContent = selectedCustomPdfFile.name || "PDF carregado";
      selectedBankTaskMeta.textContent = "Material exclusivo que será vinculado apenas a esta tarefa.";
      selectedBankTaskBox.hidden = false;
      return;
    }

    selectedBankTaskLabel.textContent = "PDF do banco vinculado";
    selectedBankTaskTitle.textContent = selectedBankTask.titulo || "Tarefa da biblioteca";
    selectedBankTaskMeta.textContent = `${selectedBankTask.pdf_nome || "PDF sem nome"} · ${selectedBankTask.autor_nome || "Profissional"}`;
    selectedBankTaskBox.hidden = false;
  }

  function renderTaskBankBrowser() {
    renderTaskBankThemes();
    renderTaskBankList();
    renderSelectedBankTaskSummary();
  }

  function clearSelectedBankTask(options = {}) {
    const shouldClearFields = options.clearFields !== false;

    selectedBankTask = null;

    if (shouldClearFields && taskFormMode === "create") {
      if (taskTitleInput) taskTitleInput.value = "";
      if (taskDescriptionInput) taskDescriptionInput.value = "";
    }

    renderSelectedBankTaskSummary();
  }

  function clearSelectedCustomPdf() {
    selectedCustomPdfFile = null;

    if (selectedCustomPdfPreviewUrl) {
      URL.revokeObjectURL(selectedCustomPdfPreviewUrl);
      selectedCustomPdfPreviewUrl = null;
    }

    if (taskPdfUploadInput) {
      taskPdfUploadInput.value = "";
    }

    renderSelectedBankTaskSummary();
  }

  function applyBankTaskToForm(bankTask) {
    if (!bankTask) return;

    clearSelectedCustomPdf();
    selectedBankTask = bankTask;

    if (taskFormMode === "create") {
      if (taskTitleInput) taskTitleInput.value = bankTask.titulo || "";
      if (taskDescriptionInput) {
        taskDescriptionInput.value = bankTask.descricao_curta || "";
      }
    }

    closeTaskBankBrowser();
    renderSelectedBankTaskSummary();
    setTaskFormMessage("Tarefa do banco vinculada ao formulário atual.", "success");
  }

  function applyCustomPdfToForm(file) {
    if (!file) return;

    clearSelectedBankTask({ clearFields: false });

    if (selectedCustomPdfPreviewUrl) {
      URL.revokeObjectURL(selectedCustomPdfPreviewUrl);
    }

    selectedCustomPdfFile = file;
    selectedCustomPdfPreviewUrl = URL.createObjectURL(file);
    renderSelectedBankTaskSummary();
    setTaskFormMessage("PDF próprio vinculado ao formulário atual.", "success");
  }

  async function openTaskBankBrowser() {
    if (!taskBankBrowser) return;

    setTaskFormMessage();

    if (!hasLoadedTaskBank) {
      try {
        await carregarBancoDeTarefasDisponivel();
      } catch (error) {
        setTaskFormMessage(error.message || "Não foi possível carregar o banco de tarefas.", "error");
        return;
      }
    }

    renderTaskBankBrowser();
    taskBankBrowser.hidden = false;
  }

  function closeTaskBankBrowser() {
    if (taskBankBrowser) {
      taskBankBrowser.hidden = true;
    }
  }

  function renderAiPreviewSection(title, bodyHtml) {
    return `
      <section class="ia-task-preview__section">
        <h6>${escapeHtml(title)}</h6>
        ${bodyHtml}
      </section>
    `;
  }

  function renderAiPreview(material) {
    if (!taskAiPreview || !taskAiPreviewContent || !taskAiPreviewTitle || !taskAiPreviewSummary) {
      return;
    }

    if (!material) {
      taskAiPreview.hidden = true;
      taskAiPreviewContent.innerHTML = "";
      taskAiPreviewTitle.textContent = "Prévia da tarefa com IA";
      taskAiPreviewSummary.textContent =
        "Material inicial gerado a partir do título, descrição e instruções complementares.";
      return;
    }

    const sections = [];

    if (material.objective) {
      sections.push(renderAiPreviewSection("Objetivo", `<p>${escapeHtml(material.objective)}</p>`));
    }

    if (Array.isArray(material.instructions) && material.instructions.length) {
      sections.push(
        renderAiPreviewSection(
          "Como aplicar",
          `<ul>${material.instructions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
        )
      );
    }

    if (Array.isArray(material.reflection_questions) && material.reflection_questions.length) {
      sections.push(
        renderAiPreviewSection(
          "Perguntas guiadas",
          `<ul>${material.reflection_questions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
        )
      );
    }

    if (material.closing_message) {
      sections.push(
        renderAiPreviewSection(
          "Fechamento",
          `<p>${escapeHtml(material.closing_message)}</p>`
        )
      );
    }

    if (!sections.length && material.raw_text) {
      sections.push(renderAiPreviewSection("Conteúdo gerado", `<p>${escapeHtml(material.raw_text)}</p>`));
    }

    taskAiPreviewTitle.textContent = material.title || "Prévia da tarefa com IA";
    taskAiPreviewSummary.textContent =
      material.summary ||
      "Material inicial gerado a partir do título, descrição e instruções complementares.";
    taskAiPreviewContent.innerHTML = sections.join("");
    taskAiPreview.hidden = false;
  }

  async function gerarMaterialComIa() {
    const titulo = taskTitleInput?.value.trim() || "";
    const descricao = taskDescriptionInput?.value.trim() || "";
    const promptComplementar = taskAiPromptInput?.value.trim() || "";
    const parameters = buildAiParameters();

    if (!titulo) {
      setTaskAiMessage("Informe o título antes de gerar com IA.", "error");
      return;
    }

    if (!descricao) {
      setTaskAiMessage("Informe a descrição antes de gerar com IA.", "error");
      return;
    }

    if (!btnGenerateTaskWithAi) return;

    btnGenerateTaskWithAi.disabled = true;
    btnGenerateTaskWithAi.textContent = "Gerando...";
    setTaskAiMessage();

    try {
      const response = await fetch(getAiEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title: titulo,
          description: descricao,
          promptComplement: promptComplementar,
          parameters
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          data?.error || "Não foi possível gerar o material com IA neste momento."
        );
      }

      lastGeneratedAiMaterial = data?.material || null;
      renderAiPreview(lastGeneratedAiMaterial);
      setTaskAiMessage("Prévia gerada com sucesso.", "success");
      registrarEvento({
        userId: currentUser?.id,
        email: currentProfile?.email || currentUser?.email || "",
        perfil: "profissional",
        evento: "previa_ia_gerada",
        pagina: "gestao_tarefas",
        contexto: {
          paciente_id: selectedPatientId,
          titulo,
          objetivo_ia: parameters.goal || null,
          formato_ia: parameters.format || null
        }
      });
    } catch (error) {
      renderAiPreview(null);
      setTaskAiMessage(error.message || "Erro ao gerar material com IA.", "error");
    } finally {
      btnGenerateTaskWithAi.disabled = false;
      btnGenerateTaskWithAi.textContent = "Gerar com IA";
    }
  }

  async function gerarPdfDaPreviaComIa({ title, description, patientName, professionalName }) {
    if (!lastGeneratedAiMaterial) {
      return null;
    }

    const response = await fetch(getAiPdfEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: currentUser?.id,
        title,
        description,
        material: lastGeneratedAiMaterial,
        patientName,
        professionalName
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(
        data?.error || "Não foi possível gerar o PDF da prévia com IA."
      );
    }

    return {
      pdfPath: data?.pdfPath || null,
      pdfName: data?.pdfName || null
    };
  }

  function formatDateTime(value) {
    if (!value) return "-";

    return new Date(value).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function isMobileLayout() {
    return window.innerWidth < 768;
  }

  function renderMobileFlowIndicator() {
    if (!mobileStepPatients || !mobileStepTasks || !mobileStepInteractions) return;

    mobileStepPatients.classList.toggle("mobile-flow-step--active", mobileView === "patients");
    mobileStepTasks.classList.toggle("mobile-flow-step--active", mobileView === "tasks");
    mobileStepInteractions.classList.toggle("mobile-flow-step--active", mobileView === "interactions");

    mobileStepTasks.disabled = !selectedPatientId;
    mobileStepInteractions.disabled = !selectedTaskId;
  }

  function setMobileView(nextView) {
    mobileView = nextView;

    if (isMobileLayout()) {
      document.body.setAttribute("data-mobile-view", nextView);
    } else {
      document.body.removeAttribute("data-mobile-view");
    }

    renderMobileFlowIndicator();
  }

  function syncMobileViewWithSelection() {
    if (!isMobileLayout()) {
      document.body.removeAttribute("data-mobile-view");
      renderMobileFlowIndicator();
      return;
    }

    if (selectedTaskId) {
      setMobileView("interactions");
      return;
    }

    if (selectedPatientId) {
      setMobileView("tasks");
      return;
    }

    setMobileView("patients");
  }

  function getSelectedPatient() {
    return patients.find((patient) => patient.patient_user_id === selectedPatientId) || null;
  }

  function getSelectedTask() {
    return tasks.find((task) => task.id === selectedTaskId) || null;
  }

  function getTasksOfSelectedPatient() {
    if (!selectedPatientId) return [];
    return tasks.filter((task) => task.patient_user_id === selectedPatientId);
  }

  function getTaskInteractions(taskId) {
    return interactionsByTask.get(taskId) || [];
  }

  function getEditingInteraction() {
    if (!editingInteractionId) return null;

    for (const list of interactionsByTask.values()) {
      const interaction = list.find((item) => item.id === editingInteractionId);
      if (interaction) return interaction;
    }

    return null;
  }

  function getTaskStatus(task) {
    if (!task) {
      return {
        label: "Sem tarefa",
        className: "task-status-chip task-status-chip--muted"
      };
    }

    if (normalizarTipoInteracao(task.interacao_paciente_tipo) === "nao_permitir") {
      return {
        label: "Sem interação",
        className: "task-status-chip task-status-chip--muted"
      };
    }

    if (task.status === "encerrada") {
      return {
        label: "Encerrada",
        className: "task-status-chip task-status-chip--closed"
      };
    }

    const interactions = getTaskInteractions(task.id);
    const lastInteraction = interactions[interactions.length - 1];

    if (!lastInteraction || lastInteraction.autor_tipo === "profissional") {
      return {
        label: "Aguardando paciente",
        className: "task-status-chip task-status-chip--waiting-patient"
      };
    }

    return {
      label: "Aguardando profissional",
      className: "task-status-chip task-status-chip--waiting-professional"
    };
  }

  function esperar(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  async function obterUsuarioAutenticado() {
    for (let tentativa = 0; tentativa < 2; tentativa += 1) {
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

      if (tentativa === 0) {
        await esperar(180);
      }
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
      .select("nome, email, perfil, tarefa_interacao_padrao_tipo, tarefa_interacao_padrao_limite")
      .eq("user_id", currentUser.id)
      .single();

    if (error) {
      throw new Error(`Falha ao carregar perfil do profissional: ${error.message}`);
    }

    if (!perfil || perfil.perfil !== "profissional") {
      await supabase.auth.signOut();
      window.location.href = "../../auth/profissional-login/index.html";
      return false;
    }

    currentProfile = perfil;
    registrarAcessoPagina({
      pagina: "gestao_tarefas",
      perfil: "profissional",
      userId: currentUser.id,
      email: currentProfile.email || currentUser.email || ""
    });
    return true;
  }

  function renderProfessionalName() {
    if (!professionalLine) return;

    const nome =
      currentProfile?.nome ||
      currentProfile?.email ||
      "Profissional";

    professionalLine.textContent = `PROFISSIONAL: ${nome}`;
  }

  function resetTaskForm() {
    taskFormMode = "create";

    if (taskFormTitle) {
      taskFormTitle.textContent = "Nova tarefa";
    }

    if (btnCreateTask) {
      btnCreateTask.textContent = "Criar tarefa";
    }

    if (taskTitleInput) taskTitleInput.value = "";
    if (taskDescriptionInput) taskDescriptionInput.value = "";
    if (taskAiAgeRange) taskAiAgeRange.value = "";
    if (taskAiGoal) taskAiGoal.value = "";
    if (taskAiTone) taskAiTone.value = "";
    if (taskAiEstimatedTime) taskAiEstimatedTime.value = "";
    if (taskAiFormat) taskAiFormat.value = "";
    if (taskAiFrequency) taskAiFrequency.value = "";
    if (taskAiContext) taskAiContext.value = "";
    if (taskAiObserveAfter) taskAiObserveAfter.value = "";
    if (taskAiPromptInput) taskAiPromptInput.value = "";
    const padrao = obterPadraoInteracaoDoProfissional();
    if (taskInteractionTypeSelect) {
      taskInteractionTypeSelect.value = padrao.tipo;
    }
    if (taskInteractionLimitInput) {
      taskInteractionLimitInput.value = String(padrao.limite || 1);
    }
    syncTaskPolicyVisibility();
    setTaskFormMessage();
    setTaskAiMessage();
    lastGeneratedAiMaterial = null;
    clearSelectedBankTask({ clearFields: false });
    clearSelectedCustomPdf();
    renderAiPreview(null);
    closeTaskBankBrowser();
    closeTaskAiBox();
  }

  function openTaskFormForCreate() {
    if (!taskFormCard) return;

    resetTaskForm();
    if (btnOpenTaskBank) btnOpenTaskBank.hidden = false;
    if (btnUploadTaskPdf) btnUploadTaskPdf.hidden = false;
    taskFormCard.hidden = false;
    selectedTaskId = null;
    renderInteractionArea();

    if (taskTitleInput) {
      taskTitleInput.focus();
    }
  }

  function openTaskFormForEdit() {
    const task = getSelectedTask();
    if (!task || !taskFormCard) return;

    taskFormMode = "edit";

    if (taskFormTitle) {
      taskFormTitle.textContent = "Alterar tarefa";
    }

    if (btnCreateTask) {
      btnCreateTask.textContent = "Salvar alteração";
    }

    if (taskTitleInput) taskTitleInput.value = task.titulo || "";
    if (taskDescriptionInput) taskDescriptionInput.value = task.descricao || "";
    if (taskAiAgeRange) taskAiAgeRange.value = "";
    if (taskAiGoal) taskAiGoal.value = "";
    if (taskAiTone) taskAiTone.value = "";
    if (taskAiEstimatedTime) taskAiEstimatedTime.value = "";
    if (taskAiFormat) taskAiFormat.value = "";
    if (taskAiFrequency) taskAiFrequency.value = "";
    if (taskAiContext) taskAiContext.value = "";
    if (taskAiObserveAfter) taskAiObserveAfter.value = "";
    if (taskAiPromptInput) taskAiPromptInput.value = "";
    const configuracao = obterConfiguracaoInteracaoDaTarefa(task);
    if (taskInteractionTypeSelect) {
      taskInteractionTypeSelect.value = configuracao.tipo;
    }
    if (taskInteractionLimitInput) {
      taskInteractionLimitInput.value = String(configuracao.limite || 1);
    }
    syncTaskPolicyVisibility();
    setTaskFormMessage();
    setTaskAiMessage();
    lastGeneratedAiMaterial = null;
    clearSelectedBankTask({ clearFields: false });
    clearSelectedCustomPdf();
    renderAiPreview(null);
    closeTaskBankBrowser();
    if (btnOpenTaskBank) btnOpenTaskBank.hidden = true;
    if (btnUploadTaskPdf) btnUploadTaskPdf.hidden = true;
    taskFormCard.hidden = false;

    if (taskTitleInput) {
      taskTitleInput.focus();
      taskTitleInput.select();
    }
  }

  function closeTaskForm() {
    if (taskFormCard) {
      taskFormCard.hidden = true;
    }

    if (btnOpenTaskBank) btnOpenTaskBank.hidden = false;
    if (btnUploadTaskPdf) btnUploadTaskPdf.hidden = false;
    resetTaskForm();
    renderInteractionArea();
  }

  function closeInteractionEditCard() {
    editingInteractionId = null;

    if (interactionEditCard) {
      interactionEditCard.hidden = true;
    }

    if (interactionEditInput) {
      interactionEditInput.value = "";
    }

    setInteractionEditMessage();
  }

  function openInteractionEditCard(interactionId) {
    const interaction = getTaskInteractions(selectedTaskId).find((item) => item.id === interactionId);
    if (
      !interaction ||
      interaction.autor_tipo !== "profissional" ||
      interaction.autor_user_id !== currentUser?.id
    ) {
      return;
    }

    editingInteractionId = interactionId;

    if (interactionEditInput) {
      interactionEditInput.value = interaction.mensagem || "";
      interactionEditInput.focus();
      interactionEditInput.select();
    }

    if (interactionEditCard) {
      interactionEditCard.hidden = false;
    }

    setInteractionEditMessage();
  }

  async function carregarPacientes() {
    const { data, error } = await supabase.rpc("listar_pacientes_vinculados_profissional");

    if (error) {
      throw new Error(`Falha ao carregar pacientes vinculados: ${error.message}`);
    }

    patients = (data || []).map((item) => {
      const nomeCompleto =
        item.patient_name?.trim() ||
        item.patient_email?.trim() ||
        "Paciente";

      return {
        vinculo_id: item.vinculo_id,
        patient_user_id: item.patient_user_id,
        alias: item.patient_alias || nomeCompleto,
        nome_real: nomeCompleto,
        email: item.patient_email || "",
        created_at: item.created_at
      };
    });
  }

  async function carregarTarefas() {
    const { data: tarefasData, error } = await supabase
      .from("tarefas")
      .select("*")
      .eq("professional_user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Falha ao carregar tarefas: ${error.message}`);
    }

    tasks = tarefasData || [];
    interactionsByTask = new Map();

    const taskIds = tasks.map((task) => task.id);
    if (!taskIds.length) return;

    const { data: interactions, error: interactionsError } = await supabase
      .from("tarefa_interacoes")
      .select("*")
      .in("tarefa_id", taskIds)
      .order("created_at", { ascending: true });

    if (interactionsError) {
      throw new Error(`Falha ao carregar interações das tarefas: ${interactionsError.message}`);
    }

    (interactions || []).forEach((interaction) => {
      const current = interactionsByTask.get(interaction.tarefa_id) || [];
      current.push(interaction);
      interactionsByTask.set(interaction.tarefa_id, current);
    });
  }

  function renderPatients() {
    if (!patientsGrid || !patientsEmptyState) return;

    if (!patients.length) {
      patientsGrid.innerHTML = "";
      patientsEmptyState.hidden = false;
      return;
    }

    patientsEmptyState.hidden = true;

    patientsGrid.innerHTML = patients
      .map((patient) => {
        const isActive = patient.patient_user_id === selectedPatientId ? "is-active" : "";
        const patientTasks = tasks.filter((task) => task.patient_user_id === patient.patient_user_id);
        const activeTasksCount = patientTasks.filter((task) => task.status !== "encerrada").length;

        return `
          <article class="patient-card ${isActive}" data-patient-id="${patient.patient_user_id}">
            <div class="patient-card__top">
              <h4 class="patient-card__alias">${escapeHtml(patient.alias)}</h4>
              <button
                class="btn-secondary btn-secondary--small patient-card__edit-btn"
                type="button"
                data-action="edit-alias"
                data-patient-id="${patient.patient_user_id}"
              >
                Alterar apelido
              </button>
            </div>
            <p class="patient-card__name">${escapeHtml(patient.nome_real)}</p>
            <p class="patient-card__email">${escapeHtml(patient.email || "E-mail não informado")}</p>
            <div class="patient-card__meta">
              <span class="patient-meta-chip">Vínculo ativo</span>
              <span class="patient-meta-chip">${activeTasksCount} tarefa(s)</span>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderTasksArea() {
    const patient = getSelectedPatient();
    const patientTasks = getTasksOfSelectedPatient();

    if (
      !tasksTitle ||
      !tasksSubtitle ||
      !tasksList ||
      !tasksEmptyState ||
      !btnNewTask ||
      !aliasBox ||
      !taskFormCard
    ) {
      return;
    }

    if (!patient) {
      tasksTitle.textContent = "Tarefas do paciente";
      tasksSubtitle.textContent = "Selecione um paciente para começar.";
      tasksList.innerHTML = "";
      tasksEmptyState.hidden = false;
      tasksEmptyState.textContent = "Selecione um paciente para visualizar as tarefas.";
      btnNewTask.disabled = true;
      closeAliasBox();
      closeTaskForm();
      return;
    }

    tasksTitle.textContent = `Tarefas de ${patient.alias}`;
    tasksSubtitle.textContent = patient.nome_real;
    btnNewTask.disabled = false;

    if (!patientTasks.length) {
      tasksList.innerHTML = "";
      tasksEmptyState.hidden = false;
      tasksEmptyState.textContent = "Nenhuma tarefa criada para este paciente.";
      return;
    }

    tasksEmptyState.hidden = true;

    tasksList.innerHTML = patientTasks
      .map((task) => {
        const status = getTaskStatus(task);
        const isActive = task.id === selectedTaskId ? "is-active" : "";
        const material = getTaskMaterialInfo(task);

        return `
          <article class="task-card ${isActive}" data-task-id="${task.id}">
            <div class="task-card__top">
              <h4 class="task-card__title">${escapeHtml(task.titulo)}</h4>
              <span class="${status.className}">${status.label}</span>
            </div>
            <p class="task-card__description">${escapeHtml(task.descricao)}</p>
            <div class="task-card__meta">
              <span>Criada em ${escapeHtml(formatDateTime(task.created_at))}</span>
              <span>${escapeHtml(obterResumoInteracaoPaciente(task))}</span>
              <span>${getTaskInteractions(task.id).length} interação(ões)</span>
              ${material ? `<span>${escapeHtml(material.label)}</span>` : ""}
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderInteractionArea() {
    const task = getSelectedTask();
    const patient = getSelectedPatient();

    if (
      !selectedTaskBox ||
      !interactionsEmptyState ||
      !interactionsList ||
      !interactionFormCard
    ) {
      return;
    }

    if (!task) {
      selectedTaskBox.hidden = true;
      if (interactionsDivider) interactionsDivider.hidden = true;
      interactionsList.innerHTML = "";
      interactionsEmptyState.hidden = false;
      interactionsEmptyState.textContent = "Selecione uma tarefa para visualizar as interações.";
      if (interactionPolicyState) interactionPolicyState.hidden = true;
      if (selectedTaskPdfBox) selectedTaskPdfBox.hidden = true;
      interactionFormCard.hidden = true;
      setInteractionFormMessage();
      return;
    }

    const status = getTaskStatus(task);
    const interactions = getTaskInteractions(task.id);
    const permissaoInteracao = obterPermissaoInteracaoDaTarefa(task);
    const material = getTaskMaterialInfo(task);

    selectedTaskBox.hidden = false;
    if (selectedTaskName) selectedTaskName.textContent = `TAREFA: ${task.titulo}`;
    if (selectedTaskDescription) {
      selectedTaskDescription.textContent = `${task.descricao}\n\n${obterResumoInteracaoPaciente(task)}`;
    }
    if (selectedTaskCreatedAt) selectedTaskCreatedAt.textContent = `Criada em ${formatDateTime(task.created_at)}`;
    if (selectedTaskPatient) selectedTaskPatient.textContent = `Paciente: ${patient ? patient.nome_real : "-"}`;
    if (btnEditTask) btnEditTask.hidden = false;
    if (selectedTaskPdfBox && selectedTaskPdfTitle && selectedTaskPdfMeta) {
      if (task.pdf_path && material) {
        selectedTaskPdfTitle.textContent = task.pdf_nome || material.label;
        selectedTaskPdfMeta.textContent = material.meta;
        selectedTaskPdfBox.hidden = false;
      } else {
        selectedTaskPdfBox.hidden = true;
      }
    }
    if (interactionsDivider) interactionsDivider.hidden = false;

    if (!interactions.length) {
      interactionsList.innerHTML = "";
      interactionsEmptyState.hidden = false;
      interactionsEmptyState.textContent = "Nenhuma interação registrada para esta tarefa.";
    } else {
      interactionsEmptyState.hidden = true;

      interactionsList.innerHTML = interactions
        .map((interaction) => {
          const isProfissional = interaction.autor_tipo === "profissional";
          const cssClass = isProfissional
            ? "interaction-item interaction-item--profissional"
            : "interaction-item interaction-item--paciente";

          return `
            <article class="${cssClass}">
              <div class="interaction-item__top">
                <div class="interaction-item__header">
                  <strong class="interaction-item__author">${isProfissional ? "Profissional" : "Paciente"}</strong>
                </div>
                <span class="interaction-item__time">${formatDateTime(interaction.created_at)}</span>
              </div>
              <p class="interaction-item__text">${escapeHtml(interaction.mensagem)}</p>
              ${
                isProfissional && interaction.autor_user_id === currentUser?.id
                  ? `
                    <div class="interaction-item__actions">
                      <button
                        class="btn-secondary btn-secondary--small"
                        type="button"
                        data-edit-interaction-id="${interaction.id}"
                      >
                        Alterar interação
                      </button>
                    </div>
                  `
                  : ""
              }
            </article>
          `;
        })
        .join("");
    }

    if (interactionPolicyState) {
      if (!permissaoInteracao.permitido) {
        interactionPolicyState.hidden = false;
        interactionPolicyState.textContent = permissaoInteracao.mensagem;
      } else {
        interactionPolicyState.hidden = true;
        interactionPolicyState.textContent = "";
      }
    }

    interactionFormCard.hidden = !permissaoInteracao.permitido;
  }

  async function salvarApelidoPaciente() {
    const patient = getSelectedPatient();
    const alias = patientAliasInput?.value.trim() || "";

    if (!patient || !btnSaveAlias) return;

    btnSaveAlias.disabled = true;

    try {
      const { error } = await supabase
        .from("vinculos")
        .update({
          patient_alias: alias || patient.nome_real
        })
        .eq("id", patient.vinculo_id)
        .eq("professional_user_id", currentUser.id);

      if (error) {
        throw new Error(`Não foi possível salvar o apelido: ${error.message}`);
      }

      patient.alias = alias || patient.nome_real;
      closeAliasBox();
      renderPatients();
      renderTasksArea();
      renderInteractionArea();
      registrarEvento({
        userId: currentUser?.id,
        email: currentProfile?.email || currentUser?.email || "",
        perfil: "profissional",
        evento: "apelido_paciente_atualizado",
        pagina: "gestao_tarefas",
        contexto: {
          paciente_id: patient.patient_user_id,
          vinculo_id: patient.vinculo_id
        }
      });
    } catch (error) {
      window.alert(error.message || "Erro ao salvar o apelido.");
    } finally {
      btnSaveAlias.disabled = false;
    }
  }

  async function salvarPadraoProfissional() {
    if (!currentUser || !btnSaveDefaultPolicy || !defaultInteractionType) return;

    const tipo = normalizarTipoInteracao(defaultInteractionType.value);
    const limite = normalizarLimiteInteracao(tipo, defaultInteractionLimit?.value);

    btnSaveDefaultPolicy.disabled = true;
    setDefaultPolicyMessage();

    try {
      const { error } = await supabase
        .from("perfis")
        .update({
          tarefa_interacao_padrao_tipo: tipo,
          tarefa_interacao_padrao_limite: limite
        })
        .eq("user_id", currentUser.id);

      if (error) {
        throw new Error(`Não foi possível salvar o padrão: ${error.message}`);
      }

      currentProfile = {
        ...currentProfile,
        tarefa_interacao_padrao_tipo: tipo,
        tarefa_interacao_padrao_limite: limite
      };

      aplicarPadraoProfissionalNaTela();
      closeDefaultPolicyEditor();
      registrarEvento({
        userId: currentUser?.id,
        email: currentProfile?.email || currentUser?.email || "",
        perfil: "profissional",
        evento: "padrao_interacao_atualizado",
        pagina: "gestao_tarefas",
        contexto: {
          tipo,
          limite
        }
      });
    } catch (error) {
      setDefaultPolicyMessage(error.message || "Erro ao salvar padrão.", "error");
    } finally {
      btnSaveDefaultPolicy.disabled = false;
    }
  }

  async function criarTarefa() {
    const patient = getSelectedPatient();
    const titulo = taskTitleInput?.value.trim() || "";
    const descricao = taskDescriptionInput?.value.trim() || "";
    const interacaoTipo = normalizarTipoInteracao(taskInteractionTypeSelect?.value);
    const interacaoLimite = normalizarLimiteInteracao(interacaoTipo, taskInteractionLimitInput?.value);

    if (!patient) {
      setTaskFormMessage("Selecione um paciente antes de criar a tarefa.", "error");
      return;
    }

    if (!titulo) {
      setTaskFormMessage("Informe o título da tarefa.", "error");
      return;
    }

    if (!descricao) {
      setTaskFormMessage("Informe a descrição da tarefa.", "error");
      return;
    }

    if (btnCreateTask) btnCreateTask.disabled = true;
    const previousButtonText = btnCreateTask?.textContent || "Criar tarefa";
    if (btnCreateTask) {
      btnCreateTask.textContent = lastGeneratedAiMaterial && !selectedBankTask
        ? "Gerando PDF..."
        : "Criando...";
    }
    setTaskFormMessage();

    try {
      let linkedPdf = null;

      if (selectedBankTask) {
        linkedPdf = {
          pdfPath: selectedBankTask.pdf_path || null,
          pdfName: selectedBankTask.pdf_nome || null
        };
      } else if (selectedCustomPdfFile) {
        linkedPdf = await uploadCustomTaskPdf(selectedCustomPdfFile);
      } else if (lastGeneratedAiMaterial) {
        linkedPdf = await gerarPdfDaPreviaComIa({
          title: titulo,
          description: descricao,
          patientName: patient.alias || patient.nome_real,
          professionalName: currentProfile?.nome || currentProfile?.email || "Profissional"
        });
      }

      const payload = {
        professional_user_id: currentUser.id,
        patient_user_id: patient.patient_user_id,
        vinculo_id: patient.vinculo_id,
        titulo,
        descricao,
        status: "aberta",
        interacao_paciente_tipo: interacaoTipo,
        interacao_paciente_limite: interacaoLimite
      };

      if (selectedBankTask) {
        payload.origem_tipo = "banco";
        payload.origem_banco_tarefa_id = selectedBankTask.id;
      }

      if (linkedPdf?.pdfPath) {
        payload.pdf_path = linkedPdf.pdfPath;
        payload.pdf_nome = linkedPdf.pdfName || null;
      }

      const { data: novaTarefa, error } = await supabase
        .from("tarefas")
        .insert(payload)
        .select()
        .single();

      if (error || !novaTarefa) {
        throw new Error("Não foi possível criar a tarefa.");
      }

      if (taskTitleInput) taskTitleInput.value = "";
      if (taskDescriptionInput) taskDescriptionInput.value = "";
      if (taskFormCard) taskFormCard.hidden = true;

      await carregarTarefas();
      selectedTaskId = novaTarefa.id;
      renderAll();
      setTaskFormMessage("Tarefa criada com sucesso.", "success");
      registrarEvento({
        userId: currentUser?.id,
        email: currentProfile?.email || currentUser?.email || "",
        perfil: "profissional",
        evento: "tarefa_criada",
        pagina: "gestao_tarefas",
        contexto: {
          tarefa_id: novaTarefa.id,
          paciente_id: patient.patient_user_id,
          origem_tipo:
            payload.origem_tipo ||
            (lastGeneratedAiMaterial
              ? "ia"
              : selectedCustomPdfFile
                ? "manual_pdf"
                : "manual"),
          possui_pdf: Boolean(linkedPdf?.pdfPath)
        }
      });
    } catch (error) {
      const errorMessage =
        selectedBankTask &&
        /origem_tipo|origem_banco_tarefa_id|pdf_path|pdf_nome/i.test(error.message || "")
          ? "A tarefa foi escolhida no banco, mas ainda faltam as colunas de vínculo do PDF na tabela de tarefas."
          : lastGeneratedAiMaterial &&
              /pdf_path|pdf_nome/i.test(error.message || "")
            ? "O PDF da tarefa com IA foi gerado, mas ainda faltam as colunas de PDF na tabela de tarefas."
          : error.message || "Erro ao criar tarefa.";

      setTaskFormMessage(errorMessage, "error");
    } finally {
      if (btnCreateTask) {
        btnCreateTask.disabled = false;
        btnCreateTask.textContent = previousButtonText;
      }
    }
  }

  async function salvarTarefaEditada() {
    const task = getSelectedTask();
    const titulo = taskTitleInput?.value.trim() || "";
    const descricao = taskDescriptionInput?.value.trim() || "";
    const interacaoTipo = normalizarTipoInteracao(taskInteractionTypeSelect?.value);
    const interacaoLimite = normalizarLimiteInteracao(interacaoTipo, taskInteractionLimitInput?.value);

    if (!task) {
      setTaskFormMessage("Selecione uma tarefa antes de alterar.", "error");
      return;
    }

    if (!titulo) {
      setTaskFormMessage("Informe o título da tarefa.", "error");
      return;
    }

    if (!descricao) {
      setTaskFormMessage("Informe a descrição da tarefa.", "error");
      return;
    }

    if (btnCreateTask) btnCreateTask.disabled = true;
    setTaskFormMessage();

    try {
      const { error } = await supabase
        .from("tarefas")
        .update({
          titulo,
          descricao,
          interacao_paciente_tipo: interacaoTipo,
          interacao_paciente_limite: interacaoLimite
        })
        .eq("id", task.id)
        .eq("professional_user_id", currentUser.id);

      if (error) {
        throw new Error(`Não foi possível alterar a tarefa: ${error.message}`);
      }

      await carregarTarefas();
      renderAll();
      closeTaskForm();
      setTaskFormMessage("Tarefa alterada com sucesso.", "success");
    } catch (error) {
      setTaskFormMessage(error.message || "Erro ao alterar tarefa.", "error");
    } finally {
      if (btnCreateTask) btnCreateTask.disabled = false;
    }
  }

  async function criarInteracao() {
    const task = getSelectedTask();
    const mensagem = interactionTextInput?.value.trim() || "";
    const permissaoInteracao = obterPermissaoInteracaoDaTarefa(task);

    if (!task) {
      setInteractionFormMessage("Selecione uma tarefa antes de registrar a interação.", "error");
      return;
    }

    if (!permissaoInteracao.permitido) {
      setInteractionFormMessage(
        permissaoInteracao.mensagem || "Esta tarefa não permite novas interações.",
        "error"
      );
      return;
    }

    if (!mensagem) {
      setInteractionFormMessage("Digite a mensagem da interação.", "error");
      return;
    }

    if (btnCreateInteraction) btnCreateInteraction.disabled = true;
    setInteractionFormMessage();

    try {
      const { error } = await supabase
        .from("tarefa_interacoes")
        .insert({
          tarefa_id: task.id,
          autor_tipo: "profissional",
          autor_user_id: currentUser.id,
          mensagem
        });

      if (error) {
        throw new Error(`Não foi possível registrar a interação: ${error.message}`);
      }

      if (interactionTextInput) interactionTextInput.value = "";

      await carregarTarefas();
      renderTasksArea();
      renderInteractionArea();
      setInteractionFormMessage("Interação registrada com sucesso.", "success");
      registrarEvento({
        userId: currentUser?.id,
        email: currentProfile?.email || currentUser?.email || "",
        perfil: "profissional",
        evento: "interacao_profissional_criada",
        pagina: "gestao_tarefas",
        contexto: {
          tarefa_id: task.id,
          paciente_id: task.patient_user_id
        }
      });
    } catch (error) {
      setInteractionFormMessage(error.message || "Erro ao registrar a interação.", "error");
    } finally {
      if (btnCreateInteraction) btnCreateInteraction.disabled = false;
    }
  }

  async function salvarInteracaoEditada() {
    const interaction = getEditingInteraction();
    const mensagem = interactionEditInput?.value ?? "";

    if (!interaction) {
      setInteractionEditMessage("Selecione uma interação válida para alterar.", "error");
      return;
    }

    if (btnSaveEditInteraction) btnSaveEditInteraction.disabled = true;
    setInteractionEditMessage();

    try {
      const { error } = await supabase
        .from("tarefa_interacoes")
        .update({
          mensagem
        })
        .eq("id", interaction.id)
        .eq("autor_tipo", "profissional")
        .eq("autor_user_id", currentUser.id);

      if (error) {
        throw new Error(`Não foi possível alterar a interação: ${error.message}`);
      }

      await carregarTarefas();
      renderTasksArea();
      renderInteractionArea();
      closeInteractionEditCard();
      setInteractionFormMessage("Interação alterada com sucesso.", "success");
    } catch (error) {
      setInteractionEditMessage(error.message || "Erro ao alterar interação.", "error");
    } finally {
      if (btnSaveEditInteraction) btnSaveEditInteraction.disabled = false;
    }
  }

  function renderAll() {
    renderProfessionalName();
    renderPatients();
    renderTasksArea();
    renderInteractionArea();
    renderSelectedBankTaskSummary();
    syncMobileViewWithSelection();
  }

  async function atualizarDadosSilenciosamente() {
    if (!currentUser || isRefreshingData) return;

    isRefreshingData = true;

    try {
      await carregarPacientes();
      await carregarTarefas();
      renderAll();
    } catch (error) {
      console.error("Erro ao atualizar dados automaticamente:", error);
    } finally {
      isRefreshingData = false;
    }
  }

  function iniciarAutoRefresh() {
    if (autoRefreshTimer) {
      window.clearInterval(autoRefreshTimer);
    }

    autoRefreshTimer = window.setInterval(() => {
      if (document.hidden) return;
      atualizarDadosSilenciosamente();
    }, 4000);
  }

  if (patientsGrid) {
    patientsGrid.addEventListener("click", (event) => {
      const editAliasButton = event.target.closest('[data-action="edit-alias"]');
      if (editAliasButton) {
        selectedPatientId = editAliasButton.getAttribute("data-patient-id");
        selectedTaskId = null;

        closeTaskForm();
        closeInteractionEditCard();
        setTaskFormMessage();
        setInteractionFormMessage();
        renderAll();
        openAliasBox();
        return;
      }

      const card = event.target.closest("[data-patient-id]");
      if (!card) return;

      selectedPatientId = card.getAttribute("data-patient-id");
      selectedTaskId = null;

      closeAliasBox();
      closeTaskForm();
      closeInteractionEditCard();
      setTaskFormMessage();
      setInteractionFormMessage();
      renderAll();
    });
  }

  if (tasksList) {
    tasksList.addEventListener("click", (event) => {
      const card = event.target.closest("[data-task-id]");
      if (!card) return;

      selectedTaskId = Number(card.getAttribute("data-task-id"));
      closeTaskForm();
      closeInteractionEditCard();
      setInteractionFormMessage();
      renderTasksArea();
      renderInteractionArea();
      syncMobileViewWithSelection();
    });
  }

  if (btnNewTask) {
    btnNewTask.addEventListener("click", () => {
      if (!selectedPatientId || !taskFormCard) return;

      if (taskFormCard.hidden || taskFormMode !== "create") {
        openTaskFormForCreate();
      } else {
        closeTaskForm();
      }
    });
  }

  if (defaultInteractionType) {
    defaultInteractionType.addEventListener("change", () => {
      syncDefaultPolicyVisibility();
      setDefaultPolicyMessage();
    });
  }

  if (taskInteractionTypeSelect) {
    taskInteractionTypeSelect.addEventListener("change", () => {
      syncTaskPolicyVisibility();
      setTaskFormMessage();
    });
  }

  if (btnToggleDefaultPolicy) {
    btnToggleDefaultPolicy.addEventListener("click", () => {
      if (!defaultPolicyEditor) return;

      if (defaultPolicyEditor.hidden) {
        openDefaultPolicyEditor();
      } else {
        closeDefaultPolicyEditor();
      }
    });
  }

  if (btnCancelDefaultPolicy) {
    btnCancelDefaultPolicy.addEventListener("click", closeDefaultPolicyEditor);
  }

  if (btnSaveDefaultPolicy) {
    btnSaveDefaultPolicy.addEventListener("click", salvarPadraoProfissional);
  }

  if (btnCancelTask) {
    btnCancelTask.addEventListener("click", () => {
      closeTaskForm();
    });
  }

  if (btnCreateTask) {
    btnCreateTask.addEventListener("click", async () => {
      if (taskFormMode === "edit") {
        await salvarTarefaEditada();
        return;
      }

      await criarTarefa();
    });
  }

  if (btnOpenTaskBank) {
    btnOpenTaskBank.addEventListener("click", async () => {
      if (taskBankBrowser?.hidden) {
        await openTaskBankBrowser();
      } else {
        closeTaskBankBrowser();
      }
    });
  }

  if (btnUploadTaskPdf) {
    btnUploadTaskPdf.addEventListener("click", () => {
      taskPdfUploadInput?.click();
    });
  }

  if (taskPdfUploadInput) {
    taskPdfUploadInput.addEventListener("change", (event) => {
      const file = event.target.files?.[0] || null;
      if (!file) return;

      if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== "application/pdf")) {
        setTaskFormMessage("Selecione um arquivo PDF válido.", "error");
        taskPdfUploadInput.value = "";
        return;
      }

      applyCustomPdfToForm(file);
    });
  }

  if (btnCloseTaskBank) {
    btnCloseTaskBank.addEventListener("click", closeTaskBankBrowser);
  }

  if (taskBankThemes) {
    taskBankThemes.addEventListener("click", (event) => {
      const button = event.target.closest("[data-bank-theme-id]");
      if (!button) return;

      selectedBankThemeId = Number.parseInt(button.getAttribute("data-bank-theme-id") || "", 10);
      renderTaskBankBrowser();
    });
  }

  if (taskBankList) {
    taskBankList.addEventListener("click", (event) => {
      const previewButton = event.target.closest("[data-action='preview-bank-pdf']");
      if (previewButton) {
        abrirPdfDoBanco(previewButton.getAttribute("data-pdf-path"));
        return;
      }

      const useButton = event.target.closest("[data-action='use-bank-task']");
      if (!useButton) return;

      const bankTaskId = Number.parseInt(useButton.getAttribute("data-bank-task-id") || "", 10);
      const bankTask = bankTasks.find((item) => item.id === bankTaskId) || null;
      applyBankTaskToForm(bankTask);
    });
  }

  if (btnOpenSelectedBankPdf) {
    btnOpenSelectedBankPdf.addEventListener("click", () => {
      if (selectedCustomPdfPreviewUrl) {
        window.open(selectedCustomPdfPreviewUrl, "_blank", "noopener,noreferrer");
        return;
      }

      if (!selectedBankTask?.pdf_path) return;
      abrirPdfDoBanco(selectedBankTask.pdf_path);
    });
  }

  if (btnClearSelectedBankTask) {
    btnClearSelectedBankTask.addEventListener("click", () => {
      if (selectedCustomPdfFile) {
        clearSelectedCustomPdf();
        setTaskFormMessage("PDF próprio removido do formulário atual.", "success");
        return;
      }

      clearSelectedBankTask();
      setTaskFormMessage("Vínculo com o banco removido do formulário atual.", "success");
    });
  }

  if (btnGenerateTaskWithAi) {
    btnGenerateTaskWithAi.addEventListener("click", gerarMaterialComIa);
  }

  if (btnToggleTaskAi) {
    btnToggleTaskAi.addEventListener("click", toggleTaskAiBox);
  }

  if (btnCloseTaskAi) {
    btnCloseTaskAi.addEventListener("click", closeTaskAiBox);
  }

  if (btnEditTask) {
    btnEditTask.addEventListener("click", openTaskFormForEdit);
  }

  if (btnOpenTaskPdf) {
    btnOpenTaskPdf.addEventListener("click", () => {
      const task = getSelectedTask();
      if (!task?.pdf_path) return;
      abrirPdfDoBanco(task.pdf_path);
    });
  }

  if (btnSaveAlias) {
    btnSaveAlias.addEventListener("click", salvarApelidoPaciente);
  }

  if (btnCancelAlias) {
    btnCancelAlias.addEventListener("click", () => {
      const patient = getSelectedPatient();
      if (patientAliasInput && patient) {
        patientAliasInput.value = patient.alias;
      }
      closeAliasBox();
    });
  }

  if (btnClearInteraction) {
    btnClearInteraction.addEventListener("click", () => {
      if (interactionTextInput) interactionTextInput.value = "";
      setInteractionFormMessage();
    });
  }

  if (btnCreateInteraction) {
    btnCreateInteraction.addEventListener("click", criarInteracao);
  }

  if (mobileStepPatients) {
    mobileStepPatients.addEventListener("click", () => {
      if (!isMobileLayout()) return;

      selectedTaskId = null;
      closeTaskForm();
      closeInteractionEditCard();
      setInteractionFormMessage();
      renderTasksArea();
      renderInteractionArea();
      setMobileView("patients");
    });
  }

  if (mobileStepTasks) {
    mobileStepTasks.addEventListener("click", () => {
      if (!isMobileLayout() || !selectedPatientId) return;

      selectedTaskId = null;
      closeInteractionEditCard();
      setInteractionFormMessage();
      renderTasksArea();
      renderInteractionArea();
      setMobileView("tasks");
    });
  }

  if (mobileStepInteractions) {
    mobileStepInteractions.addEventListener("click", () => {
      if (!isMobileLayout() || !selectedTaskId) return;
      setMobileView("interactions");
    });
  }

  if (interactionsList) {
    interactionsList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-edit-interaction-id]");
      if (!button) return;

      openInteractionEditCard(Number(button.getAttribute("data-edit-interaction-id")));
    });
  }

  if (btnCancelEditInteraction) {
    btnCancelEditInteraction.addEventListener("click", closeInteractionEditCard);
  }

  if (btnSaveEditInteraction) {
    btnSaveEditInteraction.addEventListener("click", salvarInteracaoEditada);
  }

  async function iniciar() {
    hideScreenError();
    syncMobileViewWithSelection();

    const ok = await validarProfissional();
    if (!ok) return;

    aplicarPadraoProfissionalNaTela();
    await carregarPacientes();
    await carregarTarefas();
    renderAll();
  }

  window.addEventListener("resize", () => {
    syncMobileViewWithSelection();
  });

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      atualizarDadosSilenciosamente();
    }
  });

  iniciar()
    .then(() => {
      iniciarAutoRefresh();
    })
    .catch((error) => {
      console.error("Erro na tela profissional-tarefas:", error);

      if (professionalLine) {
        professionalLine.textContent = "PROFISSIONAL: erro ao carregar";
      }

      showScreenError(error.message || "Erro ao carregar a gestão de tarefas.");
    });
});
