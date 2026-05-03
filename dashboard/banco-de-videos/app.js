import supabase from "../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const btnBack = document.getElementById("btnBack");
  const pageTitle = document.getElementById("pageTitle");
  const screenMessage = document.getElementById("screenMessage");

  const themesView = document.getElementById("themesView");
  const videosView = document.getElementById("videosView");
  const createVideoView = document.getElementById("createVideoView");
  const detailVideoView = document.getElementById("detailVideoView");

  const themesEmptyState = document.getElementById("themesEmptyState");
  const themesList = document.getElementById("themesList");
  const videosEmptyState = document.getElementById("videosEmptyState");
  const videosList = document.getElementById("videosList");
  const selectedThemeTitle = document.getElementById("selectedThemeTitle");
  const btnDetailVideo = document.getElementById("btnDetailVideo");
  const btnDeleteVideo = document.getElementById("btnDeleteVideo");
  const deleteVideoConfirmOverlay = document.getElementById("deleteVideoConfirmOverlay");
  const deleteVideoConfirmDetails = document.getElementById("deleteVideoConfirmDetails");
  const btnCancelDeleteVideo = document.getElementById("btnCancelDeleteVideo");
  const btnConfirmDeleteVideo = document.getElementById("btnConfirmDeleteVideo");

  const btnOpenCreateVideo = document.getElementById("btnOpenCreateVideo");
  const btnCancelCreateVideo = document.getElementById("btnCancelCreateVideo");
  const btnBackFromDetail = document.getElementById("btnBackFromDetail");
  const createVideoForm = document.getElementById("createVideoForm");
  const videoThemeName = document.getElementById("videoThemeName");
  const videoResourceSelect = document.getElementById("videoResourceSelect");
  const videoAuthorName = document.getElementById("videoAuthorName");
  const videoAuthorContact = document.getElementById("videoAuthorContact");
  const videoDescriptionInput = document.getElementById("videoDescriptionInput");
  const videoLinkInput = document.getElementById("videoLinkInput");
  const createVideoMessage = document.getElementById("createVideoMessage");
  const btnSaveVideo = document.getElementById("btnSaveVideo");
  const detailThemeName = document.getElementById("detailThemeName");
  const detailResourceName = document.getElementById("detailResourceName");
  const detailVideoAuthor = document.getElementById("detailVideoAuthor");
  const detailVideoAuthorContact = document.getElementById("detailVideoAuthorContact");
  const detailVideoDescription = document.getElementById("detailVideoDescription");
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
  let selectedVideoId = null;
  let confirmDeleteVideoId = null;
  let themes = [];
  let resources = [];
  let videos = [];

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

  function setCreateVideoMessage(text = "", type = "error") {
    if (!createVideoMessage) return;

    if (!text) {
      createVideoMessage.hidden = true;
      createVideoMessage.textContent = "";
      createVideoMessage.className = "screen-message";
      return;
    }

    createVideoMessage.hidden = false;
    createVideoMessage.textContent = text;
    createVideoMessage.className = `screen-message screen-message--${type}`;
  }

  function openDeleteVideoConfirmation() {
    if (!deleteVideoConfirmOverlay || !selectedVideoId) return;

    const selectedTheme = getSelectedTheme();
    const selectedVideo = getSelectedVideo();
    const resourceName = getResourceName(selectedVideo?.recurso_id);

    confirmDeleteVideoId = selectedVideoId;
    if (deleteVideoConfirmDetails) {
      deleteVideoConfirmDetails.innerHTML = `
        <div>Tema: ${escapeHtml(selectedTheme?.nome || "-")}</div>
        <div>Recurso: ${escapeHtml(resourceName || "-")}</div>
      `;
    }

    deleteVideoConfirmOverlay.hidden = false;
    btnConfirmDeleteVideo?.focus();
  }

  function closeDeleteVideoConfirmation() {
    if (!deleteVideoConfirmOverlay) return;
    deleteVideoConfirmOverlay.hidden = true;
    confirmDeleteVideoId = null;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  function getVideosForSelectedTheme() {
    return videos.filter((video) => String(video.tema_id) === String(selectedThemeId));
  }

  function getSelectedVideo() {
    return videos.find((video) => String(video.id) === String(selectedVideoId)) || null;
  }

  function updateDeleteButtonState() {
    if (!btnDeleteVideo) return;
    btnDeleteVideo.disabled = !selectedVideoId;
    if (btnDetailVideo) {
      btnDetailVideo.disabled = !selectedVideoId;
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
        throw new Error(`Falha ao obter sessao autenticada: ${sessionError.message}`);
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
      throw new Error(`Falha ao obter usuario autenticado: ${userError.message}`);
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
      pagina: "banco_de_videos",
      perfil: "profissional",
      userId: currentUser.id,
      email: perfil.email || currentUser.email || null
    });

    return true;
  }

  async function sairDoSistema() {
    await registrarEvento({
      evento: "logout",
      pagina: "banco_de_videos",
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
    const [themesResponse, resourcesResponse, videosResponse] = await Promise.all([
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
        .from("banco_videos_itens")
        .select("id, tema_id, recurso_id, titulo, descricao, video_link, video_autor_nome, video_autor_endereco, created_at, ativo, status")
        .order("created_at", { ascending: false })
    ]);

    if (themesResponse.error) {
      throw new Error(`Falha ao carregar temas: ${themesResponse.error.message}`);
    }

    if (resourcesResponse.error) {
      throw new Error(`Falha ao carregar recursos: ${resourcesResponse.error.message}`);
    }

    if (videosResponse.error) {
      throw new Error(`Falha ao carregar videos: ${videosResponse.error.message}`);
    }

    themes = themesResponse.data || [];
    resources = resourcesResponse.data || [];
    videos = (videosResponse.data || []).filter((video) => video.ativo !== false);

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
        const total = videos.filter((video) => String(video.tema_id) === String(theme.id)).length;

        return `
          <button class="entity-row" type="button" data-theme-id="${escapeHtml(theme.id)}">
            <div class="entity-row__top">
              <h4 class="entity-row__title">${escapeHtml(theme.nome || "Tema")}</h4>
            </div>
            <div class="entity-row__meta">
              <span class="meta-chip">${escapeHtml(total)} video(s)</span>
            </div>
          </button>
        `;
      })
      .join("");
  }

  function renderVideos() {
    if (!videosList || !videosEmptyState) return;

    const selectedTheme = getSelectedTheme();
    const themeVideos = getVideosForSelectedTheme().sort((a, b) => {
      const orderDiff = getResourceOrder(a.recurso_id) - getResourceOrder(b.recurso_id);
      if (orderDiff !== 0) {
        return orderDiff;
      }

      const resourceNameDiff = getResourceName(a.recurso_id).localeCompare(getResourceName(b.recurso_id), "pt-BR", {
        sensitivity: "base"
      });

      if (resourceNameDiff !== 0) {
        return resourceNameDiff;
      }

      const authorDiff = String(a.video_autor_nome || "").localeCompare(String(b.video_autor_nome || ""), "pt-BR", {
        sensitivity: "base"
      });

      if (authorDiff !== 0) {
        return authorDiff;
      }

      return String(a.descricao || "").localeCompare(String(b.descricao || ""), "pt-BR", {
        sensitivity: "base"
      });
    });

    if (selectedThemeTitle) {
      selectedThemeTitle.textContent = selectedTheme?.nome || "Tema";
    }

    if (!themeVideos.length) {
      videosList.innerHTML = "";
      videosEmptyState.hidden = false;
      selectedVideoId = null;
      updateDeleteButtonState();
      return;
    }

    videosEmptyState.hidden = true;

    if (!themeVideos.some((video) => String(video.id) === String(selectedVideoId))) {
      selectedVideoId = null;
    }

    updateDeleteButtonState();

    videosList.innerHTML = themeVideos
      .map((video) => {
        const resourceName = getResourceName(video.recurso_id);
        const selectedClass = String(video.id) === String(selectedVideoId) ? "is-selected" : "";
        const isSelected = String(video.id) === String(selectedVideoId);

        return `
          <article
            class="task-row ${selectedClass}"
            data-video-id="${escapeHtml(video.id)}"
            role="button"
            tabindex="0"
            aria-pressed="${String(isSelected)}"
          >
            <div class="task-row__top">
              <h4 class="task-row__title">${escapeHtml(resourceName)}</h4>
            </div>
            <p class="task-row__subtitle">${escapeHtml(video.video_autor_nome || "Autor nao informado")}</p>
            <p class="task-row__description">${escapeHtml(video.descricao || "Sem descricao cadastrada.")}</p>
            <div class="task-row__meta">
              <div class="task-row__meta-group">
                <span class="meta-chip meta-chip--muted">Video</span>
              </div>
              <div class="task-row__actions">
                <button
                  class="task-row__delete"
                  type="button"
                  data-video-delete-id="${escapeHtml(video.id)}"
                >
                  Excluir
                </button>
                <button
                  class="task-row__detail"
                  type="button"
                  data-video-detail-id="${escapeHtml(video.id)}"
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
    if (!videoResourceSelect) return;

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
      videoResourceSelect.innerHTML = '<option value="">Cadastre recursos no Supabase primeiro</option>';
      return;
    }

    videoResourceSelect.innerHTML = [
      '<option value="">Selecione um recurso</option>',
      ...orderedResources.map(
        (resource) => `<option value="${resource.id}">${escapeHtml(resource.nome)}</option>`
      )
    ].join("");
  }

  function applyView() {
    themesView.hidden = currentView !== "themes";
    videosView.hidden = currentView !== "videos";
    createVideoView.hidden = currentView !== "create";
    detailVideoView.hidden = currentView !== "detail";

    if (pageTitle) {
      if (currentView === "themes") {
        pageTitle.textContent = "BANCO DE VIDEOS 1/3";
      } else if (currentView === "videos") {
        pageTitle.textContent = "BANCO DE VIDEOS 2/3";
      } else {
        pageTitle.textContent = "BANCO DE VIDEOS 3/3";
      }
    }
  }

  function abrirTemas() {
    currentView = "themes";
    selectedVideoId = null;
    updateDeleteButtonState();
    applyView();
  }

  function abrirVideosDoTema(themeId) {
    selectedThemeId = themeId;
    currentView = "videos";
    selectedVideoId = null;
    renderVideos();
    renderResourceOptions();
    applyView();
  }

  function abrirCriacaoDeVideo() {
    const selectedTheme = getSelectedTheme();

    if (!selectedTheme) {
      setScreenMessage("Selecione um tema antes de criar o video.", "error");
      return;
    }

    if (!resources.length) {
      setScreenMessage("Cadastre pelo menos um recurso no Supabase antes de criar o video.", "error");
      return;
    }

    currentView = "create";
    setScreenMessage();
    videoThemeName.value = selectedTheme.nome || "";
    videoResourceSelect.value = "";
    videoAuthorName.value = "";
    videoAuthorContact.value = "";
    videoDescriptionInput.value = "";
    videoLinkInput.value = "";
    setCreateVideoMessage();
    applyView();
  }

  async function abrirDetalheDoVideo() {
    const selectedTheme = getSelectedTheme();
    const selectedVideo = getSelectedVideo();

    if (!selectedVideo) {
      return;
    }

    currentView = "detail";
    setScreenMessage();

    if (detailThemeName) {
      detailThemeName.textContent = selectedTheme?.nome || "-";
    }

    if (detailResourceName) {
      detailResourceName.textContent = getResourceName(selectedVideo.recurso_id);
    }

    if (detailVideoAuthor) {
      detailVideoAuthor.textContent = selectedVideo.video_autor_nome || "-";
    }

    if (detailVideoAuthorContact) {
      detailVideoAuthorContact.textContent = selectedVideo.video_autor_endereco || "-";
    }

    if (detailVideoDescription) {
      detailVideoDescription.textContent = selectedVideo.descricao || "-";
    }

    if (selectedVideo.video_link) {
      if (detailVideoLink) {
        detailVideoLink.href = selectedVideo.video_link;
        detailVideoLink.textContent = selectedVideo.video_link;
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

  async function excluirVideoSelecionado() {
    if (!selectedVideoId) {
      return;
    }

    openDeleteVideoConfirmation();
  }

  async function confirmarExclusaoDoVideo() {
    if (!confirmDeleteVideoId) {
      return;
    }

    const videoIdToDelete = confirmDeleteVideoId;

    setButtonLoading(btnDeleteVideo, true, "Excluindo...", "Excluir");
    setButtonLoading(btnConfirmDeleteVideo, true, "Excluindo...", "Excluir");

    try {
      const { error } = await supabase
        .from("banco_videos_itens")
        .update({ ativo: false })
        .eq("id", videoIdToDelete);

      if (error) {
        throw new Error(error.message || "Nao foi possivel excluir o video.");
      }

      await registrarEvento({
        evento: "banco_video_excluido",
        pagina: "banco_de_videos",
        perfil: "profissional",
        userId: currentUser?.id || null,
        email: currentProfile?.email || currentUser?.email || null,
        contexto: {
          video_id: videoIdToDelete,
          tema_id: selectedThemeId
        }
      });

      closeDeleteVideoConfirmation();
      selectedVideoId = null;
      await carregarDados();
      renderThemes();
      renderVideos();
      setScreenMessage("Video excluido com sucesso.", "success");
    } catch (error) {
      console.error("Erro ao excluir video do banco:", error);
      setScreenMessage(error.message || "Nao foi possivel excluir o video.", "error");
    } finally {
      setButtonLoading(btnDeleteVideo, false, "Excluindo...", "Excluir");
      setButtonLoading(btnConfirmDeleteVideo, false, "Excluindo...", "Excluir");
      updateDeleteButtonState();
    }
  }

  async function salvarVideo(event) {
    event.preventDefault();
    setCreateVideoMessage();

    const selectedTheme = getSelectedTheme();
    const recursoId = (videoResourceSelect?.value || "").trim();
    const autorNome = (videoAuthorName?.value || "").trim();
    const autorEndereco = (videoAuthorContact?.value || "").trim();
    const descricao = (videoDescriptionInput?.value || "").trim();
    const videoLink = (videoLinkInput?.value || "").trim();

    if (!selectedTheme) {
      setCreateVideoMessage("Selecione um tema antes de criar o video.", "error");
      return;
    }

    if (!recursoId) {
      setCreateVideoMessage("Selecione um recurso.", "error");
      return;
    }

    if (!autorNome) {
      setCreateVideoMessage("Informe o autor do video.", "error");
      return;
    }

    if (!videoLink) {
      setCreateVideoMessage("Informe o link do video.", "error");
      return;
    }

    const resourceName = getResourceName(recursoId);
    const generatedTitle = `${selectedTheme.nome} - ${resourceName}`;

    setButtonLoading(btnSaveVideo, true, "Gravando...", "Gravar video");

    try {
      const payload = {
        tema_id: selectedTheme.id,
        recurso_id: Number(recursoId),
        titulo: generatedTitle,
        descricao: descricao || null,
        video_link: videoLink,
        video_autor_nome: autorNome,
        video_autor_endereco: autorEndereco || null,
        status: "publicado",
        ativo: true,
        autor_user_id: currentUser.id,
        autor_nome: currentProfile?.nome || currentProfile?.email || currentUser.email || "Profissional"
      };

      const { error } = await supabase.from("banco_videos_itens").insert(payload);

      if (error) {
        throw new Error(error.message || "Nao foi possivel gravar o video.");
      }

      await registrarEvento({
        evento: "banco_video_criado",
        pagina: "banco_de_videos",
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
      renderVideos();
      window.alert("Video cadastrado com sucesso.");
      abrirVideosDoTema(selectedTheme.id);
    } catch (error) {
      console.error("Erro ao salvar video do banco:", error);
      setCreateVideoMessage(error.message || "Nao foi possivel gravar o video.", "error");
    } finally {
      setButtonLoading(btnSaveVideo, false, "Gravando...", "Gravar video");
    }
  }

  if (themesList) {
    themesList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-theme-id]");
      if (!button) return;
      abrirVideosDoTema(button.getAttribute("data-theme-id"));
    });
  }

  if (videosList) {
    videosList.addEventListener("click", (event) => {
      const deleteButton = event.target.closest("[data-video-delete-id]");
      if (deleteButton) {
        selectedVideoId = deleteButton.getAttribute("data-video-delete-id");
        renderVideos();
        excluirVideoSelecionado();
        return;
      }

      const detailButton = event.target.closest("[data-video-detail-id]");
      if (detailButton) {
        selectedVideoId = detailButton.getAttribute("data-video-detail-id");
        renderVideos();
        abrirDetalheDoVideo();
        return;
      }

      const row = event.target.closest("[data-video-id]");
      if (!row) return;

      const clickedVideoId = row.getAttribute("data-video-id");
      selectedVideoId = String(selectedVideoId) === String(clickedVideoId) ? null : clickedVideoId;
      renderVideos();
    });

    videosList.addEventListener("keydown", (event) => {
      const row = event.target.closest("[data-video-id]");
      if (!row) return;

      if (event.key !== "Enter" && event.key !== " ") {
        return;
      }

      event.preventDefault();
      const clickedVideoId = row.getAttribute("data-video-id");
      selectedVideoId = String(selectedVideoId) === String(clickedVideoId) ? null : clickedVideoId;
      renderVideos();
    });
  }

  if (btnBack) {
    btnBack.addEventListener("click", () => {
      if (currentView === "create" || currentView === "detail") {
        abrirVideosDoTema(selectedThemeId);
        return;
      }

      if (currentView === "videos") {
        abrirTemas();
        return;
      }

      window.location.href = "../profissional/index.html";
    });
  }

  if (btnOpenCreateVideo) {
    btnOpenCreateVideo.addEventListener("click", abrirCriacaoDeVideo);
  }

  if (btnDetailVideo) {
    btnDetailVideo.addEventListener("click", abrirDetalheDoVideo);
  }

  if (btnDeleteVideo) {
    btnDeleteVideo.addEventListener("click", excluirVideoSelecionado);
  }

  if (btnCancelDeleteVideo) {
    btnCancelDeleteVideo.addEventListener("click", closeDeleteVideoConfirmation);
  }

  if (btnConfirmDeleteVideo) {
    btnConfirmDeleteVideo.addEventListener("click", confirmarExclusaoDoVideo);
  }

  if (btnBackFromDetail) {
    btnBackFromDetail.addEventListener("click", () => {
      currentView = "videos";
      applyView();
    });
  }

  if (btnCancelCreateVideo) {
    btnCancelCreateVideo.addEventListener("click", () => {
      abrirVideosDoTema(selectedThemeId);
    });
  }

  if (createVideoForm) {
    createVideoForm.addEventListener("submit", salvarVideo);
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
      deleteVideoConfirmOverlay &&
      !deleteVideoConfirmOverlay.hidden &&
      event.target === deleteVideoConfirmOverlay
    ) {
      closeDeleteVideoConfirmation();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      if (deleteVideoConfirmOverlay && !deleteVideoConfirmOverlay.hidden) {
        closeDeleteVideoConfirmation();
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
    renderVideos();
    renderResourceOptions();
    updateDeleteButtonState();
    applyView();
  }

  iniciar().catch((error) => {
    console.error("Erro na tela banco de videos:", error);
    setScreenMessage(error.message || "Nao foi possivel carregar o banco de videos.");
  });
});
