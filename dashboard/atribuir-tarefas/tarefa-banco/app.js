import supabase from "../../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const searchParams = new URLSearchParams(window.location.search);
  const initialPatientId = (searchParams.get("patient") || "").trim();
  const initialPatientAlias = (searchParams.get("alias") || "").trim();

  const PDF_BUCKET = "banco-tarefas-pdf";
  const PDF_PREVIEW_BUCKET = "banco-tarefas-preview";

  const btnBackLink = document.getElementById("btnBackLink");
  const brandBackLink = document.getElementById("brandBackLink");
  const selectedPatientName = document.getElementById("selectedPatientName");
  const screenMessage = document.getElementById("screenMessage");
  const selectedThemeCard = document.getElementById("selectedThemeCard");
  const selectedThemeTitle = document.getElementById("selectedThemeTitle");
  const selectedThemeDescription = document.getElementById("selectedThemeDescription");
  const themesEmptyState = document.getElementById("themesEmptyState");
  const themesList = document.getElementById("themesList");
  const tasksPanelTitle = document.getElementById("tasksPanelTitle");
  const tasksEmptyState = document.getElementById("tasksEmptyState");
  const tasksList = document.getElementById("tasksList");
  const confirmationPanel = document.getElementById("confirmationPanel");
  const selectedTaskTitle = document.getElementById("selectedTaskTitle");
  const selectedTaskDescription = document.getElementById("selectedTaskDescription");
  const selectedTaskPdfName = document.getElementById("selectedTaskPdfName");
  const selectedTaskThemeName = document.getElementById("selectedTaskThemeName");
  const taskInteractionType = document.getElementById("taskInteractionType");
  const taskInteractionLimitField = document.getElementById("taskInteractionLimitField");
  const taskInteractionLimit = document.getElementById("taskInteractionLimit");
  const formMessage = document.getElementById("formMessage");
  const btnOpenSelectedPdf = document.getElementById("btnOpenSelectedPdf");
  const btnCancelSelection = document.getElementById("btnCancelSelection");
  const btnSaveSelectedTask = document.getElementById("btnSaveSelectedTask");
  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");

  let currentUser = null;
  let currentProfile = null;
  let selectedPatient = null;
  let themes = [];
  let bankTasks = [];
  let resources = [];
  let selectedThemeId = null;
  let selectedBankTaskId = null;
  let themesCollapsed = false;

  function normalizarTipoInteracao(value) {
    if (value === "limitado" || value === "ilimitado") return value;
    return "nao_permitir";
  }

  function normalizarLimiteInteracao(tipo, value) {
    if (tipo !== "limitado") return null;
    const numero = Number.parseInt(String(value || "1"), 10);
    return Number.isFinite(numero) && numero > 0 ? numero : 1;
  }

  function syncTaskInteractionVisibility() {
    const tipo = normalizarTipoInteracao(taskInteractionType?.value);
    const isLimitado = tipo === "limitado";

    if (taskInteractionLimitField) {
      taskInteractionLimitField.hidden = !isLimitado;
    }

    if (taskInteractionLimit) {
      if (isLimitado) {
        if (!String(taskInteractionLimit.value || "").trim()) {
          taskInteractionLimit.value = String(
            normalizarLimiteInteracao(tipo, currentProfile?.tarefa_interacao_padrao_limite)
          );
        }
      } else {
        taskInteractionLimit.value = "";
      }
    }
  }

  function aplicarPadraoInteracaoDoProfissional() {
    if (!taskInteractionType) return;

    taskInteractionType.value = normalizarTipoInteracao(
      currentProfile?.tarefa_interacao_padrao_tipo
    );

    if (taskInteractionLimit) {
      const limite = normalizarLimiteInteracao(
        taskInteractionType.value,
        currentProfile?.tarefa_interacao_padrao_limite
      );
      taskInteractionLimit.value = limite ? String(limite) : "";
    }

    syncTaskInteractionVisibility();
  }

  function buildAssignmentsUrl() {
    const query = new URLSearchParams({
      patient: initialPatientId,
      alias: initialPatientAlias || selectedPatient?.alias || selectedPatient?.nome_real || "Paciente"
    });

    return `../atribuicoes/index.html?${query.toString()}`;
  }

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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function getPdfPreviewPath(pdfPath) {
    const safePath = String(pdfPath || "").trim();
    if (!safePath || !/\.pdf$/i.test(safePath)) {
      return "";
    }

    const lastSlashIndex = safePath.lastIndexOf("/");
    const directory = lastSlashIndex >= 0 ? safePath.slice(0, lastSlashIndex) : "";
    const fileName = lastSlashIndex >= 0 ? safePath.slice(lastSlashIndex + 1) : safePath;
    const baseName = fileName.replace(/\.pdf$/i, "");

    return directory
      ? `${directory}/previews/${baseName}.png`
      : `previews/${baseName}.png`;
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
      window.location.href = "../../../auth/profissional-login/index.html";
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
      window.location.href = "../../../auth/profissional-login/index.html";
      return false;
    }

    currentProfile = perfil;

    await registrarAcessoPagina({
      pagina: "tarefa_banco",
      perfil: "profissional",
      userId: currentUser.id,
      email: currentProfile.email || currentUser.email || "",
      contexto: {
        paciente_id: initialPatientId || null
      }
    });

    return true;
  }

  async function sairDoSistema() {
    await registrarEvento({
      evento: "logout",
      pagina: "tarefa_banco",
      perfil: "profissional",
      userId: currentUser?.id || null,
      email: currentProfile?.email || currentUser?.email || null
    });

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Erro ao sair:", error);
    }

    window.location.href = "../../../auth/profissional-login/index.html";
  }

  async function carregarPacienteSelecionado() {
    if (!initialPatientId) {
      throw new Error("Nenhum paciente foi informado para criar a tarefa.");
    }

    const { data, error } = await supabase.rpc("listar_pacientes_vinculados_profissional");

    if (error) {
      throw new Error(`Falha ao carregar pacientes vinculados: ${error.message}`);
    }

    const patients = (data || []).map((item) => {
      const nomeCompleto =
        item.patient_name?.trim() ||
        item.patient_email?.trim() ||
        "Paciente";

      return {
        vinculo_id: item.vinculo_id,
        patient_user_id: item.patient_user_id,
        alias: item.patient_alias || nomeCompleto,
        nome_real: nomeCompleto
      };
    });

    selectedPatient = patients.find((item) => item.patient_user_id === initialPatientId) || null;

    if (!selectedPatient) {
      throw new Error("O paciente selecionado não foi encontrado entre os vínculos ativos.");
    }

    if (selectedPatientName) {
      selectedPatientName.textContent =
        selectedPatient.alias || initialPatientAlias || selectedPatient.nome_real || "Paciente";
    }
  }

  async function carregarBancoTarefas() {
    const [themesResponse, tasksResponse, resourcesResponse] = await Promise.all([
      supabase
        .from("banco_tarefas_temas")
        .select("id, nome, descricao_curta, ordem, ativo")
        .eq("ativo", true)
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true }),
      supabase
        .from("banco_tarefas_itens")
        .select("id, tema_id, recurso_id, titulo, descricao_curta, pdf_path, pdf_nome, status, numero_usos, ativo, created_at")
        .eq("ativo", true)
        .eq("status", "publicada")
        .order("created_at", { ascending: false }),
      supabase
        .from("banco_tarefas_recursos")
        .select("id, ordem, nome")
    ]);

    if (themesResponse.error) {
      throw new Error(`Falha ao carregar temas do banco: ${themesResponse.error.message}`);
    }

    if (tasksResponse.error) {
      throw new Error(`Falha ao carregar tarefas do banco: ${tasksResponse.error.message}`);
    }

    if (resourcesResponse.error) {
      throw new Error(`Falha ao carregar recursos do banco: ${resourcesResponse.error.message}`);
    }

    resources = resourcesResponse.data || [];

    const resourceOrderMap = new Map(
      resources.map((resource) => [String(resource.id), Number(resource.ordem) || Number.MAX_SAFE_INTEGER])
    );

    const sortedTasks = (tasksResponse.data || []).slice().sort((taskA, taskB) => {
      const resourceOrderA = resourceOrderMap.get(String(taskA.recurso_id)) ?? Number.MAX_SAFE_INTEGER;
      const resourceOrderB = resourceOrderMap.get(String(taskB.recurso_id)) ?? Number.MAX_SAFE_INTEGER;

      if (resourceOrderA !== resourceOrderB) {
        return resourceOrderA - resourceOrderB;
      }

      return String(taskA.titulo || "").localeCompare(String(taskB.titulo || ""), "pt-BR", {
        sensitivity: "base"
      });
    });

    const loadedTasks = await Promise.all(
      sortedTasks.map(async (task) => {
        let pdfPreviewSignedUrl = "";

        if (task.pdf_path) {
          const previewPath = getPdfPreviewPath(task.pdf_path);
          if (previewPath) {
            try {
              const { data, error } = await supabase.storage
                .from(PDF_PREVIEW_BUCKET)
                .createSignedUrl(previewPath, 3600);

              if (!error && data?.signedUrl) {
                pdfPreviewSignedUrl = data.signedUrl;
              }
            } catch (error) {
              console.error("Erro ao preparar miniatura do PDF da tarefa do banco:", error);
            }
          }
        }

        return {
          ...task,
          pdfPreviewSignedUrl
        };
      })
    );

    themes = (themesResponse.data || []).map((theme) => ({
      ...theme,
      total: loadedTasks.filter((task) => task.tema_id === theme.id).length
    }));
    bankTasks = loadedTasks;

    if (themes.length) {
      selectedThemeId = themes[0].id;
    }
  }

  function getSelectedTheme() {
    return themes.find((theme) => theme.id === selectedThemeId) || null;
  }

  function getTasksBySelectedTheme() {
    if (!selectedThemeId) return [];
    return bankTasks.filter((task) => task.tema_id === selectedThemeId);
  }

  function getSelectedBankTask() {
    return bankTasks.find((task) => task.id === selectedBankTaskId) || null;
  }

  function renderSelectedThemeSummary() {
    if (!selectedThemeCard || !selectedThemeTitle || !selectedThemeDescription) {
      return;
    }

    const selectedTheme = getSelectedTheme();

    if (!selectedTheme || !themesCollapsed) {
      selectedThemeCard.hidden = true;
      return;
    }

    selectedThemeCard.hidden = false;
    selectedThemeTitle.textContent = selectedTheme.nome || "Tema";
    selectedThemeDescription.textContent =
      selectedTheme.descricao_curta || "Tema disponível no banco de tarefas.";
  }

  function renderThemes() {
    if (!themesList || !themesEmptyState) return;

    if (!themes.length) {
      themesList.innerHTML = "";
      themesEmptyState.hidden = false;
      return;
    }

    themesEmptyState.hidden = true;
    if (themesCollapsed) {
      themesList.hidden = true;
      renderSelectedThemeSummary();
      return;
    }

    themesList.hidden = false;
    themesList.innerHTML = themes
      .map((theme) => {
        const selectedClass = theme.id === selectedThemeId ? " is-selected" : "";

        return `
          <button class="selection-button${selectedClass}" type="button" data-theme-id="${theme.id}">
            <span class="selection-button__top">
              <span class="selection-button__title">${escapeHtml(theme.nome)}</span>
              <span class="meta-chip meta-chip--type">${theme.total} tarefa(s)</span>
            </span>
          </button>
        `;
      })
      .join("");
    renderSelectedThemeSummary();
  }

  function renderTasks() {
    if (!tasksList || !tasksEmptyState || !tasksPanelTitle) return;

    const selectedTheme = getSelectedTheme();
    const tasks = getTasksBySelectedTheme();

    tasksPanelTitle.textContent = selectedTheme
      ? `Tarefas do tema: ${selectedTheme.nome}`
      : "Tarefas do tema";

    if (!selectedTheme) {
      tasksList.innerHTML = "";
      tasksEmptyState.hidden = false;
      tasksEmptyState.textContent = "Selecione um tema para visualizar as tarefas disponíveis.";
      return;
    }

    if (!tasks.length) {
      tasksList.innerHTML = "";
      tasksEmptyState.hidden = false;
      tasksEmptyState.textContent = "Nenhuma tarefa publicada neste tema no momento.";
      return;
    }

    tasksEmptyState.hidden = true;
    tasksList.innerHTML = tasks
      .map((task) => {
        const selectedClass = task.id === selectedBankTaskId ? " is-selected" : "";

        return `
          <button class="selection-button${selectedClass}" type="button" data-task-id="${task.id}">
            <span class="selection-button__top">
              <span class="selection-button__title">${escapeHtml(task.titulo)}</span>
            </span>
            <span class="selection-button__subtitle">${escapeHtml(
              task.descricao_curta || "Sem descrição curta cadastrada."
            )}</span>
            ${task.pdfPreviewSignedUrl ? `
              <span class="selection-button__preview">
                <img
                  class="selection-button__preview-image"
                  src="${escapeHtml(task.pdfPreviewSignedUrl)}"
                  alt="Miniatura do PDF ${escapeHtml(task.titulo || "da tarefa")}"
                />
              </span>
            ` : ""}
            <span class="selection-button__meta">
              <span class="meta-chip meta-chip--type">${escapeHtml(task.pdf_nome || "PDF da tarefa")}</span>
              <span class="meta-chip meta-chip--type">${Number(task.numero_usos) || 0} uso(s)</span>
            </span>
          </button>
        `;
      })
      .join("");
  }

  function renderConfirmation() {
    if (
      !confirmationPanel ||
      !selectedTaskTitle ||
      !selectedTaskDescription ||
      !selectedTaskPdfName ||
      !selectedTaskThemeName ||
      !btnOpenSelectedPdf
    ) {
      return;
    }

    const task = getSelectedBankTask();
    const theme = getSelectedTheme();

    if (!task) {
      confirmationPanel.hidden = true;
      return;
    }

    selectedTaskTitle.textContent = task.titulo || "Tarefa sem título";
    selectedTaskDescription.textContent = task.descricao_curta || "Sem descrição curta cadastrada.";
    selectedTaskPdfName.textContent = task.pdf_nome || "PDF da tarefa";
    selectedTaskThemeName.textContent = theme?.nome || "Tema";
    btnOpenSelectedPdf.disabled = !task.pdf_path;
    confirmationPanel.hidden = false;
  }

  async function abrirPdfSelecionado() {
    const task = getSelectedBankTask();

    if (!task?.pdf_path) {
      window.alert("Esta tarefa não possui PDF disponível.");
      return;
    }

    try {
      await registrarEvento({
        evento: "pdf_banco_aberto",
        pagina: "tarefa_banco",
        perfil: "profissional",
        userId: currentUser?.id || null,
        email: currentProfile?.email || currentUser?.email || null,
        contexto: {
          paciente_id: selectedPatient?.patient_user_id || null,
          tarefa_banco_id: task.id,
          pdf_path: task.pdf_path
        }
      });

      const { data, error } = await supabase.storage
        .from(PDF_BUCKET)
        .createSignedUrl(task.pdf_path, 60);

      if (error || !data?.signedUrl) {
        throw new Error(error?.message || "Não foi possível abrir o PDF.");
      }

      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      window.alert(error.message || "Não foi possível abrir o PDF.");
    }
  }

  function limparSelecaoDaTarefa() {
    selectedBankTaskId = null;
    setFormMessage();
    renderTasks();
    renderConfirmation();
  }

  async function salvarTarefaDoBanco() {
    const selectedTask = getSelectedBankTask();
    const selectedTheme = getSelectedTheme();
    const selectedResource =
      resources.find((resource) => String(resource.id) === String(selectedTask?.recurso_id)) || null;
    const interactionType = normalizarTipoInteracao(taskInteractionType?.value);
    const interactionLimit = normalizarLimiteInteracao(
      interactionType,
      taskInteractionLimit?.value
    );

    if (!selectedPatient) {
      setFormMessage("Selecione um paciente válido antes de gravar a tarefa.", "error");
      return;
    }

    if (!selectedTask) {
      setFormMessage("Selecione uma tarefa do banco para continuar.", "error");
      return;
    }

    if (interactionType === "limitado" && !interactionLimit) {
      setFormMessage("Informe o número máximo de interações permitidas.", "error");
      return;
    }

    if (btnSaveSelectedTask) {
      btnSaveSelectedTask.disabled = true;
      btnSaveSelectedTask.textContent = "GRAVANDO...";
    }
    setFormMessage();

    try {
      const payload = {
        professional_user_id: currentUser.id,
        patient_user_id: selectedPatient.patient_user_id,
        vinculo_id: selectedPatient.vinculo_id,
        titulo: selectedTheme?.nome || selectedTask.titulo || "Tarefa do banco",
        descricao: selectedResource?.nome || null,
        status: "aberta",
        interacao_paciente_tipo: interactionType,
        interacao_paciente_limite: interactionLimit,
        origem_tipo: "banco",
        origem_banco_tarefa_id: selectedTask.id,
        pdf_path: selectedTask.pdf_path || null,
        pdf_nome: selectedTask.pdf_nome || null
      };

      const { data: novaTarefa, error } = await supabase
        .from("tarefas")
        .insert(payload)
        .select()
        .single();

      if (error || !novaTarefa) {
        throw new Error(error?.message || "Não foi possível criar a tarefa.");
      }

      await supabase
        .from("banco_tarefas_itens")
        .update({
          numero_usos: (Number(selectedTask.numero_usos) || 0) + 1
        })
        .eq("id", selectedTask.id);

      await registrarEvento({
        userId: currentUser?.id,
        email: currentProfile?.email || currentUser?.email || "",
        perfil: "profissional",
        evento: "tarefa_criada",
        pagina: "tarefa_banco",
        contexto: {
          tarefa_id: novaTarefa.id,
          paciente_id: selectedPatient.patient_user_id,
          origem_tipo: "banco",
          origem_banco_tarefa_id: selectedTask.id,
          pdf_nome: selectedTask.pdf_nome || ""
        }
      });

      window.location.href = buildAssignmentsUrl();
    } catch (error) {
      console.error("Erro ao criar tarefa do banco:", error);
      setFormMessage(error.message || "Erro ao criar tarefa.", "error");
    } finally {
      if (btnSaveSelectedTask) {
        btnSaveSelectedTask.disabled = false;
        btnSaveSelectedTask.textContent = "GRAVAR";
      }
    }
  }

  if (btnBottomMenu) {
    btnBottomMenu.addEventListener("click", alternarMenuInferior);
  }

  if (btnMenuLogout) {
    btnMenuLogout.addEventListener("click", sairDoSistema);
  }

  if (themesList) {
    themesList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-theme-id]");
      if (!button) return;

      const nextThemeId = Number.parseInt(button.getAttribute("data-theme-id") || "", 10);
      if (!nextThemeId) return;
      if (nextThemeId === selectedThemeId && themesCollapsed) return;

      selectedThemeId = nextThemeId;
      selectedBankTaskId = null;
      themesCollapsed = true;
      setFormMessage();
      renderThemes();
      renderTasks();
      renderConfirmation();

      const theme = getSelectedTheme();
      registrarEvento({
        evento: "tema_banco_selecionado",
        pagina: "tarefa_banco",
        perfil: "profissional",
        userId: currentUser?.id || null,
        email: currentProfile?.email || currentUser?.email || null,
        contexto: {
          paciente_id: selectedPatient?.patient_user_id || null,
          tema_id: nextThemeId,
          tema: theme?.nome || null
        }
      });
    });
  }

  if (selectedThemeCard) {
    selectedThemeCard.addEventListener("click", () => {
      themesCollapsed = false;
      selectedBankTaskId = null;
      setFormMessage();
      renderThemes();
      renderTasks();
      renderConfirmation();
    });
  }

  if (tasksList) {
    tasksList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-task-id]");
      if (!button) return;

      const nextTaskId = Number.parseInt(button.getAttribute("data-task-id") || "", 10);
      if (!nextTaskId) return;

      selectedBankTaskId = nextTaskId;
      setFormMessage();
      renderTasks();
      renderConfirmation();

      const task = getSelectedBankTask();
      registrarEvento({
        evento: "tarefa_banco_selecionada",
        pagina: "tarefa_banco",
        perfil: "profissional",
        userId: currentUser?.id || null,
        email: currentProfile?.email || currentUser?.email || null,
        contexto: {
          paciente_id: selectedPatient?.patient_user_id || null,
          tarefa_banco_id: nextTaskId,
          titulo: task?.titulo || null
        }
      });
    });
  }

  if (btnOpenSelectedPdf) {
    btnOpenSelectedPdf.addEventListener("click", abrirPdfSelecionado);
  }

  if (btnCancelSelection) {
    btnCancelSelection.addEventListener("click", limparSelecaoDaTarefa);
  }

  if (btnSaveSelectedTask) {
    btnSaveSelectedTask.addEventListener("click", salvarTarefaDoBanco);
  }

  if (taskInteractionType) {
    taskInteractionType.addEventListener("change", syncTaskInteractionVisibility);
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

    const assignmentsUrl = buildAssignmentsUrl();
    if (btnBackLink) btnBackLink.href = assignmentsUrl;
    if (brandBackLink) brandBackLink.href = assignmentsUrl;

    const ok = await validarProfissional();
    if (!ok) return;

    aplicarPadraoInteracaoDoProfissional();
    await carregarPacienteSelecionado();
    await carregarBancoTarefas();
    themesCollapsed = false;
    renderThemes();
    renderTasks();
    renderConfirmation();
  }

  iniciar().catch((error) => {
    console.error("Erro na tela tarefa-banco:", error);
    setScreenMessage(error.message || "Não foi possível carregar a tela da tarefa do banco.");
  });
});
