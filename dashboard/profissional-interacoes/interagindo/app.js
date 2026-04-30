import supabase from "../../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const PDF_BUCKET = "banco-tarefas-pdf";
  const searchParams = new URLSearchParams(window.location.search);
  const taskId = (searchParams.get("task") || "").trim();
  const patientAlias = (searchParams.get("alias") || "").trim();

  const patientHeaderTitle = document.getElementById("patientHeaderTitle");
  const screenMessage = document.getElementById("screenMessage");
  const taskEmptyState = document.getElementById("taskEmptyState");
  const taskDetailCard = document.getElementById("taskDetailCard");
  const taskTypeLabel = document.getElementById("taskTypeLabel");
  const taskTitle = document.getElementById("taskTitle");
  const taskDescription = document.getElementById("taskDescription");
  const taskPdfSection = document.getElementById("taskPdfSection");
  const taskPdfName = document.getElementById("taskPdfName");
  const taskPdfFrame = document.getElementById("taskPdfFrame");
  const btnOpenTaskPdf = document.getElementById("btnOpenTaskPdf");
  const taskVideoSection = document.getElementById("taskVideoSection");
  const taskVideoHelper = document.getElementById("taskVideoHelper");
  const taskVideoFrame = document.getElementById("taskVideoFrame");
  const taskVideoNative = document.getElementById("taskVideoNative");
  const taskVideoInstagram = document.getElementById("taskVideoInstagram");
  const taskVideoEmpty = document.getElementById("taskVideoEmpty");
  const btnOpenTaskVideo = document.getElementById("btnOpenTaskVideo");
  const interactionsDivider = document.getElementById("interactionsDivider");
  const interactionsList = document.getElementById("interactionsList");
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
  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");
  const btnBack = document.getElementById("btnBack");

  let currentUser = null;
  let currentProfile = null;
  let currentTask = null;
  let currentInteractions = [];
  let editingInteractionId = null;
  let instagramScriptPromise = null;

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

  async function sairDoSistema() {
    await registrarEvento({
      evento: "logout",
      pagina: "profissional_interagindo",
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

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatarDataHora(dataIso) {
    if (!dataIso) return "-";
    return new Date(dataIso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function getTaskKind(task) {
    if (!task) {
      return { eyebrow: "Atividade", videoHelper: "Vídeo vinculado a esta atividade." };
    }
    if (task.origem_tipo === "banco" || task.origem_banco_tarefa_id) {
      return { eyebrow: "Banco de tarefas", videoHelper: "Vídeo associado ao material do banco de tarefas." };
    }
    if (task.origem_tipo === "ia" || task.pdf_path?.includes("/ia/")) {
      return { eyebrow: "Atividade gerada por IA", videoHelper: "Vídeo complementar vinculado a esta atividade gerada por IA." };
    }
    if (task.pdf_path && task.video_url) {
      return { eyebrow: "Atividade com PDF e vídeo", videoHelper: "Vídeo complementar enviado junto desta atividade." };
    }
    if (task.pdf_path) {
      return { eyebrow: "Atividade com PDF", videoHelper: "Vídeo vinculado a esta atividade." };
    }
    if (task.video_url) {
      return { eyebrow: "Atividade com vídeo", videoHelper: "Vídeo enviado pelo profissional para esta atividade." };
    }
    return { eyebrow: "Atividade simples", videoHelper: "Vídeo vinculado a esta atividade." };
  }

  function buildPdfPreviewUrl(signedUrl) {
    return `${signedUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`;
  }

  function resolveEmbeddedVideo(url) {
    if (!url) return null;
    try {
      const parsedUrl = new URL(url);
      const host = parsedUrl.hostname.replace(/^www\./, "");
      const pathname = parsedUrl.pathname;
      if (host === "youtube.com" || host === "m.youtube.com") {
        const videoId = parsedUrl.searchParams.get("v");
        if (videoId) return { type: "iframe", src: `https://www.youtube.com/embed/${videoId}` };
      }
      if (host === "youtu.be") {
        const videoId = pathname.replace(/^\/+/, "").split("/")[0];
        if (videoId) return { type: "iframe", src: `https://www.youtube.com/embed/${videoId}` };
      }
      if (host === "player.vimeo.com") return { type: "iframe", src: url };
      if (host === "vimeo.com") {
        const videoId = pathname.replace(/^\/+/, "").split("/")[0];
        if (videoId) return { type: "iframe", src: `https://player.vimeo.com/video/${videoId}` };
      }
      if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) return { type: "native", src: url };
    } catch {
      return null;
    }
    return null;
  }

  function getInstagramPermalink(url) {
    if (!url) return "";
    try {
      const parsedUrl = new URL(url);
      const host = parsedUrl.hostname.replace(/^www\./, "");
      if (host !== "instagram.com" && host !== "m.instagram.com" && host !== "instagr.am") return "";
      const cleanPath = parsedUrl.pathname.replace(/\/+$/, "");
      if (!cleanPath) return "";
      return `https://www.instagram.com${cleanPath}/?utm_source=ig_embed&utm_campaign=loading`;
    } catch {
      return "";
    }
  }

  function ensureInstagramEmbedScript() {
    if (instagramScriptPromise) return instagramScriptPromise;
    instagramScriptPromise = new Promise((resolve) => {
      if (window.instgrm?.Embeds?.process) {
        resolve(window.instgrm);
        return;
      }

      const existing = document.querySelector('script[data-instagram-embed="true"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(window.instgrm || null), { once: true });
        existing.addEventListener("error", () => resolve(null), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.async = true;
      script.defer = true;
      script.src = "https://www.instagram.com/embed.js";
      script.dataset.instagramEmbed = "true";
      script.onload = () => resolve(window.instgrm || null);
      script.onerror = () => resolve(null);
      document.body.appendChild(script);
    });
    return instagramScriptPromise;
  }

  async function obterUsuarioAutenticado() {
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(`Falha ao obter sessão autenticada: ${sessionError.message}`);
    }

    if (session?.user) return session.user;

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
      .select("nome, email, perfil")
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
      pagina: "profissional_interagindo",
      perfil: "profissional",
      userId: currentUser.id,
      email: currentProfile.email || currentUser.email || "",
      contexto: {
        tarefa_id: taskId || null
      }
    });

    return true;
  }

  async function carregarTarefa() {
    if (!taskId) {
      throw new Error("Nenhuma tarefa foi informada para interação.");
    }

    const { data, error } = await supabase
      .from("tarefas")
      .select("*")
      .eq("id", taskId)
      .eq("professional_user_id", currentUser.id)
      .single();

    if (error) {
      throw new Error(`Falha ao carregar a tarefa: ${error.message}`);
    }

    currentTask = data || null;

    if (!currentTask) {
      throw new Error("A tarefa selecionada não foi encontrada.");
    }
  }

  async function carregarInteracoes() {
    if (!currentTask?.id) {
      currentInteractions = [];
      return;
    }

    const { data, error } = await supabase
      .from("tarefa_interacoes")
      .select("*")
      .eq("tarefa_id", currentTask.id)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Falha ao carregar interações: ${error.message}`);
    }

    currentInteractions = data || [];
  }

  function cancelEditingInteraction() {
    editingInteractionId = null;
    if (interactionEditInput) interactionEditInput.value = "";
    setInteractionEditMessage();
    if (interactionEditCard) interactionEditCard.hidden = true;
  }

  function startEditingInteraction(interaction) {
    if (!interactionEditCard || !interactionEditInput) return;
    editingInteractionId = interaction.id;
    interactionEditInput.value = interaction.mensagem || "";
    setInteractionEditMessage();
    interactionEditCard.hidden = false;
    interactionEditInput.focus();
  }

  function renderInteractions() {
    if (!interactionsDivider || !interactionsList || !interactionFormCard) return;

    interactionsDivider.hidden = !currentInteractions.length;
    interactionsList.innerHTML = currentInteractions.map((interaction) => {
      const autorTipo = interaction.autor_tipo === "profissional" ? "profissional" : "paciente";
      const autorLabel = autorTipo === "profissional" ? "Profissional" : "Paciente";
      const canEdit = autorTipo === "profissional" && interaction.autor_user_id === currentUser.id;

      return `
        <article class="interaction-item interaction-item--${autorTipo}">
          <div class="interaction-item__top">
            <span class="interaction-item__author">${autorLabel}</span>
            <span class="interaction-item__time">${formatarDataHora(interaction.created_at)}</span>
          </div>
          <p class="interaction-item__text">${escapeHtml(interaction.mensagem || "")}</p>
          ${canEdit ? `
            <div class="interaction-item__actions">
              <button class="btn-secondary btn-secondary--small" type="button" data-action="edit-interaction" data-id="${interaction.id}">
                Alterar
              </button>
            </div>
          ` : ""}
        </article>
      `;
    }).join("");

    interactionFormCard.hidden = false;
  }

  async function renderTask() {
    if (!currentTask || !taskDetailCard) return;

    if (patientHeaderTitle) {
      patientHeaderTitle.textContent = `Paciente: ${patientAlias || "Paciente"}`;
    }

    const taskKind = getTaskKind(currentTask);
    taskTypeLabel.textContent = taskKind.eyebrow;
    taskTitle.textContent = currentTask.titulo || "Tarefa sem título";
    taskDescription.textContent = currentTask.descricao || "Sem descrição cadastrada.";

    taskDetailCard.hidden = false;
    taskEmptyState.hidden = true;

    if (currentTask.pdf_path) {
      const { data, error } = await supabase.storage
        .from(PDF_BUCKET)
        .createSignedUrl(currentTask.pdf_path, 3600);

      if (!error && data?.signedUrl) {
        taskPdfSection.hidden = false;
        taskPdfName.textContent = currentTask.pdf_nome || "PDF da atividade";
        taskPdfFrame.src = buildPdfPreviewUrl(data.signedUrl);
        btnOpenTaskPdf.href = data.signedUrl;
      } else {
        taskPdfSection.hidden = true;
      }
    } else {
      taskPdfSection.hidden = true;
    }

    taskVideoSection.hidden = true;
    taskVideoFrame.hidden = true;
    taskVideoFrame.removeAttribute("src");
    taskVideoNative.hidden = true;
    taskVideoNative.removeAttribute("src");
    taskVideoNative.load();
    taskVideoInstagram.hidden = true;
    taskVideoInstagram.innerHTML = "";
    taskVideoEmpty.hidden = true;

    if (currentTask.video_url) {
      taskVideoSection.hidden = false;
      taskVideoHelper.textContent = taskKind.videoHelper;
      btnOpenTaskVideo.href = currentTask.video_url;

      const instagramPermalink = getInstagramPermalink(currentTask.video_url);
      if (instagramPermalink) {
        taskVideoInstagram.hidden = false;
        taskVideoInstagram.innerHTML = `
          <blockquote class="instagram-media" data-instgrm-permalink="${instagramPermalink}" data-instgrm-version="14"></blockquote>
        `;
        const instgrm = await ensureInstagramEmbedScript();
        instgrm?.Embeds?.process?.();
      } else {
        const embeddedVideo = resolveEmbeddedVideo(currentTask.video_url);
        if (embeddedVideo?.type === "iframe") {
          taskVideoFrame.hidden = false;
          taskVideoFrame.src = embeddedVideo.src;
        } else if (embeddedVideo?.type === "native") {
          taskVideoNative.hidden = false;
          taskVideoNative.src = embeddedVideo.src;
          taskVideoNative.load();
        } else {
          taskVideoEmpty.hidden = false;
        }
      }
    }
  }

  async function criarInteracao() {
    const mensagem = interactionTextInput?.value.trim() || "";
    if (!mensagem) {
      setInteractionFormMessage("Escreva uma mensagem antes de enviar a interação.", "error");
      interactionTextInput?.focus();
      return;
    }

    setInteractionFormMessage();
    btnCreateInteraction.disabled = true;

    try {
      const { error } = await supabase.from("tarefa_interacoes").insert({
        tarefa_id: currentTask.id,
        autor_tipo: "profissional",
        autor_user_id: currentUser.id,
        mensagem
      });

      if (error) {
        throw new Error(`Falha ao registrar interação: ${error.message}`);
      }

      interactionTextInput.value = "";
      setInteractionFormMessage("Interação registrada com sucesso.", "success");

      await registrarEvento({
        evento: "interacao_tarefa_criada",
        pagina: "profissional_interagindo",
        perfil: "profissional",
        userId: currentUser.id,
        email: currentProfile.email || currentUser.email || null,
        contexto: {
          tarefa_id: currentTask.id,
          paciente_id: currentTask.patient_user_id || null
        }
      });

      await carregarInteracoes();
      renderInteractions();
    } catch (error) {
      console.error(error);
      setInteractionFormMessage(error.message || "Não foi possível registrar a interação.", "error");
    } finally {
      btnCreateInteraction.disabled = false;
    }
  }

  async function salvarEdicaoInteracao() {
    const mensagem = interactionEditInput?.value.trim() || "";
    if (!editingInteractionId) return;
    if (!mensagem) {
      setInteractionEditMessage("Escreva uma mensagem para salvar a alteração.", "error");
      interactionEditInput?.focus();
      return;
    }

    setInteractionEditMessage();
    btnSaveEditInteraction.disabled = true;

    try {
      const { error } = await supabase
        .from("tarefa_interacoes")
        .update({ mensagem })
        .eq("id", editingInteractionId)
        .eq("autor_tipo", "profissional")
        .eq("autor_user_id", currentUser.id);

      if (error) {
        throw new Error(`Falha ao salvar alteração: ${error.message}`);
      }

      await registrarEvento({
        evento: "interacao_tarefa_atualizada",
        pagina: "profissional_interagindo",
        perfil: "profissional",
        userId: currentUser.id,
        email: currentProfile.email || currentUser.email || null,
        contexto: {
          tarefa_id: currentTask.id,
          interacao_id: editingInteractionId
        }
      });

      cancelEditingInteraction();
      await carregarInteracoes();
      renderInteractions();
    } catch (error) {
      console.error(error);
      setInteractionEditMessage(error.message || "Não foi possível salvar a alteração.", "error");
    } finally {
      btnSaveEditInteraction.disabled = false;
    }
  }

  function bindEvents() {
    btnBottomMenu?.addEventListener("click", alternarMenuInferior);
    btnMenuLogout?.addEventListener("click", sairDoSistema);
    btnBack?.addEventListener("click", (event) => {
      event.preventDefault();
      window.history.back();
    });
    btnClearInteraction?.addEventListener("click", () => {
      if (interactionTextInput) interactionTextInput.value = "";
      setInteractionFormMessage();
    });
    btnCreateInteraction?.addEventListener("click", criarInteracao);
    btnCancelEditInteraction?.addEventListener("click", cancelEditingInteraction);
    btnSaveEditInteraction?.addEventListener("click", salvarEdicaoInteracao);

    document.addEventListener("click", (event) => {
      const editButton = event.target.closest('[data-action="edit-interaction"]');
      if (editButton) {
        const interaction = currentInteractions.find((item) => item.id === editButton.dataset.id);
        if (interaction) startEditingInteraction(interaction);
        return;
      }

      if (
        bottomMenuPanel &&
        btnBottomMenu &&
        !bottomMenuPanel.hidden &&
        !bottomMenuPanel.contains(event.target) &&
        !btnBottomMenu.contains(event.target)
      ) {
        fecharMenuInferior();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        fecharMenuInferior();
      }
    });
  }

  async function init() {
    bindEvents();

    try {
      const ok = await validarProfissional();
      if (!ok) return;

      await carregarTarefa();
      await carregarInteracoes();
      await renderTask();
      renderInteractions();
    } catch (error) {
      console.error(error);
      taskEmptyState.hidden = false;
      setScreenMessage(error.message || "Não foi possível abrir a tarefa para interação.");
    }
  }

  init();
});
