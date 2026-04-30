import supabase from "../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const PDF_BUCKET = "banco-tarefas-pdf";
  const searchParams = new URLSearchParams(window.location.search);
  const taskId = (searchParams.get("task") || "").trim();

  const professionalHeaderTitle = document.getElementById("professionalHeaderTitle");
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
  const interactionPermissionState = document.getElementById("interactionPermissionState");
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
  let currentProfessional = null;
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
      pagina: "dashboard_paciente_interacoes",
      perfil: "paciente",
      userId: currentUser?.id || null,
      email: currentProfile?.email || currentUser?.email || null
    });
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
    window.location.href = "/";
  }

  function limparNome(valor) {
    const texto = (valor || "").trim();
    if (!texto) return "";
    if (texto.includes("@")) return texto.split("@")[0].trim() || "";
    return texto;
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

  function normalizarTipoInteracao(valor) {
    if (valor === "limitado" || valor === "ilimitado") return valor;
    return "nao_permitir";
  }

  function normalizarLimiteInteracao(tipo, valor) {
    if (tipo !== "limitado") return null;
    const numero = Number.parseInt(String(valor || "1"), 10);
    return Number.isFinite(numero) && numero > 0 ? numero : 1;
  }

  function obterConfiguracaoInteracaoPaciente(task) {
    const tipoBruto =
      task?.interacao_paciente_tipo ||
      currentProfessional?.tarefa_interacao_padrao_tipo ||
      "nao_permitir";
    const tipo = normalizarTipoInteracao(tipoBruto);
    const limite = normalizarLimiteInteracao(
      tipo,
      task?.interacao_paciente_limite ?? currentProfessional?.tarefa_interacao_padrao_limite
    );
    const usadas = currentInteractions.length;

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
        mensagem: permitido ? "" : `Esta tarefa já atingiu o limite de ${limite} interação(ões).`
      };
    }
    return {
      tipo,
      limite,
      usadas,
      permitido: false,
      mensagem: "Essa TAREFA NÃO permite interações!"
    };
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
      const existingScript = document.querySelector('script[data-instagram-embed="true"]');
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(window.instgrm || null), { once: true });
        existingScript.addEventListener("error", () => resolve(null), { once: true });
        return;
      }
      const script = document.createElement("script");
      script.async = true;
      script.src = "https://www.instagram.com/embed.js";
      script.setAttribute("data-instagram-embed", "true");
      script.addEventListener("load", () => resolve(window.instgrm || null), { once: true });
      script.addEventListener("error", () => resolve(null), { once: true });
      document.body.appendChild(script);
    });
    return instagramScriptPromise;
  }

  async function obterUsuarioAutenticado() {
    const { data, error } = await supabase.auth.getUser();
    if (error) throw new Error("Falha ao validar o acesso do paciente.");
    return data?.user || null;
  }

  async function carregarPaciente() {
    const user = await obterUsuarioAutenticado();
    if (!user) {
      window.location.href = "../../auth/index.html?perfil=paciente";
      return false;
    }
    currentUser = user;

    const { data: perfil, error } = await supabase
      .from("perfis")
      .select("nome, email, perfil")
      .eq("user_id", currentUser.id)
      .single();

    if (error || !perfil || perfil.perfil !== "paciente") {
      window.location.href = "../../auth/index.html?perfil=paciente";
      return false;
    }

    currentProfile = perfil;
    await registrarAcessoPagina({
      pagina: "dashboard_paciente_interacoes",
      perfil: "paciente",
      userId: currentUser.id,
      email: perfil.email || currentUser.email || null
    });
    return true;
  }

  async function carregarProfissionalVinculado() {
    const { data: vinculo, error: vinculoError } = await supabase
      .from("vinculos")
      .select("professional_user_id, status, created_at")
      .eq("patient_user_id", currentUser.id)
      .eq("status", "ativo")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (vinculoError || !vinculo) {
      if (professionalHeaderTitle) professionalHeaderTitle.textContent = "Profissional: não vinculado";
      return;
    }

    const { data: profissional, error: profissionalError } = await supabase
      .from("perfis")
      .select("nome, email, tarefa_interacao_padrao_tipo, tarefa_interacao_padrao_limite")
      .eq("user_id", vinculo.professional_user_id)
      .single();

    if (profissionalError || !profissional) {
      if (professionalHeaderTitle) professionalHeaderTitle.textContent = "Profissional: não localizado";
      return;
    }

    currentProfessional = profissional;
    const nomeExibicao = limparNome(profissional.nome || profissional.email || "") || "Profissional";
    if (professionalHeaderTitle) professionalHeaderTitle.textContent = `Profissional: ${nomeExibicao}`;
  }

  async function carregarTarefa() {
    if (!taskId) throw new Error("Nenhuma atividade foi informada.");
    const { data, error } = await supabase
      .from("tarefas")
      .select("*")
      .eq("id", taskId)
      .eq("patient_user_id", currentUser.id)
      .single();
    if (error || !data) throw new Error("Não foi possível localizar esta atividade.");
    currentTask = data;
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

    if (error) throw new Error(`Falha ao carregar interações: ${error.message}`);
    currentInteractions = data || [];
  }

  function getEditingInteraction() {
    if (!editingInteractionId) return null;
    return currentInteractions.find((item) => item.id === editingInteractionId) || null;
  }

  function closeInteractionEditCard() {
    editingInteractionId = null;
    if (interactionEditCard) interactionEditCard.hidden = true;
    if (interactionEditInput) interactionEditInput.value = "";
    setInteractionEditMessage();
  }

  function openInteractionEditCard(interactionId) {
    const interaction = currentInteractions.find((item) => item.id === interactionId);
    if (!interaction || interaction.autor_tipo !== "paciente" || interaction.autor_user_id !== currentUser?.id) return;
    editingInteractionId = interactionId;
    if (interactionEditInput) {
      interactionEditInput.value = interaction.mensagem || "";
      interactionEditInput.focus();
      interactionEditInput.select();
    }
    if (interactionEditCard) interactionEditCard.hidden = false;
    setInteractionEditMessage();
  }

  function resetVideoPreview() {
    if (taskVideoFrame) {
      taskVideoFrame.hidden = true;
      taskVideoFrame.removeAttribute("src");
    }
    if (taskVideoNative) {
      taskVideoNative.hidden = true;
      taskVideoNative.pause();
      taskVideoNative.removeAttribute("src");
      taskVideoNative.load();
    }
    if (taskVideoInstagram) {
      taskVideoInstagram.hidden = true;
      taskVideoInstagram.innerHTML = "";
    }
    if (taskVideoEmpty) taskVideoEmpty.hidden = true;
  }

  async function renderTask() {
    if (!currentTask) {
      if (taskEmptyState) taskEmptyState.hidden = false;
      if (taskDetailCard) taskDetailCard.hidden = true;
      return;
    }

    const taskKind = getTaskKind(currentTask);
    if (taskTypeLabel) taskTypeLabel.textContent = taskKind.eyebrow;
    if (taskTitle) taskTitle.textContent = currentTask.titulo || "Atividade";
    if (taskDescription) taskDescription.textContent = currentTask.descricao || "Sem descrição cadastrada.";

    if (currentTask.pdf_path) {
      try {
        const { data, error } = await supabase.storage.from(PDF_BUCKET).createSignedUrl(currentTask.pdf_path, 60);
        if (error || !data?.signedUrl) throw new Error("Não foi possível carregar o PDF desta atividade.");
        if (taskPdfSection) taskPdfSection.hidden = false;
        if (taskPdfName) taskPdfName.textContent = currentTask.pdf_nome || "Material em PDF vinculado a esta atividade.";
        if (btnOpenTaskPdf) btnOpenTaskPdf.href = data.signedUrl;
        if (taskPdfFrame) taskPdfFrame.src = buildPdfPreviewUrl(data.signedUrl);
      } catch (error) {
        if (taskPdfSection) taskPdfSection.hidden = true;
        setScreenMessage(error.message || "Erro ao carregar o PDF da atividade.", "error");
      }
    } else if (taskPdfSection) {
      taskPdfSection.hidden = true;
    }

    resetVideoPreview();
    if (currentTask.video_url) {
      if (taskVideoSection) taskVideoSection.hidden = false;
      if (btnOpenTaskVideo) btnOpenTaskVideo.href = currentTask.video_url;
      if (taskVideoHelper) taskVideoHelper.textContent = taskKind.videoHelper;
      const instagramPermalink = getInstagramPermalink(currentTask.video_url);
      if (instagramPermalink && taskVideoInstagram) {
        taskVideoInstagram.hidden = false;
        taskVideoInstagram.innerHTML = `<blockquote class="instagram-media" data-instgrm-permalink="${instagramPermalink}" data-instgrm-version="14"></blockquote>`;
        const instgrm = await ensureInstagramEmbedScript();
        if (instgrm?.Embeds?.process) {
          instgrm.Embeds.process();
        } else if (taskVideoEmpty) {
          taskVideoInstagram.hidden = true;
          taskVideoEmpty.hidden = false;
        }
      } else {
        const embeddedVideo = resolveEmbeddedVideo(currentTask.video_url);
        if (embeddedVideo?.type === "iframe" && taskVideoFrame) {
          taskVideoFrame.src = embeddedVideo.src;
          taskVideoFrame.hidden = false;
        } else if (embeddedVideo?.type === "native" && taskVideoNative) {
          taskVideoNative.src = embeddedVideo.src;
          taskVideoNative.hidden = false;
        } else if (taskVideoEmpty) {
          taskVideoEmpty.hidden = false;
        }
      }
    } else if (taskVideoSection) {
      taskVideoSection.hidden = true;
    }

    if (taskEmptyState) taskEmptyState.hidden = true;
    if (taskDetailCard) taskDetailCard.hidden = false;
  }

  function renderInteractions() {
    const configuracaoInteracao = obterConfiguracaoInteracaoPaciente(currentTask);
    if (interactionsDivider) interactionsDivider.hidden = false;

    if (interactionsList) {
      interactionsList.innerHTML = currentInteractions
        .map((interaction) => {
          const isProfissional = interaction.autor_tipo === "profissional";
          const cssClass = isProfissional ? "interaction-item interaction-item--profissional" : "interaction-item interaction-item--paciente";
          return `
            <article class="${cssClass}">
              <div class="interaction-item__top">
                <strong class="interaction-item__author">${isProfissional ? "Profissional" : "Você"}</strong>
                <span class="interaction-item__time">${escapeHtml(formatarDataHora(interaction.created_at))}</span>
              </div>
              <p class="interaction-item__text">${escapeHtml(interaction.mensagem || "")}</p>
              ${
                !isProfissional && interaction.autor_user_id === currentUser?.id
                  ? `<div class="interaction-item__actions"><button class="btn-secondary btn-secondary--small" type="button" data-edit-interaction-id="${interaction.id}">Alterar interação</button></div>`
                  : ""
              }
            </article>
          `;
        })
        .join("");
    }

    if (interactionFormCard) {
      interactionFormCard.hidden = currentTask.status === "encerrada" || !configuracaoInteracao.permitido;
    }

    if (interactionPermissionState) {
      if (currentTask.status === "encerrada") {
        interactionPermissionState.hidden = false;
        interactionPermissionState.textContent = "Esta tarefa está encerrada e não recebe novas interações.";
      } else if (!configuracaoInteracao.permitido) {
        interactionPermissionState.hidden = false;
        interactionPermissionState.textContent = configuracaoInteracao.mensagem;
      } else {
        interactionPermissionState.hidden = true;
        interactionPermissionState.textContent = "";
      }
    }
  }

  async function criarInteracao() {
    const mensagem = interactionTextInput?.value.trim() || "";
    const configuracaoInteracao = obterConfiguracaoInteracaoPaciente(currentTask);
    if (!currentTask) {
      setInteractionFormMessage("Selecione uma tarefa antes de enviar sua interação.", "error");
      return;
    }
    if (!configuracaoInteracao.permitido) {
      setInteractionFormMessage(configuracaoInteracao.mensagem || "Esta tarefa não permite novas interações.", "error");
      return;
    }
    if (!mensagem) {
      setInteractionFormMessage("Digite sua mensagem antes de enviar.", "error");
      return;
    }
    if (btnCreateInteraction) btnCreateInteraction.disabled = true;
    setInteractionFormMessage();
    try {
      const { error } = await supabase.from("tarefa_interacoes").insert({
        tarefa_id: currentTask.id,
        autor_tipo: "paciente",
        autor_user_id: currentUser.id,
        mensagem
      });
      if (error) throw new Error(`Não foi possível enviar sua interação: ${error.message}`);
      if (interactionTextInput) interactionTextInput.value = "";
      await carregarInteracoes();
      closeInteractionEditCard();
      renderInteractions();
      await registrarEvento({
        evento: "interacao_paciente_criada",
        pagina: "dashboard_paciente_interacoes",
        perfil: "paciente",
        userId: currentUser.id,
        email: currentProfile?.email || currentUser.email || null,
        contexto: { tarefa_id: currentTask.id }
      });
      setInteractionFormMessage("Interação enviada com sucesso.", "success");
    } catch (error) {
      setInteractionFormMessage(error.message || "Erro ao enviar interação.", "error");
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
        .update({ mensagem })
        .eq("id", interaction.id)
        .eq("autor_tipo", "paciente")
        .eq("autor_user_id", currentUser.id);

      if (error) throw new Error(`Não foi possível alterar sua interação: ${error.message}`);
      await carregarInteracoes();
      closeInteractionEditCard();
      renderInteractions();
      await registrarEvento({
        evento: "interacao_paciente_editada",
        pagina: "dashboard_paciente_interacoes",
        perfil: "paciente",
        userId: currentUser.id,
        email: currentProfile?.email || currentUser.email || null,
        contexto: { tarefa_id: interaction.tarefa_id, interacao_id: interaction.id }
      });
      setInteractionFormMessage("Interação alterada com sucesso.", "success");
    } catch (error) {
      setInteractionEditMessage(error.message || "Erro ao alterar interação.", "error");
    } finally {
      if (btnSaveEditInteraction) btnSaveEditInteraction.disabled = false;
    }
  }

  async function iniciar() {
    if (!(await carregarPaciente())) return;
    await carregarProfissionalVinculado();
    await carregarTarefa();
    await carregarInteracoes();
    await renderTask();
    renderInteractions();
    await registrarEvento({
      evento: "tela_interacoes_aberta",
      pagina: "dashboard_paciente_interacoes",
      perfil: "paciente",
      userId: currentUser?.id || null,
      email: currentProfile?.email || currentUser?.email || null,
      contexto: { tarefa_id: currentTask?.id || null }
    });
  }

  if (btnBack) {
    btnBack.addEventListener("click", (event) => {
      event.preventDefault();
      window.location.href = `../paciente-tarefas/index.html?task=${encodeURIComponent(taskId)}`;
    });
  }
  if (btnBottomMenu) btnBottomMenu.addEventListener("click", alternarMenuInferior);
  if (btnMenuLogout) btnMenuLogout.addEventListener("click", sairDoSistema);
  document.addEventListener("click", (event) => {
    if (!bottomMenuPanel || bottomMenuPanel.hidden) return;
    if (event.target.closest(".bottom-nav__menu-wrap")) return;
    fecharMenuInferior();
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") fecharMenuInferior();
  });
  if (btnClearInteraction) {
    btnClearInteraction.addEventListener("click", () => {
      if (interactionTextInput) interactionTextInput.value = "";
      setInteractionFormMessage();
    });
  }
  if (btnCreateInteraction) btnCreateInteraction.addEventListener("click", criarInteracao);
  if (interactionsList) {
    interactionsList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-edit-interaction-id]");
      if (!button) return;
      openInteractionEditCard(Number(button.getAttribute("data-edit-interaction-id")));
    });
  }
  if (btnCancelEditInteraction) btnCancelEditInteraction.addEventListener("click", closeInteractionEditCard);
  if (btnSaveEditInteraction) btnSaveEditInteraction.addEventListener("click", salvarInteracaoEditada);

  iniciar().catch((error) => {
    console.error("Erro na tela paciente-interacoes:", error);
    setScreenMessage(error.message || "Não foi possível carregar as interações da atividade.", "error");
    if (taskEmptyState) taskEmptyState.hidden = false;
    if (taskDetailCard) taskDetailCard.hidden = true;
  });
});
