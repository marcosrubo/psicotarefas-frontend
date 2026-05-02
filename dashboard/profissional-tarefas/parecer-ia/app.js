import supabase from "../../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const PDF_BUCKET = "banco-tarefas-pdf";
  const isLocalHost =
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  const AI_PROGRESS_OPINION_ENDPOINT = isLocalHost
    ? "http://localhost:3000/api/ai/task-progress-opinion"
    : "https://psicotarefas-backend.onrender.com/api/ai/task-progress-opinion";
  const searchParams = new URLSearchParams(window.location.search);
  const taskId = (searchParams.get("task") || "").trim();
  const patientAlias = (searchParams.get("alias") || "").trim();

  const patientHeaderTitle = document.getElementById("patientHeaderTitle");
  const screenMessage = document.getElementById("screenMessage");
  const emptyState = document.getElementById("emptyState");
  const taskDetailCard = document.getElementById("taskDetailCard");
  const taskTypeLabel = document.getElementById("taskTypeLabel");
  const taskTitle = document.getElementById("taskTitle");
  const taskSubtitle = document.getElementById("taskSubtitle");
  const taskOriginValue = document.getElementById("taskOriginValue");
  const taskInteractionPolicy = document.getElementById("taskInteractionPolicy");
  const taskHistoryCount = document.getElementById("taskHistoryCount");
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
  const snippetsList = document.getElementById("snippetsList");
  const snippetsEmptyState = document.getElementById("snippetsEmptyState");
  const timelineSummary = document.getElementById("timelineSummary");
  const interactionsList = document.getElementById("interactionsList");
  const interactionsEmptyState = document.getElementById("interactionsEmptyState");
  const btnGenerateParecer = document.getElementById("btnGenerateParecer");
  const parecerResultPanel = document.getElementById("parecerResultPanel");
  const parecerLoading = document.getElementById("parecerLoading");
  const parecerResult = document.getElementById("parecerResult");
  const parecerResumo = document.getElementById("parecerResumo");
  const parecerAvancos = document.getElementById("parecerAvancos");
  const parecerAtencao = document.getElementById("parecerAtencao");
  const parecerHipoteses = document.getElementById("parecerHipoteses");
  const parecerSugestoes = document.getElementById("parecerSugestoes");
  const parecerTrechos = document.getElementById("parecerTrechos");
  const parecerMudanca = document.getElementById("parecerMudanca");
  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");
  const btnBack = document.getElementById("btnBack");

  let currentUser = null;
  let currentProfile = null;
  let currentTask = null;
  let currentInteractions = [];
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
      pagina: "parecer_ia_profissional",
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

  function formatarData(dataIso) {
    if (!dataIso) return "-";
    return new Date(dataIso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }

  function truncateText(value, maxLength = 220) {
    const text = String(value || "").trim().replace(/\s+/g, " ");
    if (!text) return "";
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength - 1).trim()}…`;
  }

  function normalizarTipoInteracao(value) {
    if (value === "limitado" || value === "ilimitado") return value;
    return "nao_permitir";
  }

  function normalizarLimiteInteracao(tipo, value) {
    if (tipo !== "limitado") return null;
    const numero = Number.parseInt(String(value || "1"), 10);
    return Number.isFinite(numero) && numero > 0 ? numero : 1;
  }

  function getInteractionPolicyLabel(task) {
    const tipo = normalizarTipoInteracao(task?.interacao_paciente_tipo);
    const limite = normalizarLimiteInteracao(tipo, task?.interacao_paciente_limite);

    if (tipo === "ilimitado") return "Ilimitado";
    if (tipo === "limitado") return `Limitado (${limite} interacao(oes))`;
    return "Nao permitir";
  }

  function getTaskKind(task) {
    if (!task) {
      return { eyebrow: "Atividade", videoHelper: "Video vinculado a esta atividade." };
    }
    if (task.origem_tipo === "banco" || task.origem_banco_tarefa_id) {
      return { eyebrow: "Banco de tarefas", videoHelper: "Video associado ao material do banco de tarefas." };
    }
    if (task.origem_tipo === "ia" || task.pdf_path?.includes("/ia/")) {
      return { eyebrow: "Gerado por IA", videoHelper: "Video complementar vinculado a esta atividade gerada por IA." };
    }
    if (task.pdf_path && task.video_url) {
      return { eyebrow: "PDF e video", videoHelper: "Video complementar enviado junto desta atividade." };
    }
    if (task.pdf_path) {
      return { eyebrow: "PDF anexado", videoHelper: "Video vinculado a esta atividade." };
    }
    if (task.video_url) {
      return { eyebrow: "Video anexado", videoHelper: "Video enviado pelo profissional para esta atividade." };
    }
    return { eyebrow: "Atividade simples", videoHelper: "Video vinculado a esta atividade." };
  }

  function createListMarkup(items = []) {
    const validItems = (items || []).filter((item) => String(item || "").trim());
    if (!validItems.length) {
      return "<li>Sem observacoes registradas.</li>";
    }

    return validItems
      .map((item) => `<li>${escapeHtml(String(item).trim())}</li>`)
      .join("");
  }

  function getNonEmptyText(value, fallback = "") {
    const text = String(value ?? "").trim();
    return text || fallback;
  }

  function normalizeParecerList(value) {
    if (Array.isArray(value)) {
      return value
        .map((item) => String(item ?? "").trim())
        .filter(Boolean);
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return [];

      return trimmed
        .split(/\n+/)
        .map((item) => item.replace(/^[-*•]\s*/, "").trim())
        .filter(Boolean);
    }

    return [];
  }

  function extractTextFromUnknownShape(value) {
    if (typeof value === "string") {
      return value.trim();
    }

    if (Array.isArray(value)) {
      return value
        .map((item) => extractTextFromUnknownShape(item))
        .filter(Boolean)
        .join("\n")
        .trim();
    }

    if (value && typeof value === "object") {
      const candidateKeys = [
        "text",
        "content",
        "output_text",
        "response",
        "message",
        "result",
        "value"
      ];

      for (const key of candidateKeys) {
        const extracted = extractTextFromUnknownShape(value[key]);
        if (extracted) return extracted;
      }
    }

    return "";
  }

  function splitTextIntoList(value) {
    const text = extractTextFromUnknownShape(value);
    if (!text) return [];

    const normalized = text
      .replace(/\r/g, "")
      .split(/\n+/)
      .map((item) => item.replace(/^[-*•]\s*/, "").trim())
      .filter(Boolean);

    return normalized;
  }

  function unwrapParecerSource(data = {}) {
    let source = typeof data === "object" && data ? data : {};

    const nestedKeys = ["parecer", "data", "result", "response", "output"];
    for (const key of nestedKeys) {
      if (source[key] && typeof source[key] === "object") {
        source = source[key];
      }
    }

    return source;
  }

  function normalizeParecerPayload(data = {}) {
    const source = unwrapParecerSource(data);
    const genericText =
      extractTextFromUnknownShape(source.raw_text) ||
      extractTextFromUnknownShape(source.output_text) ||
      extractTextFromUnknownShape(source.content) ||
      extractTextFromUnknownShape(source.response) ||
      extractTextFromUnknownShape(source.message) ||
      extractTextFromUnknownShape(source.result) ||
      extractTextFromUnknownShape(source.text) ||
      extractTextFromUnknownShape(data);

    const genericList = splitTextIntoList(genericText);
    const sinaisAvanco = normalizeParecerList(
      source.sinais_avanco ?? source.sinaisDeAvanco ?? source.avancos
    );
    const pontosAtencao = normalizeParecerList(
      source.pontos_atencao ?? source.pontosDeAtencao ?? source.atencao
    );
    const hipotesesCompreensao = normalizeParecerList(
      source.hipoteses_compreensao ?? source.hipotesesDeCompreensao ?? source.hipoteses
    );
    const sugestoesConducao = normalizeParecerList(
      source.sugestoes_proxima_conducao ?? source.sugestoesParaProximaConducao ?? source.sugestoes
    );
    const trechosRelevantes = normalizeParecerList(
      source.trechos_relevantes ?? source.trechosRelevantes
    );

    return {
      resumo_andamento:
        getNonEmptyText(source.resumo_andamento) ||
        getNonEmptyText(source.resumo) ||
        getNonEmptyText(source.resumoDoAndamento) ||
        genericText ||
        "Sem resumo disponivel.",
      sinais_avanco: sinaisAvanco.length ? sinaisAvanco : genericList,
      pontos_atencao: pontosAtencao.length ? pontosAtencao : genericList,
      hipoteses_compreensao: hipotesesCompreensao.length ? hipotesesCompreensao : genericList,
      sugestoes_proxima_conducao: sugestoesConducao.length ? sugestoesConducao : genericList,
      trechos_relevantes: trechosRelevantes.length ? trechosRelevantes : genericList,
      mudanca_percebida:
        getNonEmptyText(source.mudanca_percebida) ||
        getNonEmptyText(source.mudancaPercebida) ||
        getNonEmptyText(source.mudanca) ||
        genericText ||
        "Sem mudanca percebida registrada."
    };
  }

  function setParecerButtonState(isLoading) {
    if (!btnGenerateParecer) return;
    btnGenerateParecer.disabled = isLoading;
    btnGenerateParecer.textContent = isLoading ? "Gerando parecer..." : "Gerar o parecer com IA";
  }

  function resetParecerView() {
    if (parecerLoading) parecerLoading.hidden = true;
    if (parecerResult) parecerResult.hidden = true;
  }

  function renderParecerResult(data) {
    if (!parecerResult) return;

    const normalized = normalizeParecerPayload(data);
    console.log("Parecer IA bruto:", data);
    console.log("Parecer IA normalizado:", normalized);

    parecerResumo.textContent = normalized.resumo_andamento;
    parecerMudanca.textContent = normalized.mudanca_percebida;
    parecerAvancos.innerHTML = createListMarkup(normalized.sinais_avanco);
    parecerAtencao.innerHTML = createListMarkup(normalized.pontos_atencao);
    parecerHipoteses.innerHTML = createListMarkup(normalized.hipoteses_compreensao);
    parecerSugestoes.innerHTML = createListMarkup(normalized.sugestoes_proxima_conducao);
    parecerTrechos.innerHTML = createListMarkup(normalized.trechos_relevantes);
    parecerResult.hidden = false;
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
      throw new Error(`Falha ao obter sessao autenticada: ${sessionError.message}`);
    }

    if (session?.user) return session.user;

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
      pagina: "parecer_ia_profissional",
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
      throw new Error("Nenhuma tarefa foi informada para o parecer IA.");
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
      throw new Error("A tarefa selecionada nao foi encontrada.");
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
      throw new Error(`Falha ao carregar interacoes: ${error.message}`);
    }

    currentInteractions = data || [];
  }

  function buildRelevantSnippets() {
    const valid = currentInteractions.filter((item) => String(item?.mensagem || "").trim());
    const selected = [];

    const firstPatient = valid.find((item) => item.autor_tipo === "paciente");
    const firstProfessional = valid.find((item) => item.autor_tipo === "profissional");
    const lastPatient = [...valid].reverse().find((item) => item.autor_tipo === "paciente");
    const lastProfessional = [...valid].reverse().find((item) => item.autor_tipo === "profissional");

    [firstPatient, firstProfessional, lastPatient, lastProfessional].forEach((item) => {
      if (item && !selected.some((entry) => String(entry.id) === String(item.id))) {
        selected.push(item);
      }
    });

    return selected.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  }

  function buildTimelineSummaryLines() {
    const total = currentInteractions.length;
    const totalPaciente = currentInteractions.filter((item) => item.autor_tipo !== "profissional").length;
    const totalProfissional = currentInteractions.filter((item) => item.autor_tipo === "profissional").length;
    const primeira = currentInteractions[0];
    const ultima = currentInteractions[currentInteractions.length - 1];

    const continuidade = total <= 1
      ? "Ainda nao existe sequencia suficiente de interacoes para observar mudanca ao longo do tempo."
      : totalPaciente && totalProfissional
        ? "Ja existe troca registrada entre paciente e profissional, o que ajuda a sustentar um parecer com base em dialogo e acompanhamento."
        : totalPaciente
          ? "A leitura atual depende principalmente das respostas do paciente. Ainda ha pouco retorno do profissional no historico."
          : "A leitura atual depende principalmente de registros do profissional. Ainda ha poucas respostas do paciente no historico.";

    return [
      `Total de interacoes reunidas: ${total}`,
      `Registros do paciente: ${totalPaciente}`,
      `Registros do profissional: ${totalProfissional}`,
      `Primeiro registro: ${primeira ? formatarDataHora(primeira.created_at) : "-"}`,
      `Ultimo registro: ${ultima ? formatarDataHora(ultima.created_at) : "-"}`,
      continuidade,
      primeira ? `Primeiro foco registrado: ${truncateText(primeira.mensagem, 180)}` : "Ainda nao ha primeira interacao registrada.",
      ultima ? `Registro mais recente: ${truncateText(ultima.mensagem, 180)}` : "Ainda nao ha ultimo registro para comparar."
    ];
  }

  function buildParecerPayload() {
    const taskKind = getTaskKind(currentTask);
    const snippets = buildRelevantSnippets().map((interaction) => ({
      author: interaction.autor_tipo === "profissional" ? "Profissional" : "Paciente",
      created_at: formatarDataHora(interaction.created_at),
      text: truncateText(interaction.mensagem || "", 320)
    }));

    const interactions = currentInteractions.map((interaction) => ({
      author: interaction.autor_tipo === "profissional" ? "Profissional" : "Paciente",
      created_at: formatarDataHora(interaction.created_at),
      text: String(interaction.mensagem || "").trim()
    }));

    return {
      patientName: patientAlias || "Paciente",
      taskTitle: currentTask?.titulo || "",
      taskDescription: currentTask?.descricao || "",
      taskOrigin: taskKind.eyebrow,
      taskInteractionPolicy: getInteractionPolicyLabel(currentTask),
      snippets,
      timelineSummary: buildTimelineSummaryLines(),
      interactions
    };
  }

  function renderRelevantSnippets() {
    if (!snippetsList || !snippetsEmptyState) return;
    const snippets = buildRelevantSnippets();

    if (!snippets.length) {
      snippetsList.innerHTML = "";
      snippetsEmptyState.hidden = false;
      return;
    }

    snippetsEmptyState.hidden = true;
    snippetsList.innerHTML = snippets.map((interaction) => `
      <article class="snippet-card">
        <div class="snippet-card__top">
          <span class="snippet-card__author">${interaction.autor_tipo === "profissional" ? "Profissional" : "Paciente"}</span>
          <span class="snippet-card__time">${formatarDataHora(interaction.created_at)}</span>
        </div>
        <p class="snippet-card__text">${escapeHtml(truncateText(interaction.mensagem, 260))}</p>
      </article>
    `).join("");
  }

  function renderTimelineSummary() {
    if (!timelineSummary) return;
    const lines = buildTimelineSummaryLines();

    timelineSummary.innerHTML = `
      <article class="summary-card">
        <span class="summary-card__title">Panorama cronologico</span>
        <ul>
          ${lines.slice(0, 5).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </article>
      <article class="summary-card">
        <span class="summary-card__title">Mudanca percebida</span>
        <p>${escapeHtml(lines[5] || "")}</p>
        <p>${escapeHtml(lines[6] || "")}</p>
        <p>${escapeHtml(lines[7] || "")}</p>
      </article>
    `;
  }

  async function gerarParecerIa() {
    if (!currentTask) {
      setScreenMessage("Nao foi possivel localizar a tarefa para gerar o parecer.");
      return;
    }

    try {
      setScreenMessage("");
      parecerResultPanel.hidden = false;
      resetParecerView();
      if (parecerLoading) parecerLoading.hidden = false;
      setParecerButtonState(true);

      const response = await fetch(AI_PROGRESS_OPINION_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(buildParecerPayload())
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || "Nao foi possivel gerar o parecer com IA.");
      }

      renderParecerResult(payload?.parecer ?? payload ?? {});
      await registrarEvento({
        evento: "parecer_ia_gerado",
        pagina: "parecer_ia_profissional",
        perfil: "profissional",
        userId: currentUser.id,
        email: currentProfile.email || currentUser.email || null,
        contexto: {
          tarefa_id: currentTask.id,
          paciente_id: currentTask.patient_user_id || null
        }
      });
    } catch (error) {
      console.error(error);
      setScreenMessage(error.message || "Nao foi possivel gerar o parecer com IA.");
    } finally {
      if (parecerLoading) parecerLoading.hidden = true;
      setParecerButtonState(false);
    }
  }

  function renderInteractions() {
    if (!interactionsList || !interactionsEmptyState) return;

    if (!currentInteractions.length) {
      interactionsList.innerHTML = "";
      interactionsEmptyState.hidden = false;
      return;
    }

    interactionsEmptyState.hidden = true;
    interactionsList.innerHTML = currentInteractions.map((interaction) => `
      <article class="interaction-item">
        <div class="interaction-item__top">
          <span class="interaction-item__author">${interaction.autor_tipo === "profissional" ? "Profissional" : "Paciente"}</span>
          <span class="interaction-item__time">${formatarDataHora(interaction.created_at)}</span>
        </div>
        <p class="interaction-item__text">${escapeHtml(interaction.mensagem || "")}</p>
      </article>
    `).join("");
  }

  async function renderTask() {
    if (!currentTask || !taskDetailCard) return;

    if (patientHeaderTitle) {
      patientHeaderTitle.textContent = `Parecer IA - ${patientAlias || "Paciente"}`;
    }

    const taskKind = getTaskKind(currentTask);
    taskTypeLabel.textContent = taskKind.eyebrow;
    taskTitle.textContent = currentTask.titulo || "Tarefa sem titulo";
    taskSubtitle.textContent = `Paciente: ${patientAlias || "Paciente"}`;
    taskOriginValue.textContent = taskKind.eyebrow;
    taskInteractionPolicy.textContent = getInteractionPolicyLabel(currentTask);
    taskHistoryCount.textContent = `${currentInteractions.length} registro(s)`;
    taskDescription.textContent = currentTask.descricao || "Sem descricao cadastrada.";

    taskDetailCard.hidden = false;
    emptyState.hidden = true;

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

  function bindEvents() {
    btnGenerateParecer?.addEventListener("click", gerarParecerIa);
    btnBottomMenu?.addEventListener("click", alternarMenuInferior);
    btnMenuLogout?.addEventListener("click", sairDoSistema);
    btnBack?.addEventListener("click", (event) => {
      event.preventDefault();
      window.history.back();
    });

    document.addEventListener("click", (event) => {
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
      renderRelevantSnippets();
      renderTimelineSummary();
      renderInteractions();

      await registrarEvento({
        evento: "parecer_ia_visualizado",
        pagina: "parecer_ia_profissional",
        perfil: "profissional",
        userId: currentUser.id,
        email: currentProfile.email || currentUser.email || null,
        contexto: {
          tarefa_id: currentTask.id,
          paciente_id: currentTask.patient_user_id || null
        }
      });
    } catch (error) {
      console.error(error);
      emptyState.hidden = false;
      setScreenMessage(error.message || "Nao foi possivel abrir a tela de parecer IA.");
    }
  }

  init();
});
