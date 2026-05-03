import supabase from "../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const PDF_BUCKET = "banco-tarefas-pdf";

  const btnBack = document.getElementById("btnBack");
  const pageTitle = document.getElementById("pageTitle");
  const screenMessage = document.getElementById("screenMessage");

  const themesView = document.getElementById("themesView");
  const tasksView = document.getElementById("tasksView");
  const createTaskView = document.getElementById("createTaskView");
  const detailTaskView = document.getElementById("detailTaskView");

  const themesEmptyState = document.getElementById("themesEmptyState");
  const themesList = document.getElementById("themesList");
  const tasksEmptyState = document.getElementById("tasksEmptyState");
  const tasksList = document.getElementById("tasksList");
  const selectedThemeTitle = document.getElementById("selectedThemeTitle");
  const btnDetailTask = document.getElementById("btnDetailTask");
  const btnDeleteTask = document.getElementById("btnDeleteTask");
  const deleteTaskConfirmOverlay = document.getElementById("deleteTaskConfirmOverlay");
  const deleteTaskConfirmDetails = document.getElementById("deleteTaskConfirmDetails");
  const btnCancelDeleteTask = document.getElementById("btnCancelDeleteTask");
  const btnConfirmDeleteTask = document.getElementById("btnConfirmDeleteTask");

  const btnOpenCreateTask = document.getElementById("btnOpenCreateTask");
  const btnCancelCreateTask = document.getElementById("btnCancelCreateTask");
  const btnBackFromDetail = document.getElementById("btnBackFromDetail");
  const createTaskForm = document.getElementById("createTaskForm");
  const taskThemeName = document.getElementById("taskThemeName");
  const taskResourceSelect = document.getElementById("taskResourceSelect");
  const taskPdfFile = document.getElementById("taskPdfFile");
  const taskVideoLink = document.getElementById("taskVideoLink");
  const createTaskMessage = document.getElementById("createTaskMessage");
  const btnSaveTask = document.getElementById("btnSaveTask");
  const detailThemeName = document.getElementById("detailThemeName");
  const detailResourceName = document.getElementById("detailResourceName");
  const detailPdfWrapper = document.getElementById("detailPdfWrapper");
  const detailPdfFrame = document.getElementById("detailPdfFrame");
  const detailPdfEmpty = document.getElementById("detailPdfEmpty");
  const detailVideoWrapper = document.getElementById("detailVideoWrapper");
  const detailVideoLink = document.getElementById("detailVideoLink");
  const detailVideoEmpty = document.getElementById("detailVideoEmpty");

  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");

  let currentUser = null;
  let currentProfile = null;
  let currentView = "themes";
  let selectedThemeId = null;
  let selectedTaskId = null;
  let confirmDeleteTaskId = null;
  let themes = [];
  let resources = [];
  let tasks = [];

  function getPdfUploadEndpoint() {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocal) {
      return "http://localhost:3000/api/storage/upload-task-pdf";
    }

    return "https://psicotarefas-backend.onrender.com/api/storage/upload-task-pdf";
  }

  function esperar(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        resolve(result.replace(/^data:.*;base64,/, ""));
      };
      reader.onerror = () => reject(new Error("Não foi possível ler o arquivo PDF."));
      reader.readAsDataURL(file);
    });
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

  function setCreateTaskMessage(text = "", type = "error") {
    if (!createTaskMessage) return;

    if (!text) {
      createTaskMessage.hidden = true;
      createTaskMessage.textContent = "";
      createTaskMessage.className = "screen-message";
      return;
    }

    createTaskMessage.hidden = false;
    createTaskMessage.textContent = text;
    createTaskMessage.className = `screen-message screen-message--${type}`;
  }

  function openDeleteTaskConfirmation() {
    if (!deleteTaskConfirmOverlay || !selectedTaskId) return;

    const selectedTheme = getSelectedTheme();
    const selectedTask = getSelectedTask();
    const resourceName = getResourceName(selectedTask?.recurso_id);

    confirmDeleteTaskId = selectedTaskId;
    if (deleteTaskConfirmDetails) {
      deleteTaskConfirmDetails.innerHTML = `
        <div>Tema: ${escapeHtml(selectedTheme?.nome || "-")}</div>
        <div>Recurso: ${escapeHtml(resourceName || "-")}</div>
      `;
    }

    deleteTaskConfirmOverlay.hidden = false;
    btnConfirmDeleteTask?.focus();
  }

  function closeDeleteTaskConfirmation() {
    if (!deleteTaskConfirmOverlay) return;
    deleteTaskConfirmOverlay.hidden = true;
    confirmDeleteTaskId = null;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function slugify(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9.-]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
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

  function getSelectedTheme() {
    return themes.find((theme) => String(theme.id) === String(selectedThemeId)) || null;
  }

  function getResourceName(resourceId) {
    const resource = resources.find((item) => String(item.id) === String(resourceId));
    return resource?.nome || "Sem recurso";
  }

  function getResourceOrder(resourceId) {
    const resource = resources.find((item) => String(item.id) === String(resourceId));
    return Number.isFinite(Number(resource?.ordem)) ? Number(resource.ordem) : Number.MAX_SAFE_INTEGER;
  }

  function getTasksForSelectedTheme() {
    return tasks.filter((task) => String(task.tema_id) === String(selectedThemeId));
  }

  function getSelectedTask() {
    return tasks.find((task) => String(task.id) === String(selectedTaskId)) || null;
  }

  function updateDeleteButtonState() {
    if (!btnDeleteTask) return;
    btnDeleteTask.disabled = !selectedTaskId;
    if (btnDetailTask) {
      btnDetailTask.disabled = !selectedTaskId;
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

  function setButtonLoading(button, isBusy, busyLabel, idleLabel) {
    if (!button) return;
    button.disabled = isBusy;
    button.textContent = isBusy ? busyLabel : idleLabel;
  }

  async function pacienteTemVinculoAtivo(userId) {
    const { data, error } = await supabase
      .from("vinculos")
      .select("id")
      .eq("patient_user_id", userId)
      .eq("status", "ativo")
      .limit(1);

    if (error) {
      return false;
    }

    return Array.isArray(data) && data.length > 0;
  }

  async function redirecionarPorPerfil(userId, perfil) {
    if (perfil === "profissional") {
      window.location.href = "../../dashboard/profissional/index.html";
      return;
    }

    if (perfil === "paciente") {
      const temVinculo = await pacienteTemVinculoAtivo(userId);
      window.location.href = temVinculo
        ? "../../dashboard/paciente-com-vinculo/index.html"
        : "../../dashboard/paciente-sem-vinculo/index.html";
      return;
    }

    window.location.href = "../../auth/profissional-login/index.html";
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
      .select("nome, email, perfil")
      .eq("user_id", currentUser.id)
      .single();

    if (error) {
      throw new Error(`Falha ao carregar perfil do profissional: ${error.message}`);
    }

    if (!perfil || perfil.perfil !== "profissional") {
      await redirecionarPorPerfil(currentUser.id, perfil?.perfil || "");
      return false;
    }

    currentProfile = perfil;

    await registrarAcessoPagina({
      pagina: "banco_de_tarefas",
      perfil: "profissional",
      userId: currentUser.id,
      email: perfil.email || currentUser.email || null
    });

    return true;
  }

  async function sairDoSistema() {
    await registrarEvento({
      evento: "logout",
      pagina: "banco_de_tarefas",
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

  async function carregarDados() {
    const [themesResponse, resourcesResponse, tasksResponse] = await Promise.all([
      supabase
        .from("banco_tarefas_temas")
        .select("id, nome, ordem")
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true }),
      supabase
        .from("banco_tarefas_recursos")
        .select("id, nome, ordem")
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true }),
      supabase
        .from("banco_tarefas_itens")
        .select("id, tema_id, recurso_id, titulo, pdf_path, video_link, created_at, ativo, status")
        .order("created_at", { ascending: false })
    ]);

    if (themesResponse.error) {
      throw new Error(`Falha ao carregar temas: ${themesResponse.error.message}`);
    }

    if (resourcesResponse.error) {
      throw new Error(`Falha ao carregar recursos: ${resourcesResponse.error.message}`);
    }

    if (tasksResponse.error) {
      throw new Error(`Falha ao carregar tarefas: ${tasksResponse.error.message}`);
    }

    themes = themesResponse.data || [];
    resources = resourcesResponse.data || [];
    tasks = (tasksResponse.data || []).filter((task) => task.ativo !== false);

    if (!selectedThemeId && themes.length) {
      selectedThemeId = themes[0].id;
    }

    if (selectedThemeId && !themes.some((theme) => String(theme.id) === String(selectedThemeId))) {
      selectedThemeId = themes[0]?.id || null;
    }
  }

  function renderThemes() {
    if (!themesList || !themesEmptyState) return;

    if (!themes.length) {
      themesList.innerHTML = "";
      themesEmptyState.hidden = false;
      return;
    }

    themesEmptyState.hidden = true;

    themesList.innerHTML = themes
      .map((theme) => {
        const total = tasks.filter((task) => String(task.tema_id) === String(theme.id)).length;

        return `
          <button class="entity-row" type="button" data-theme-id="${escapeHtml(theme.id)}">
            <div class="entity-row__top">
              <h4 class="entity-row__title">${escapeHtml(theme.nome || "Tema")}</h4>
            </div>
            <div class="entity-row__meta">
              <span class="meta-chip">${escapeHtml(total)} tarefa(s)</span>
            </div>
          </button>
        `;
      })
      .join("");
  }

  function renderTasks() {
    if (!tasksList || !tasksEmptyState) return;

    const selectedTheme = getSelectedTheme();
    const themeTasks = getTasksForSelectedTheme().sort((a, b) => {
      const orderDiff = getResourceOrder(a.recurso_id) - getResourceOrder(b.recurso_id);

      if (orderDiff !== 0) {
        return orderDiff;
      }

      return getResourceName(a.recurso_id).localeCompare(getResourceName(b.recurso_id), "pt-BR", {
        sensitivity: "base"
      });
    });

    if (selectedThemeTitle) {
      selectedThemeTitle.textContent = selectedTheme?.nome || "Tema";
    }

    if (!themeTasks.length) {
      tasksList.innerHTML = "";
      tasksEmptyState.hidden = false;
      selectedTaskId = null;
      updateDeleteButtonState();
      return;
    }

    tasksEmptyState.hidden = true;

    if (!themeTasks.some((task) => String(task.id) === String(selectedTaskId))) {
      selectedTaskId = null;
    }

    updateDeleteButtonState();

    tasksList.innerHTML = themeTasks
      .map((task) => {
        const resourceName = getResourceName(task.recurso_id);
        const hasPdf = Boolean(task.pdf_path);
        const hasVideo = Boolean(task.video_link);
        const selectedClass = String(task.id) === String(selectedTaskId) ? "is-selected" : "";
        const isSelected = String(task.id) === String(selectedTaskId);

        return `
          <article
            class="task-row ${selectedClass}"
            data-task-id="${escapeHtml(task.id)}"
            role="button"
            tabindex="0"
            aria-pressed="${String(isSelected)}"
          >
            <div class="task-row__top">
              <h4 class="task-row__title">${escapeHtml(resourceName)}</h4>
            </div>
            <div class="task-row__meta">
              <div class="task-row__meta-group">
                ${hasPdf ? '<span class="meta-chip meta-chip--muted">PDF</span>' : ""}
                ${hasVideo ? '<span class="meta-chip meta-chip--muted">Vídeo</span>' : ""}
              </div>
              <div class="task-row__actions">
                <button
                  class="task-row__delete"
                  type="button"
                  data-task-delete-id="${escapeHtml(task.id)}"
                >
                  Excluir
                </button>
                <button
                  class="task-row__detail"
                  type="button"
                  data-task-detail-id="${escapeHtml(task.id)}"
                >
                  Detalhar
                </button>
              </div>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderResourceOptions() {
    if (!taskResourceSelect) return;

    const orderedResources = [...resources].sort((a, b) => {
      const ordemA = Number.isFinite(Number(a?.ordem)) ? Number(a.ordem) : Number.MAX_SAFE_INTEGER;
      const ordemB = Number.isFinite(Number(b?.ordem)) ? Number(b.ordem) : Number.MAX_SAFE_INTEGER;

      if (ordemA !== ordemB) {
        return ordemA - ordemB;
      }

      return String(a?.nome || "").localeCompare(String(b?.nome || ""), "pt-BR", {
        sensitivity: "base"
      });
    });

    if (!resources.length) {
      taskResourceSelect.innerHTML = '<option value="">Cadastre recursos no Supabase primeiro</option>';
      return;
    }

    taskResourceSelect.innerHTML = [
      '<option value="">Selecione um recurso</option>',
      ...orderedResources.map(
        (resource) => `<option value="${resource.id}">${escapeHtml(resource.nome)}</option>`
      )
    ].join("");
  }

  function applyView() {
    themesView.hidden = currentView !== "themes";
    tasksView.hidden = currentView !== "tasks";
    createTaskView.hidden = currentView !== "create";
    detailTaskView.hidden = currentView !== "detail";

    if (pageTitle) {
      if (currentView === "themes") {
        pageTitle.textContent = "BANCO DE TAREFAS 1/3";
      } else if (currentView === "tasks") {
        pageTitle.textContent = "BANCO DE TAREFAS 2/3";
      } else if (currentView === "create") {
        pageTitle.textContent = "BANCO DE TAREFAS 3/3";
      } else {
        pageTitle.textContent = "BANCO DE TAREFAS 3/3";
      }
    }
  }

  function abrirTemas() {
    currentView = "themes";
    selectedTaskId = null;
    updateDeleteButtonState();
    applyView();
  }

  function abrirTarefasDoTema(themeId) {
    selectedThemeId = themeId;
    currentView = "tasks";
    selectedTaskId = null;
    renderTasks();
    renderResourceOptions();
    applyView();
  }

  function abrirCriacaoDeTarefa() {
    const selectedTheme = getSelectedTheme();

    if (!selectedTheme) {
      setScreenMessage("Selecione um tema antes de criar a tarefa.", "error");
      return;
    }

    if (!resources.length) {
      setScreenMessage("Cadastre pelo menos um recurso no Supabase antes de criar a tarefa.", "error");
      return;
    }

    currentView = "create";
    setScreenMessage();
    taskThemeName.value = selectedTheme.nome || "";
    taskPdfFile.value = "";
    taskVideoLink.value = "";
    taskResourceSelect.value = "";
    setCreateTaskMessage();
    applyView();
  }

  async function abrirDetalheDaTarefa() {
    const selectedTheme = getSelectedTheme();
    const selectedTask = getSelectedTask();

    if (!selectedTask) {
      return;
    }

    currentView = "detail";
    setScreenMessage();

    if (detailThemeName) {
      detailThemeName.textContent = selectedTheme?.nome || "-";
    }

    if (detailResourceName) {
      detailResourceName.textContent = getResourceName(selectedTask.recurso_id);
    }

    if (detailPdfFrame) {
      detailPdfFrame.removeAttribute("src");
    }

    if (selectedTask.pdf_path) {
      try {
        const { data, error } = await supabase.storage
          .from(PDF_BUCKET)
          .createSignedUrl(selectedTask.pdf_path, 60);

        if (error || !data?.signedUrl) {
          throw new Error(error?.message || "Não foi possível carregar a prévia do PDF.");
        }

        if (detailPdfFrame) {
          detailPdfFrame.src = data.signedUrl;
        }
        if (detailPdfWrapper) {
          detailPdfWrapper.hidden = false;
        }
        if (detailPdfEmpty) {
          detailPdfEmpty.hidden = true;
        }
      } catch (error) {
        if (detailPdfWrapper) {
          detailPdfWrapper.hidden = true;
        }
        if (detailPdfFrame) {
          detailPdfFrame.removeAttribute("src");
        }
        if (detailPdfEmpty) {
          detailPdfEmpty.hidden = false;
          detailPdfEmpty.textContent =
            error.message || "Não foi possível carregar a prévia do PDF.";
        }
      }
    } else {
      if (detailPdfWrapper) {
        detailPdfWrapper.hidden = true;
      }
      if (detailPdfEmpty) {
        detailPdfEmpty.hidden = false;
        detailPdfEmpty.textContent = "Esta tarefa não possui PDF vinculado.";
      }
    }

    if (selectedTask.video_link) {
      if (detailVideoLink) {
        detailVideoLink.href = selectedTask.video_link;
        detailVideoLink.textContent = selectedTask.video_link;
      }
      if (detailVideoWrapper) {
        detailVideoWrapper.hidden = false;
      }
      if (detailVideoEmpty) {
        detailVideoEmpty.hidden = true;
      }
    } else {
      if (detailVideoWrapper) {
        detailVideoWrapper.hidden = true;
      }
      if (detailVideoEmpty) {
        detailVideoEmpty.hidden = false;
      }
    }

    applyView();
  }

  async function excluirTarefaSelecionada() {
    if (!selectedTaskId) {
      return;
    }

    openDeleteTaskConfirmation();
  }

  async function confirmarExclusaoDaTarefa() {
    if (!confirmDeleteTaskId) {
      return;
    }

    const taskIdToDelete = confirmDeleteTaskId;
    const selectedTheme = getSelectedTheme();

    setButtonLoading(btnDeleteTask, true, "Excluindo...", "Excluir");
    setButtonLoading(btnConfirmDeleteTask, true, "Excluindo...", "Excluir");

    try {
      const { error } = await supabase
        .from("banco_tarefas_itens")
        .update({ ativo: false })
        .eq("id", taskIdToDelete);

      if (error) {
        throw new Error(error.message || "Não foi possível excluir a tarefa.");
      }

      await registrarEvento({
        evento: "banco_tarefa_excluida",
        pagina: "banco_de_tarefas",
        perfil: "profissional",
        userId: currentUser?.id || null,
        email: currentProfile?.email || currentUser?.email || null,
        contexto: {
          tarefa_id: taskIdToDelete,
          tema_id: selectedThemeId
        }
      });

      closeDeleteTaskConfirmation();
      selectedTaskId = null;
      await carregarDados();
      renderThemes();
      renderTasks();
      setScreenMessage("Tarefa excluída com sucesso.", "success");
    } catch (error) {
      console.error("Erro ao excluir tarefa do banco:", error);
      setScreenMessage(error.message || "Não foi possível excluir a tarefa.", "error");
    } finally {
      setButtonLoading(btnDeleteTask, false, "Excluindo...", "Excluir");
      setButtonLoading(btnConfirmDeleteTask, false, "Excluindo...", "Excluir");
      updateDeleteButtonState();
    }
  }

  async function uploadPdf(file, themeName, resourceName) {
    const fileBase64 = await fileToBase64(file);
    const response = await fetch(getPdfUploadEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: currentUser?.id || "",
        fileName: file.name || "material.pdf",
        fileBase64,
        scope: "banco-tarefas",
        themeName,
        resourceName
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.pdfPath) {
      throw new Error(payload?.error || "Não foi possível enviar o PDF.");
    }

    return payload.pdfPath;
  }

  async function salvarTarefa(event) {
    event.preventDefault();
    setCreateTaskMessage();

    const selectedTheme = getSelectedTheme();
    const recursoId = (taskResourceSelect?.value || "").trim();
    const videoLink = (taskVideoLink?.value || "").trim();
    const pdfFile = taskPdfFile?.files?.[0] || null;

    if (!selectedTheme) {
      setCreateTaskMessage("Selecione um tema antes de criar a tarefa.", "error");
      return;
    }

    if (!recursoId) {
      setCreateTaskMessage("Selecione um recurso.", "error");
      return;
    }

    if (!pdfFile && !videoLink) {
      setCreateTaskMessage("Informe um PDF ou um link de vídeo.", "error");
      return;
    }

    const resourceName = getResourceName(recursoId);
    const generatedTitle = `${selectedTheme.nome} - ${resourceName}`;

    setButtonLoading(btnSaveTask, true, "Gravando...", "Gravar tarefa");

    try {
      let pdfPath = null;

      if (pdfFile) {
        pdfPath = await uploadPdf(pdfFile, selectedTheme.nome || "tema", resourceName || "recurso");
      }

      const payload = {
        tema_id: selectedTheme.id,
        recurso_id: Number(recursoId),
        titulo: generatedTitle,
        pdf_path: pdfPath,
        pdf_nome: pdfFile?.name || null,
        video_link: videoLink || null,
        status: "publicada",
        ativo: true,
        autor_user_id: currentUser.id,
        autor_nome: currentProfile?.nome || currentProfile?.email || currentUser.email || "Profissional"
      };

      const { error } = await supabase.from("banco_tarefas_itens").insert(payload);

      if (error) {
        throw new Error(error.message || "Não foi possível gravar a tarefa.");
      }

      await registrarEvento({
        evento: "banco_tarefa_criada",
        pagina: "banco_de_tarefas",
        perfil: "profissional",
        userId: currentUser.id,
        email: currentProfile?.email || currentUser.email || null,
        contexto: {
          tema_id: selectedTheme.id,
          recurso_id: Number(recursoId)
        }
      });

      await carregarDados();
      renderThemes();
      renderTasks();
      window.alert("Tarefa cadastrada com sucesso.");
      abrirTarefasDoTema(selectedTheme.id);
    } catch (error) {
      console.error("Erro ao salvar tarefa do banco:", error);
      setCreateTaskMessage(error.message || "Não foi possível gravar a tarefa.", "error");
    } finally {
      setButtonLoading(btnSaveTask, false, "Gravando...", "Gravar tarefa");
    }
  }

  if (themesList) {
    themesList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-theme-id]");
      if (!button) return;
      abrirTarefasDoTema(button.getAttribute("data-theme-id"));
    });
  }

  if (tasksList) {
    tasksList.addEventListener("click", (event) => {
      const deleteButton = event.target.closest("[data-task-delete-id]");
      if (deleteButton) {
        selectedTaskId = deleteButton.getAttribute("data-task-delete-id");
        renderTasks();
        excluirTarefaSelecionada();
        return;
      }

      const detailButton = event.target.closest("[data-task-detail-id]");
      if (detailButton) {
        selectedTaskId = detailButton.getAttribute("data-task-detail-id");
        renderTasks();
        abrirDetalheDaTarefa();
        return;
      }

      const row = event.target.closest("[data-task-id]");
      if (!row) return;

      const clickedTaskId = row.getAttribute("data-task-id");
      selectedTaskId = String(selectedTaskId) === String(clickedTaskId) ? null : clickedTaskId;
      renderTasks();
    });

    tasksList.addEventListener("keydown", (event) => {
      const row = event.target.closest("[data-task-id]");
      if (!row) return;

      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      const clickedTaskId = row.getAttribute("data-task-id");
      selectedTaskId = String(selectedTaskId) === String(clickedTaskId) ? null : clickedTaskId;
      renderTasks();
    });
  }

  if (btnBack) {
    btnBack.addEventListener("click", () => {
      if (currentView === "create" || currentView === "detail") {
        abrirTarefasDoTema(selectedThemeId);
        return;
      }

      if (currentView === "tasks") {
        abrirTemas();
        return;
      }

      window.location.href = "../profissional/index.html";
    });
  }

  if (btnOpenCreateTask) {
    btnOpenCreateTask.addEventListener("click", abrirCriacaoDeTarefa);
  }

  if (btnDetailTask) {
    btnDetailTask.addEventListener("click", abrirDetalheDaTarefa);
  }

  if (btnDeleteTask) {
    btnDeleteTask.addEventListener("click", excluirTarefaSelecionada);
  }

  if (btnCancelDeleteTask) {
    btnCancelDeleteTask.addEventListener("click", closeDeleteTaskConfirmation);
  }

  if (btnConfirmDeleteTask) {
    btnConfirmDeleteTask.addEventListener("click", confirmarExclusaoDaTarefa);
  }

  if (btnBackFromDetail) {
    btnBackFromDetail.addEventListener("click", () => {
      currentView = "tasks";
      applyView();
    });
  }

  if (btnCancelCreateTask) {
    btnCancelCreateTask.addEventListener("click", () => {
      abrirTarefasDoTema(selectedThemeId);
    });
  }

  if (createTaskForm) {
    createTaskForm.addEventListener("submit", salvarTarefa);
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

    if (
      deleteTaskConfirmOverlay &&
      !deleteTaskConfirmOverlay.hidden &&
      event.target === deleteTaskConfirmOverlay
    ) {
      closeDeleteTaskConfirmation();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (deleteTaskConfirmOverlay && !deleteTaskConfirmOverlay.hidden) {
        closeDeleteTaskConfirmation();
        return;
      }
      fecharMenuInferior();
    }
  });

  async function iniciar() {
    setScreenMessage();
    const ok = await validarProfissional();
    if (!ok) return;

    await carregarDados();
    renderThemes();
    renderTasks();
    renderResourceOptions();
    updateDeleteButtonState();
    applyView();
  }

  iniciar().catch((error) => {
    console.error("Erro na tela banco de tarefas:", error);
    setScreenMessage(error.message || "Não foi possível carregar o banco de tarefas.");
  });
});
