import supabase from "../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const PDF_BUCKET = "banco-tarefas-pdf";

  const btnBack = document.getElementById("btnBack");
  const screenMessage = document.getElementById("screenMessage");
  const themeFilterSelect = document.getElementById("themeFilterSelect");
  const feedEmptyState = document.getElementById("feedEmptyState");
  const feedList = document.getElementById("feedList");
  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");

  let currentUser = null;
  let currentProfile = null;
  let themes = [];
  let resources = [];
  let feedItems = [];
  let selectedThemeId = null;
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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  function getTheme(themeId) {
    return themes.find((theme) => String(theme.id) === String(themeId)) || null;
  }

  function getResource(resourceId) {
    return resources.find((resource) => String(resource.id) === String(resourceId)) || null;
  }

  function getThemeName(themeId) {
    return getTheme(themeId)?.nome || "Tema";
  }

  function getThemeOrder(themeId) {
    const theme = getTheme(themeId);
    return Number.isFinite(Number(theme?.ordem)) ? Number(theme.ordem) : Number.MAX_SAFE_INTEGER;
  }

  function getResourceName(resourceId) {
    return getResource(resourceId)?.nome || "Sem recurso";
  }

  function getResourceOrder(resourceId) {
    const resource = getResource(resourceId);
    return Number.isFinite(Number(resource?.ordem)) ? Number(resource.ordem) : Number.MAX_SAFE_INTEGER;
  }

  function renderThemeOptions() {
    if (!themeFilterSelect) return;

    if (!themes.length) {
      themeFilterSelect.innerHTML = '<option value="">Nenhum tema encontrado</option>';
      themeFilterSelect.disabled = true;
      return;
    }

    themeFilterSelect.disabled = false;
    themeFilterSelect.innerHTML = themes
      .map((theme) => `<option value="${escapeHtml(theme.id)}">${escapeHtml(theme.nome)}</option>`)
      .join("");

    if (!selectedThemeId) {
      selectedThemeId = String(themes[0].id);
    }

    themeFilterSelect.value = String(selectedThemeId);
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

  function buildPdfPreviewUrl(url) {
    if (!url) return "";
    const mobilePreview = window.matchMedia("(max-width: 640px)").matches;
    const previewParams = mobilePreview
      ? "toolbar=0&navpanes=0&scrollbar=0&page=1&view=FitH&zoom=page-width"
      : "toolbar=0&navpanes=0&scrollbar=0&view=FitH";

    return `${url}#${previewParams}`;
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
      pagina: "feed_banco_de_tarefas",
      perfil: "profissional",
      userId: currentUser.id,
      email: perfil.email || currentUser.email || null
    });

    return true;
  }

  async function sairDoSistema() {
    await registrarEvento({
      evento: "logout",
      pagina: "feed_banco_de_tarefas",
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
        .select("id, tema_id, recurso_id, pdf_path, video_link, ativo")
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

    if (!selectedThemeId && themes.length) {
      selectedThemeId = String(themes[0].id);
    }

    const activeTasks = (tasksResponse.data || []).filter((task) => task.ativo !== false);

    const tasksWithPreview = await Promise.all(
      activeTasks.map(async (task) => {
        let pdfSignedUrl = "";

        if (task.pdf_path) {
          try {
            const { data, error } = await supabase.storage
              .from(PDF_BUCKET)
              .createSignedUrl(task.pdf_path, 3600);

            if (!error && data?.signedUrl) {
              pdfSignedUrl = data.signedUrl;
            }
          } catch (error) {
            console.error("Erro ao preparar PDF do feed:", error);
          }
        }

        return {
          ...task,
          pdfSignedUrl
        };
      })
    );

    feedItems = tasksWithPreview.sort((a, b) => {
      const themeOrderDiff = getThemeOrder(a.tema_id) - getThemeOrder(b.tema_id);
      if (themeOrderDiff !== 0) return themeOrderDiff;

      const resourceOrderDiff = getResourceOrder(a.recurso_id) - getResourceOrder(b.recurso_id);
      if (resourceOrderDiff !== 0) return resourceOrderDiff;

      return getThemeName(a.tema_id).localeCompare(getThemeName(b.tema_id), "pt-BR", {
        sensitivity: "base"
      }) || getResourceName(a.recurso_id).localeCompare(getResourceName(b.recurso_id), "pt-BR", {
        sensitivity: "base"
      });
    });
  }

  function renderVideoBlock(item) {
    if (!item.video_link) return "";

    const instagramPermalink = getInstagramPermalink(item.video_link);
    if (instagramPermalink) {
      return `
        <section class="feed-media-block">
          <div class="feed-media-block__header">
            <h3>Vídeo</h3>
            <a class="feed-media-block__link" href="${escapeHtml(item.video_link)}" target="_blank" rel="noopener noreferrer">
              Abrir vídeo
            </a>
          </div>
          <div class="feed-instagram-wrap">
            <blockquote
              class="instagram-media"
              data-instgrm-permalink="${escapeHtml(instagramPermalink)}"
              data-instgrm-version="14"
            ></blockquote>
          </div>
        </section>
      `;
    }

    const embeddedVideo = resolveEmbeddedVideo(item.video_link);

    if (embeddedVideo?.type === "iframe") {
      return `
        <section class="feed-media-block">
          <div class="feed-media-block__header">
            <h3>Vídeo</h3>
            <a class="feed-media-block__link" href="${escapeHtml(item.video_link)}" target="_blank" rel="noopener noreferrer">
              Abrir vídeo
            </a>
          </div>
          <iframe
            class="feed-video-frame"
            src="${escapeHtml(embeddedVideo.src)}"
            title="Prévia do vídeo ${escapeHtml(getResourceName(item.recurso_id))}"
            allow="autoplay; encrypted-media; picture-in-picture; web-share"
            allowfullscreen
          ></iframe>
        </section>
      `;
    }

    if (embeddedVideo?.type === "native") {
      return `
        <section class="feed-media-block">
          <div class="feed-media-block__header">
            <h3>Vídeo</h3>
            <a class="feed-media-block__link" href="${escapeHtml(item.video_link)}" target="_blank" rel="noopener noreferrer">
              Abrir vídeo
            </a>
          </div>
          <video class="feed-video-native" controls playsinline src="${escapeHtml(embeddedVideo.src)}"></video>
        </section>
      `;
    }

    return `
      <section class="feed-media-block">
        <div class="feed-media-block__header">
          <h3>Vídeo</h3>
          <a class="feed-media-block__link" href="${escapeHtml(item.video_link)}" target="_blank" rel="noopener noreferrer">
            Abrir vídeo
          </a>
        </div>
      </section>
    `;
  }

  function renderFeed() {
    if (!feedList || !feedEmptyState) return;

    const visibleItems = selectedThemeId
      ? feedItems.filter((item) => String(item.tema_id) === String(selectedThemeId))
      : feedItems;

    if (!visibleItems.length) {
      feedList.innerHTML = "";
      feedEmptyState.hidden = false;
      return;
    }

    feedEmptyState.hidden = true;

    feedList.innerHTML = visibleItems
      .map((item) => `
        <article class="feed-card">
          <div class="feed-card__header">
            <p class="feed-card__theme">${escapeHtml(getThemeName(item.tema_id))}</p>
            <h2 class="feed-card__title">${escapeHtml(getResourceName(item.recurso_id))}</h2>
          </div>
          <div class="feed-card__media">
            ${item.pdfSignedUrl ? `
              <section class="feed-media-block">
                <div class="feed-media-block__header">
                  <h3>Prévia do PDF</h3>
                  <a class="feed-media-block__link" href="${escapeHtml(item.pdfSignedUrl)}" target="_blank" rel="noopener noreferrer">
                    Abrir PDF
                  </a>
                </div>
                <iframe
                  class="feed-media-block__frame"
                  src="${escapeHtml(buildPdfPreviewUrl(item.pdfSignedUrl))}"
                  title="Prévia do PDF ${escapeHtml(getResourceName(item.recurso_id))}"
                ></iframe>
              </section>
            ` : ""}
            ${renderVideoBlock(item)}
          </div>
        </article>
      `)
      .join("");

    if (visibleItems.some((item) => getInstagramPermalink(item.video_link))) {
      ensureInstagramEmbedScript().then((instgrm) => {
        if (instgrm?.Embeds?.process) {
          instgrm.Embeds.process();
        }
      });
    }
  }

  if (btnBack) {
    btnBack.addEventListener("click", () => {
      window.location.href = "../profissional/index.html";
    });
  }

  if (themeFilterSelect) {
    themeFilterSelect.addEventListener("change", (event) => {
      selectedThemeId = event.target.value ? String(event.target.value) : null;
      renderFeed();
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

    const ok = await validarProfissional();
    if (!ok) return;

    await carregarDados();
    renderThemeOptions();
    renderFeed();
  }

  iniciar().catch((error) => {
    console.error("Erro na tela feed-banco-de-tarefas:", error);
    setScreenMessage(error.message || "Não foi possível carregar o feed do banco de tarefas.");
  });
});
