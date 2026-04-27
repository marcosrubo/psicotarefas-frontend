import supabase from "../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const PDF_BUCKET = "banco-tarefas-pdf";

  const btnBack = document.getElementById("btnBack");
  const professionalLine = document.getElementById("professionalLine");
  const screenMessage = document.getElementById("screenMessage");
  const themesCount = document.getElementById("themesCount");
  const resourcesCount = document.getElementById("resourcesCount");
  const viewTitle = document.getElementById("viewTitle");
  const viewDescription = document.getElementById("viewDescription");

  const themesView = document.getElementById("themesView");
  const tasksView = document.getElementById("tasksView");
  const createTaskView = document.getElementById("createTaskView");

  const themesEmptyState = document.getElementById("themesEmptyState");
  const themesList = document.getElementById("themesList");
  const tasksEmptyState = document.getElementById("tasksEmptyState");
  const tasksList = document.getElementById("tasksList");
  const selectedThemeTitle = document.getElementById("selectedThemeTitle");
  const selectedThemeSubtitle = document.getElementById("selectedThemeSubtitle");

  const btnOpenCreateTask = document.getElementById("btnOpenCreateTask");
  const btnCancelCreateTask = document.getElementById("btnCancelCreateTask");
  const createTaskForm = document.getElementById("createTaskForm");
  const taskThemeName = document.getElementById("taskThemeName");
  const taskResourceSelect = document.getElementById("taskResourceSelect");
  const taskPdfFile = document.getElementById("taskPdfFile");
  const taskVideoLink = document.getElementById("taskVideoLink");
  const createTaskMessage = document.getElementById("createTaskMessage");
  const btnSaveTask = document.getElementById("btnSaveTask");

  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");

  let currentUser = null;
  let currentProfile = null;
  let currentView = "themes";
  let selectedThemeId = null;
  let themes = [];
  let resources = [];
  let tasks = [];

  function esperar(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
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

  function getTasksForSelectedTheme() {
    return tasks.filter((task) => String(task.tema_id) === String(selectedThemeId));
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
        .select("id, nome")
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

  function renderHeaderData() {
    if (professionalLine) {
      professionalLine.textContent = currentProfile?.nome || currentProfile?.email || "Profissional";
    }

    if (themesCount) {
      themesCount.textContent = String(themes.length);
    }

    if (resourcesCount) {
      resourcesCount.textContent = String(resources.length);
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
    const themeTasks = getTasksForSelectedTheme();

    if (selectedThemeTitle) {
      selectedThemeTitle.textContent = selectedTheme?.nome || "Tema";
    }

    if (selectedThemeSubtitle) {
      selectedThemeSubtitle.textContent = `${themeTasks.length} tarefa(s) cadastrada(s) para este tema.`;
    }

    if (btnOpenCreateTask) {
      btnOpenCreateTask.disabled = !selectedTheme || resources.length === 0;
    }

    if (!themeTasks.length) {
      tasksList.innerHTML = "";
      tasksEmptyState.hidden = false;
      return;
    }

    tasksEmptyState.hidden = true;

    tasksList.innerHTML = themeTasks
      .map((task) => {
        const resourceName = getResourceName(task.recurso_id);
        const hasPdf = Boolean(task.pdf_path);
        const hasVideo = Boolean(task.video_link);

        return `
          <article class="task-row">
            <div class="task-row__top">
              <h4 class="task-row__title">${escapeHtml(selectedTheme?.nome || "Tema")} - ${escapeHtml(resourceName)}</h4>
            </div>
            <div class="task-row__meta">
              <span class="meta-chip">${escapeHtml(resourceName)}</span>
              ${hasPdf ? '<span class="meta-chip meta-chip--muted">PDF</span>' : ""}
              ${hasVideo ? '<span class="meta-chip meta-chip--muted">Vídeo</span>' : ""}
              <span class="meta-chip meta-chip--muted">${escapeHtml(formatDateTime(task.created_at))}</span>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderResourceOptions() {
    if (!taskResourceSelect) return;

    if (!resources.length) {
      taskResourceSelect.innerHTML = '<option value="">Cadastre recursos no Supabase primeiro</option>';
      return;
    }

    taskResourceSelect.innerHTML = [
      '<option value="">Selecione um recurso</option>',
      ...resources.map((resource) => `<option value="${resource.id}">${escapeHtml(resource.nome)}</option>`)
    ].join("");
  }

  function updateViewCopy() {
    const selectedTheme = getSelectedTheme();

    if (currentView === "themes") {
      viewTitle.textContent = "Temas cadastrados";
      viewDescription.textContent = "Escolha um tema para visualizar e manter as tarefas cadastradas.";
      return;
    }

    if (currentView === "tasks") {
      viewTitle.textContent = selectedTheme?.nome || "Tarefas do tema";
      viewDescription.textContent = "Veja as tarefas já cadastradas e abra a criação de novas tarefas para este tema.";
      return;
    }

    viewTitle.textContent = "Criar tarefa";
    viewDescription.textContent = `Tema selecionado: ${selectedTheme?.nome || "-"}. Escolha um recurso e informe PDF ou vídeo.`;
  }

  function applyView() {
    themesView.hidden = currentView !== "themes";
    tasksView.hidden = currentView !== "tasks";
    createTaskView.hidden = currentView !== "create";
    updateViewCopy();
  }

  function abrirTemas() {
    currentView = "themes";
    applyView();
  }

  function abrirTarefasDoTema(themeId) {
    selectedThemeId = themeId;
    currentView = "tasks";
    renderTasks();
    renderResourceOptions();
    applyView();
  }

  function abrirCriacaoDeTarefa() {
    const selectedTheme = getSelectedTheme();
    if (!selectedTheme) return;

    currentView = "create";
    taskThemeName.value = selectedTheme.nome || "";
    taskPdfFile.value = "";
    taskVideoLink.value = "";
    taskResourceSelect.value = "";
    setCreateTaskMessage();
    applyView();
  }

  async function uploadPdf(file, themeName, resourceName) {
    const extension = (file.name.split(".").pop() || "pdf").toLowerCase();
    const fileName = `${Date.now()}-${slugify(themeName)}-${slugify(resourceName || "recurso")}.${extension}`;
    const filePath = `banco-tarefas/${slugify(themeName)}/${fileName}`;

    const { error } = await supabase.storage
      .from(PDF_BUCKET)
      .upload(filePath, file, {
        upsert: false,
        contentType: file.type || "application/pdf"
      });

    if (error) {
      throw new Error(`Não foi possível enviar o PDF: ${error.message}`);
    }

    return filePath;
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
      renderHeaderData();
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

  if (btnBack) {
    btnBack.addEventListener("click", () => {
      if (currentView === "create") {
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
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      fecharMenuInferior();
    }
  });

  async function iniciar() {
    setScreenMessage();
    const ok = await validarProfissional();
    if (!ok) return;

    await carregarDados();
    renderHeaderData();
    renderThemes();
    renderTasks();
    renderResourceOptions();
    applyView();
  }

  iniciar().catch((error) => {
    console.error("Erro na tela banco de tarefas:", error);
    setScreenMessage(error.message || "Não foi possível carregar o banco de tarefas.");
  });
});
