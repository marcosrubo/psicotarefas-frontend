import supabase from "../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const professionalLine = document.getElementById("professionalLine");
  const statThemes = document.getElementById("statThemes");
  const statTasks = document.getElementById("statTasks");
  const statPdfs = document.getElementById("statPdfs");

  const btnToggleThemeForm = document.getElementById("btnToggleThemeForm");
  const btnToggleLibraryTaskForm = document.getElementById("btnToggleLibraryTaskForm");
  const btnEditSelectedTheme = document.getElementById("btnEditSelectedTheme");
  const btnCloseThemeForm = document.getElementById("btnCloseThemeForm");
  const btnCloseLibraryTaskForm = document.getElementById("btnCloseLibraryTaskForm");
  const btnCloseEditTheme = document.getElementById("btnCloseEditTheme");
  const btnSaveTheme = document.getElementById("btnSaveTheme");
  const btnSaveLibraryTask = document.getElementById("btnSaveLibraryTask");
  const btnUpdateTheme = document.getElementById("btnUpdateTheme");

  const themeFormPanel = document.getElementById("themeFormPanel");
  const libraryTaskFormPanel = document.getElementById("libraryTaskFormPanel");
  const editThemePanel = document.getElementById("editThemePanel");

  const themeForm = document.getElementById("themeForm");
  const libraryTaskForm = document.getElementById("libraryTaskForm");
  const editThemeForm = document.getElementById("editThemeForm");
  const themeName = document.getElementById("themeName");
  const themeDescription = document.getElementById("themeDescription");
  const themeFormMessage = document.getElementById("themeFormMessage");
  const editThemeName = document.getElementById("editThemeName");
  const editThemeDescription = document.getElementById("editThemeDescription");
  const editThemeFormMessage = document.getElementById("editThemeFormMessage");

  const themesList = document.getElementById("themesList");
  const libraryList = document.getElementById("libraryList");
  const libraryEmptyState = document.getElementById("libraryEmptyState");
  const libraryPanelTitle = document.getElementById("libraryPanelTitle");
  const libraryPanelSubtitle = document.getElementById("libraryPanelSubtitle");
  const libraryTaskTheme = document.getElementById("libraryTaskTheme");
  const libraryTaskTitle = document.getElementById("libraryTaskTitle");
  const libraryTaskSummary = document.getElementById("libraryTaskSummary");
  const libraryTaskPdf = document.getElementById("libraryTaskPdf");
  const libraryTaskStatus = document.getElementById("libraryTaskStatus");
  const libraryTaskFormMessage = document.getElementById("libraryTaskFormMessage");

  const PDF_BUCKET = "banco-tarefas-pdf";

  let currentUser = null;
  let currentProfile = null;
  let selectedThemeId = null;
  let isLoading = false;
  let themes = [];
  let libraryTasks = [];

  function esperar(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
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

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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

  function setButtonLoading(button, isBusy, busyLabel, idleLabel) {
    if (!button) return;
    button.disabled = isBusy;
    button.textContent = isBusy ? busyLabel : idleLabel;
  }

  function setFormMessage(element, text = "", type = "") {
    if (!element) return;

    element.textContent = text;
    element.className = "form-message";

    if (type) {
      element.classList.add(`form-message--${type}`);
      element.hidden = false;
    } else {
      element.hidden = true;
    }
  }

  function getSelectedTheme() {
    return themes.find((theme) => theme.id === selectedThemeId) || null;
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

  async function carregarBancoTarefas() {
    isLoading = true;

    const [themesResponse, tasksResponse] = await Promise.all([
      supabase
        .from("banco_tarefas_temas")
        .select("id, nome, descricao_curta, ordem, ativo, autor_user_id, created_at")
        .order("ordem", { ascending: true })
        .order("nome", { ascending: true }),
      supabase
        .from("banco_tarefas_itens")
        .select("id, tema_id, titulo, descricao_curta, pdf_path, pdf_nome, autor_user_id, autor_nome, status, numero_usos, ativo, created_at")
        .order("created_at", { ascending: false })
    ]);

    if (themesResponse.error) {
      throw new Error(`Falha ao carregar temas do banco: ${themesResponse.error.message}`);
    }

    if (tasksResponse.error) {
      throw new Error(`Falha ao carregar tarefas do banco: ${tasksResponse.error.message}`);
    }

    const loadedThemes = themesResponse.data || [];
    const loadedTasks = tasksResponse.data || [];

    themes = loadedThemes.map((theme) => ({
      ...theme,
      total: loadedTasks.filter((task) => task.tema_id === theme.id && task.ativo !== false).length
    }));

    libraryTasks = loadedTasks;

    if (!themes.length) {
      selectedThemeId = null;
    } else if (!themes.some((theme) => theme.id === selectedThemeId)) {
      selectedThemeId = themes[0].id;
    }

    isLoading = false;
  }

  function renderProfessionalName() {
    if (!professionalLine) return;
    const nome = currentProfile?.nome || currentProfile?.email || "Profissional";
    professionalLine.textContent = `PROFISSIONAL: ${nome}`;
  }

  function renderStats() {
    if (statThemes) statThemes.textContent = String(themes.length);
    if (statTasks) statTasks.textContent = String(libraryTasks.length);
    if (statPdfs) {
      statPdfs.textContent = String(
        libraryTasks.filter((task) => task.pdf_path).length
      );
    }
  }

  function renderThemeOptions() {
    if (!libraryTaskTheme) return;

    if (!themes.length) {
      libraryTaskTheme.innerHTML = `<option value="">Cadastre um tema primeiro</option>`;
      return;
    }

    libraryTaskTheme.innerHTML = themes
      .map(
        (theme) =>
          `<option value="${theme.id}" ${theme.id === selectedThemeId ? "selected" : ""}>${escapeHtml(
            theme.nome
          )}</option>`
      )
      .join("");
  }

  function renderThemes() {
    if (!themesList) return;

    if (!themes.length) {
      themesList.innerHTML = `
        <div class="empty-state">
          Nenhum tema cadastrado ainda. Use <strong>Novo tema</strong> para começar a biblioteca.
        </div>
      `;
      return;
    }

    themesList.innerHTML = themes
      .map((theme) => {
        const activeClass = theme.id === selectedThemeId ? "is-active" : "";

        return `
          <article class="theme-card ${activeClass}" data-theme-id="${theme.id}">
            <div class="theme-card__top">
              <h4>${escapeHtml(theme.nome)}</h4>
              <span class="meta-chip">${theme.total} tarefa(s)</span>
            </div>
            <p>${escapeHtml(theme.descricao_curta || "Tema público colaborativo do banco de tarefas.")}</p>
            <div class="theme-meta">
              <span class="meta-chip meta-chip--muted">Tema público</span>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderLibraryList() {
    if (!libraryList || !libraryPanelTitle || !libraryPanelSubtitle || !libraryEmptyState) return;

    const selectedTheme = getSelectedTheme();
    const filteredTasks = libraryTasks.filter((task) => task.tema_id === selectedThemeId);

    if (btnEditSelectedTheme) {
      btnEditSelectedTheme.hidden = !selectedTheme;
      btnEditSelectedTheme.disabled = !selectedTheme;
    }

    if (selectedTheme) {
      libraryPanelTitle.textContent = `Tarefas do tema: ${selectedTheme.nome}`;
      libraryPanelSubtitle.textContent =
        selectedTheme.descricao_curta ||
        "Visualize atividades públicas em PDF organizadas por tema.";
    } else {
      libraryPanelTitle.textContent = "Tarefas da biblioteca";
      libraryPanelSubtitle.textContent =
        "Cadastre temas e atividades públicas para começar a construir o banco.";
    }

    if (!filteredTasks.length) {
      libraryList.innerHTML = "";
      libraryEmptyState.hidden = false;
      return;
    }

    libraryEmptyState.hidden = true;

    libraryList.innerHTML = filteredTasks
      .map(
        (task) => `
          <article class="library-card">
            <div class="library-card__top">
              <h4>${escapeHtml(task.titulo)}</h4>
              <span class="meta-chip">${escapeHtml(getStatusLabel(task.status))}</span>
            </div>
            <p>${escapeHtml(task.descricao_curta || "Sem descrição curta informada.")}</p>
            <div class="library-meta">
              <span class="meta-chip meta-chip--muted">${escapeHtml(task.pdf_nome || "PDF sem nome")}</span>
              <span class="meta-chip meta-chip--muted">Autor: ${escapeHtml(task.autor_nome || "Profissional")}</span>
              <span class="meta-chip meta-chip--muted">${escapeHtml(formatDateTime(task.created_at))}</span>
            </div>
            <div class="form-actions form-actions--inline">
              <button
                class="btn-secondary"
                type="button"
                data-action="open-pdf"
                data-pdf-path="${escapeHtml(task.pdf_path)}"
              >
                Abrir PDF
              </button>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderAll() {
    renderProfessionalName();
    renderStats();
    renderThemeOptions();
    renderThemes();
    renderLibraryList();
  }

  function resetThemeForm() {
    if (themeForm) themeForm.reset();
    setFormMessage(themeFormMessage);
  }

  function resetEditThemeForm() {
    if (editThemeForm) editThemeForm.reset();
    setFormMessage(editThemeFormMessage);
  }

  function resetLibraryTaskForm() {
    if (libraryTaskForm) libraryTaskForm.reset();
    if (libraryTaskTheme && selectedThemeId) {
      libraryTaskTheme.value = String(selectedThemeId);
    }
    setFormMessage(libraryTaskFormMessage);
  }

  function openThemeForm() {
    if (themeFormPanel) themeFormPanel.hidden = false;
    resetThemeForm();
    themeName?.focus();
  }

  function closeThemeForm() {
    if (themeFormPanel) themeFormPanel.hidden = true;
    resetThemeForm();
  }

  function openEditThemeForm() {
    const selectedTheme = getSelectedTheme();
    if (!selectedTheme) return;

    if (editThemePanel) editThemePanel.hidden = false;
    if (editThemeName) editThemeName.value = selectedTheme.nome || "";
    if (editThemeDescription) editThemeDescription.value = selectedTheme.descricao_curta || "";
    setFormMessage(editThemeFormMessage);
    editThemeName?.focus();
  }

  function closeEditThemeForm() {
    if (editThemePanel) editThemePanel.hidden = true;
    resetEditThemeForm();
  }

  function openLibraryTaskForm() {
    if (libraryTaskFormPanel) libraryTaskFormPanel.hidden = false;
    renderThemeOptions();
    resetLibraryTaskForm();
    libraryTaskTitle?.focus();
  }

  function closeLibraryTaskForm() {
    if (libraryTaskFormPanel) libraryTaskFormPanel.hidden = true;
    resetLibraryTaskForm();
  }

  async function salvarEdicaoTema(event) {
    event.preventDefault();

    const selectedTheme = getSelectedTheme();
    const selectedThemeIdAtual = selectedTheme?.id || null;
    const nome = editThemeName?.value.trim() || "";
    const descricaoCurta = editThemeDescription?.value.trim() || "";

    if (!selectedTheme) {
      setFormMessage(editThemeFormMessage, "Selecione um tema para alterar.", "error");
      return;
    }

    if (!nome) {
      setFormMessage(editThemeFormMessage, "Informe o nome do tema.", "error");
      return;
    }

    setButtonLoading(btnUpdateTheme, true, "Salvando...", "Salvar alterações");
    setFormMessage(editThemeFormMessage);

    try {
      const { data: updatedTheme, error } = await supabase
        .from("banco_tarefas_temas")
        .update({
          nome,
          descricao_curta: descricaoCurta || null
        })
        .eq("id", selectedTheme.id)
        .select("id, nome, descricao_curta")
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!updatedTheme) {
        throw new Error("Não foi possível salvar este tema. Ele pode não estar editável para este usuário.");
      }

      themes = themes.map((theme) =>
        theme.id === selectedThemeIdAtual
          ? {
              ...theme,
              nome: updatedTheme.nome,
              descricao_curta: updatedTheme.descricao_curta || null
            }
          : theme
      );
      renderAll();

      await carregarBancoTarefas();
      renderAll();
      await registrarEvento({
        evento: "tema_banco_editado",
        pagina: "banco_de_tarefas",
        perfil: "profissional",
        userId: currentUser.id,
        email: currentProfile?.email || currentUser.email || null,
        contexto: {
          tema_id: selectedThemeIdAtual,
          tema: nome
        }
      });
      closeEditThemeForm();
    } catch (error) {
      setFormMessage(
        editThemeFormMessage,
        error.message || "Não foi possível atualizar o tema neste momento.",
        "error"
      );
    } finally {
      setButtonLoading(btnUpdateTheme, false, "Salvando...", "Salvar alterações");
    }
  }

  async function salvarTema(event) {
    event.preventDefault();

    const nome = themeName?.value.trim() || "";
    const descricaoCurta = themeDescription?.value.trim() || "";

    if (!nome) {
      setFormMessage(themeFormMessage, "Informe o nome do tema.", "error");
      return;
    }

    setButtonLoading(btnSaveTheme, true, "Salvando...", "Salvar tema");
    setFormMessage(themeFormMessage);

    try {
      const maiorOrdem = themes.reduce((max, item) => Math.max(max, Number(item.ordem) || 0), 0);

      const { error } = await supabase.from("banco_tarefas_temas").insert({
        nome,
        descricao_curta: descricaoCurta || null,
        ordem: maiorOrdem + 1,
        autor_user_id: currentUser.id
      });

      if (error) {
        throw new Error(error.message);
      }

      await carregarBancoTarefas();
      selectedThemeId =
        themes.find((theme) => theme.nome.toLowerCase() === nome.toLowerCase())?.id || selectedThemeId;
      renderAll();
      await registrarEvento({
        evento: "tema_banco_criado",
        pagina: "banco_de_tarefas",
        perfil: "profissional",
        userId: currentUser.id,
        email: currentProfile?.email || currentUser.email || null,
        contexto: {
          tema: nome
        }
      });
      closeThemeForm();
    } catch (error) {
      setFormMessage(
        themeFormMessage,
        error.message || "Não foi possível salvar o tema neste momento.",
        "error"
      );
    } finally {
      setButtonLoading(btnSaveTheme, false, "Salvando...", "Salvar tema");
    }
  }

  async function uploadPdf(file) {
    const sanitizedName = slugify(file.name.replace(/\.pdf$/i, "")) || "arquivo";
    const filePath = `${currentUser.id}/${Date.now()}-${sanitizedName}.pdf`;

    const { error } = await supabase.storage
      .from(PDF_BUCKET)
      .upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: "application/pdf"
      });

    if (error) {
      throw new Error(`Falha ao enviar PDF: ${error.message}`);
    }

    return {
      filePath,
      fileName: file.name
    };
  }

  async function salvarTarefaBiblioteca(event) {
    event.preventDefault();

    const temaId = Number.parseInt(libraryTaskTheme?.value || "", 10);
    const titulo = libraryTaskTitle?.value.trim() || "";
    const descricaoCurta = libraryTaskSummary?.value.trim() || "";
    const status = libraryTaskStatus?.value || "publicada";
    const arquivo = libraryTaskPdf?.files?.[0] || null;

    if (!temaId) {
      setFormMessage(libraryTaskFormMessage, "Selecione um tema para a tarefa.", "error");
      return;
    }

    if (!titulo) {
      setFormMessage(libraryTaskFormMessage, "Informe o título da tarefa da biblioteca.", "error");
      return;
    }

    if (!arquivo) {
      setFormMessage(libraryTaskFormMessage, "Selecione um PDF para publicar no banco.", "error");
      return;
    }

    if (arquivo.type !== "application/pdf") {
      setFormMessage(libraryTaskFormMessage, "O arquivo precisa ser um PDF válido.", "error");
      return;
    }

    setButtonLoading(btnSaveLibraryTask, true, "Publicando...", "Publicar no banco");
    setFormMessage(libraryTaskFormMessage);

    try {
      const uploaded = await uploadPdf(arquivo);
      const autorNome = currentProfile?.nome || currentProfile?.email || "Profissional";

      const { error } = await supabase.from("banco_tarefas_itens").insert({
        tema_id: temaId,
        titulo,
        descricao_curta: descricaoCurta || null,
        pdf_path: uploaded.filePath,
        pdf_nome: uploaded.fileName,
        autor_user_id: currentUser.id,
        autor_nome: autorNome,
        status,
        ativo: true
      });

      if (error) {
        throw new Error(error.message);
      }

      await carregarBancoTarefas();
      selectedThemeId = temaId;
      renderAll();
      await registrarEvento({
        evento: "tarefa_banco_publicada",
        pagina: "banco_de_tarefas",
        perfil: "profissional",
        userId: currentUser.id,
        email: currentProfile?.email || currentUser.email || null,
        contexto: {
          tema_id: temaId,
          titulo
        }
      });
      closeLibraryTaskForm();
    } catch (error) {
      setFormMessage(
        libraryTaskFormMessage,
        error.message || "Não foi possível publicar a tarefa no banco neste momento.",
        "error"
      );
    } finally {
      setButtonLoading(btnSaveLibraryTask, false, "Publicando...", "Publicar no banco");
    }
  }

  async function abrirPdf(pdfPath) {
    if (!pdfPath) return;

    try {
      await registrarEvento({
        evento: "pdf_banco_aberto",
        pagina: "banco_de_tarefas",
        perfil: "profissional",
        userId: currentUser?.id || null,
        email: currentProfile?.email || currentUser?.email || null,
        contexto: {
          pdf_path: pdfPath
        }
      });
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

  if (btnToggleThemeForm) {
    btnToggleThemeForm.addEventListener("click", openThemeForm);
  }

  if (btnToggleLibraryTaskForm) {
    btnToggleLibraryTaskForm.addEventListener("click", () => {
      if (!themes.length) {
        window.alert("Cadastre um tema antes de publicar uma tarefa no banco.");
        return;
      }
      openLibraryTaskForm();
    });
  }

  if (btnCloseThemeForm) {
    btnCloseThemeForm.addEventListener("click", closeThemeForm);
  }

  if (btnCloseLibraryTaskForm) {
    btnCloseLibraryTaskForm.addEventListener("click", closeLibraryTaskForm);
  }

  if (btnEditSelectedTheme) {
    btnEditSelectedTheme.addEventListener("click", openEditThemeForm);
  }

  if (btnCloseEditTheme) {
    btnCloseEditTheme.addEventListener("click", closeEditThemeForm);
  }

  if (themeForm) {
    themeForm.addEventListener("submit", salvarTema);
  }

  if (libraryTaskForm) {
    libraryTaskForm.addEventListener("submit", salvarTarefaBiblioteca);
  }

  if (editThemeForm) {
    editThemeForm.addEventListener("submit", salvarEdicaoTema);
  }

  if (themesList) {
    themesList.addEventListener("click", (event) => {
      const card = event.target.closest("[data-theme-id]");
      if (!card) return;

      selectedThemeId = Number.parseInt(card.getAttribute("data-theme-id") || "", 10);
      renderAll();
      const tema = themes.find((item) => item.id === selectedThemeId);
      registrarEvento({
        evento: "tema_banco_selecionado",
        pagina: "banco_de_tarefas",
        perfil: "profissional",
        userId: currentUser?.id || null,
        email: currentProfile?.email || currentUser?.email || null,
        contexto: {
          tema_id: selectedThemeId,
          tema: tema?.nome || null
        }
      });
    });
  }

  if (libraryList) {
    libraryList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-action='open-pdf']");
      if (!button) return;

      const pdfPath = button.getAttribute("data-pdf-path");
      abrirPdf(pdfPath);
    });
  }

  validarProfissional()
    .then(async (ok) => {
      if (!ok) return;
      await carregarBancoTarefas();
      renderAll();
    })
    .catch((error) => {
      console.error(error);
      window.alert(error.message || "Não foi possível carregar o Banco de Tarefas.");
    });
});
