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
  const taskOriginBadge = document.getElementById("taskOriginBadge");
  const taskTitle = document.getElementById("taskTitle");
  const taskDescription = document.getElementById("taskDescription");
  const patientName = document.getElementById("patientName");
  const professionalName = document.getElementById("professionalName");
  const taskCreatedAt = document.getElementById("taskCreatedAt");
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
  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");

  let currentUser = null;
  let currentProfile = null;
  let currentProfessional = null;
  let currentTask = null;
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

  function limparNome(valor) {
    const texto = (valor || "").trim();
    if (!texto) return "";
    if (texto.includes("@")) {
      return texto.split("@")[0].trim() || "";
    }
    return texto;
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
      pagina: "dashboard_paciente_tarefa",
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

  function getTaskKind(task) {
    if (!task) {
      return {
        key: "simples",
        eyebrow: "Atividade",
        badge: "Atividade simples",
        videoHelper: "Vídeo vinculado a esta atividade."
      };
    }

    if (task.origem_tipo === "banco" || task.origem_banco_tarefa_id) {
      return {
        key: "banco",
        eyebrow: "Banco de tarefas",
        badge: "Banco de tarefas",
        videoHelper: "Vídeo associado ao material do banco de tarefas."
      };
    }

    if (task.origem_tipo === "ia" || task.pdf_path?.includes("/ia/")) {
      return {
        key: "ia",
        eyebrow: "Atividade gerada por IA",
        badge: "Gerada por IA",
        videoHelper: "Vídeo complementar vinculado a esta atividade gerada por IA."
      };
    }

    if (task.pdf_path && task.video_url) {
      return {
        key: "pdf_video",
        eyebrow: "Atividade com PDF e vídeo",
        badge: "PDF e vídeo",
        videoHelper: "Vídeo complementar enviado junto desta atividade."
      };
    }

    if (task.pdf_path) {
      return {
        key: "pdf",
        eyebrow: "Atividade com PDF",
        badge: "PDF anexado",
        videoHelper: "Vídeo vinculado a esta atividade."
      };
    }

    if (task.video_url) {
      return {
        key: "video",
        eyebrow: "Atividade com vídeo",
        badge: "Vídeo anexado",
        videoHelper: "Vídeo enviado pelo profissional para esta atividade."
      };
    }

    return {
      key: "simples",
      eyebrow: "Atividade simples",
      badge: "Atividade simples",
      videoHelper: "Vídeo vinculado a esta atividade."
    };
  }

  function resolveEmbeddedVideo(url) {
    if (!url) return null;

    try {
      const parsedUrl = new URL(url);
      const host = parsedUrl.hostname.replace(/^www\./, "");
      const pathname = parsedUrl.pathname;

      if (host === "youtube.com" || host === "m.youtube.com") {
        const videoId = parsedUrl.searchParams.get("v");
        if (videoId) {
          return { type: "iframe", src: `https://www.youtube.com/embed/${videoId}` };
        }
      }

      if (host === "youtu.be") {
        const videoId = pathname.replace(/^\/+/, "").split("/")[0];
        if (videoId) {
          return { type: "iframe", src: `https://www.youtube.com/embed/${videoId}` };
        }
      }

      if (host === "player.vimeo.com") {
        return { type: "iframe", src: url };
      }

      if (host === "vimeo.com") {
        const videoId = pathname.replace(/^\/+/, "").split("/")[0];
        if (videoId) {
          return { type: "iframe", src: `https://player.vimeo.com/video/${videoId}` };
        }
      }

      if (/\.(mp4|webm|ogg)(\?.*)?$/i.test(url)) {
        return { type: "native", src: url };
      }
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

      if (host !== "instagram.com" && host !== "m.instagram.com" && host !== "instagr.am") {
        return "";
      }

      const cleanPath = parsedUrl.pathname.replace(/\/+$/, "");
      if (!cleanPath) {
        return "";
      }

      return `https://www.instagram.com${cleanPath}/?utm_source=ig_embed&utm_campaign=loading`;
    } catch {
      return "";
    }
  }

  function ensureInstagramEmbedScript() {
    if (instagramScriptPromise) {
      return instagramScriptPromise;
    }

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
      pagina: "dashboard_paciente_tarefa",
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
      if (professionalHeaderTitle) {
        professionalHeaderTitle.textContent = "Profissional: não vinculado";
      }
      return;
    }

    const { data: profissional, error: profissionalError } = await supabase
      .from("perfis")
      .select("nome, email")
      .eq("user_id", vinculo.professional_user_id)
      .single();

    if (profissionalError || !profissional) {
      if (professionalHeaderTitle) {
        professionalHeaderTitle.textContent = "Profissional: não localizado";
      }
      return;
    }

    currentProfessional = profissional;
    const nomeExibicao = limparNome(profissional.nome || profissional.email || "") || "Profissional";
    if (professionalHeaderTitle) {
      professionalHeaderTitle.textContent = `Profissional: ${nomeExibicao}`;
    }
  }

  async function carregarTarefa() {
    if (!taskId) {
      throw new Error("Nenhuma atividade foi informada.");
    }

    const { data, error } = await supabase
      .from("tarefas")
      .select("*")
      .eq("id", taskId)
      .eq("patient_user_id", currentUser.id)
      .single();

    if (error || !data) {
      throw new Error("Não foi possível localizar esta atividade.");
    }

    currentTask = data;
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

    if (taskVideoEmpty) {
      taskVideoEmpty.hidden = true;
      taskVideoEmpty.textContent =
        "Não foi possível exibir a prévia deste vídeo aqui. Use o botão para abrir o conteúdo completo.";
    }
  }

  function buildPdfPreviewUrl(url) {
    if (!url) return "";
    return `${url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`;
  }

  async function renderTask() {
    if (!currentTask || !taskDetailCard) return;

    const taskKind = getTaskKind(currentTask);
    const patientDisplayName =
      limparNome(currentProfile?.nome || currentProfile?.email || currentUser?.email || "") || "Paciente";
    const professionalDisplayName =
      limparNome(currentProfessional?.nome || currentProfessional?.email || "") || "Profissional";

    if (taskTypeLabel) taskTypeLabel.textContent = taskKind.eyebrow;
    if (taskOriginBadge) taskOriginBadge.textContent = taskKind.badge;
    if (taskTitle) taskTitle.textContent = currentTask.titulo || "Atividade sem título";
    if (taskDescription) {
      taskDescription.textContent = currentTask.descricao || "Sem descrição cadastrada.";
    }
    if (patientName) patientName.textContent = patientDisplayName;
    if (professionalName) professionalName.textContent = professionalDisplayName;
    if (taskCreatedAt) taskCreatedAt.textContent = formatarDataHora(currentTask.created_at);

    if (currentTask.pdf_path) {
      try {
        const { data, error } = await supabase.storage
          .from(PDF_BUCKET)
          .createSignedUrl(currentTask.pdf_path, 60);

        if (error || !data?.signedUrl) {
          throw new Error(error?.message || "Não foi possível abrir o PDF desta atividade.");
        }

        if (taskPdfSection) taskPdfSection.hidden = false;
        if (taskPdfName) {
          taskPdfName.textContent =
            currentTask.pdf_nome || "Material em PDF vinculado a esta atividade.";
        }
        if (btnOpenTaskPdf) {
          btnOpenTaskPdf.href = data.signedUrl;
        }
        if (taskPdfFrame) {
          taskPdfFrame.src = buildPdfPreviewUrl(data.signedUrl);
        }
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
        taskVideoInstagram.innerHTML = `
          <blockquote
            class="instagram-media"
            data-instgrm-permalink="${instagramPermalink}"
            data-instgrm-version="14"
          ></blockquote>
        `;

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
    taskDetailCard.hidden = false;

    await registrarEvento({
      evento: "tarefa_paciente_aberta",
      pagina: "dashboard_paciente_tarefa",
      perfil: "paciente",
      userId: currentUser?.id || null,
      email: currentProfile?.email || currentUser?.email || null,
      contexto: {
        tarefa_id: currentTask.id,
        origem_tipo: currentTask.origem_tipo || "manual"
      }
    });
  }

  async function iniciar() {
    if (!(await carregarPaciente())) return;
    await carregarProfissionalVinculado();
    await carregarTarefa();
    await renderTask();
  }

  if (btnBottomMenu) {
    btnBottomMenu.addEventListener("click", alternarMenuInferior);
  }

  if (btnMenuLogout) {
    btnMenuLogout.addEventListener("click", sairDoSistema);
  }

  document.addEventListener("click", (event) => {
    if (!bottomMenuPanel || bottomMenuPanel.hidden) return;
    if (event.target.closest(".bottom-nav__menu-wrap")) return;
    fecharMenuInferior();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      fecharMenuInferior();
    }
  });

  iniciar().catch((error) => {
    console.error("Erro na tela paciente-tarefas:", error);
    setScreenMessage(error.message || "Não foi possível carregar a atividade.", "error");
    if (taskEmptyState) taskEmptyState.hidden = false;
    if (taskDetailCard) taskDetailCard.hidden = true;
  });
});
