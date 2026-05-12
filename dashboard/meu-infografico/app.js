import supabase from "../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("infographicForm");
  const themeInput = document.getElementById("themeInput");
  const characterSelect = document.getElementById("characterSelect");
  const qualitySelect = document.getElementById("qualitySelect");
  const notesInput = document.getElementById("notesInput");
  const notesHint = document.getElementById("notesHint");
  const screenMessage = document.getElementById("screenMessage");
  const btnGenerate = document.getElementById("btnGenerate");
  const btnDownload = document.getElementById("btnDownload");
  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");
  const infographicCard = document.getElementById("infographicCard");
  const previewTask = document.getElementById("previewTask");
  const previewTitle = document.getElementById("previewTitle");
  const previewContext = document.getElementById("previewContext");
  const previewYellowStrip = document.getElementById("previewYellowStrip");
  const previewChallengeTitle = document.getElementById("previewChallengeTitle");
  const challengeGrid = document.getElementById("challengeGrid");
  const reflectionList = document.getElementById("reflectionList");
  const helpList = document.getElementById("helpList");
  const finalPhrase = document.getElementById("finalPhrase");
  const previewImage = document.getElementById("previewImage");
  const imagePlaceholder = document.getElementById("imagePlaceholder");

  let currentUser = null;
  let currentProfile = null;
  let lastTheme = "infografico";

  const challengeIcons = [
    {
      color: "#6F2DBD",
      svg: '<path d="M18 13a7 7 0 0 0-13 4 5 5 0 0 0 5 5h8a6 6 0 0 0 0-12Z" /><path d="M13 9V7a4 4 0 0 1 8 0 4 4 0 0 1-4 4" /><path d="M12 15h.01" /><path d="M16 15h.01" />'
    },
    {
      color: "#F59E0B",
      svg: '<path d="M5 8h13a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2H5Z" /><path d="M20 11h2v2h-2" /><path d="M8 10v4" />'
    },
    {
      color: "#1D7DD1",
      svg: '<path d="M20.8 8.6a5.5 5.5 0 0 0-7.8 0L12 9.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 25l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" /><path d="M5 15h4l2-5 3 9 2-4h5" />'
    },
    {
      color: "#65B80F",
      svg: '<path d="M9 18a6 6 0 1 1 6-10 5 5 0 1 1 2 10H9Z" /><path d="M7 22h.01" /><path d="M12 24h.01" />'
    },
    {
      color: "#EF4444",
      svg: '<path d="M12 3 2.8 20h18.4Z" /><path d="M12 9v5" /><path d="M12 17h.01" />'
    },
    {
      color: "#38BDBB",
      svg: '<path d="M21 15.5A8.5 8.5 0 0 1 8.5 3 8.5 8.5 0 1 0 21 15.5Z" /><path d="m18 4 1 2 2 1-2 1-1 2-1-2-2-1 2-1Z" />'
    }
  ];

  const helpIcons = ["🧘", "👟", "💬", "📝", "⏰", "❤"];

  function getInfographicEndpoint() {
    const isLocalhost = ["localhost", "127.0.0.1"].includes(window.location.hostname);
    return isLocalhost
      ? "http://localhost:3000/api/ai/meu-infografico"
      : "https://psicotarefas-backend.onrender.com/api/ai/meu-infografico";
  }

  function showMessage(text = "", type = "error") {
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

  function slugify(value) {
    return String(value || "infografico")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/-{2,}/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase();
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function normalizarLista(items, tamanho, fallback) {
    const list = Array.isArray(items) ? items : [];
    const merged = list
      .map((item) => String(item || "").trim())
      .filter(Boolean)
      .slice(0, tamanho);

    while (merged.length < tamanho) {
      merged.push(fallback[merged.length] || "Observar sinais");
    }

    return merged;
  }

  function renderList(element, items) {
    if (!element) return;
    element.innerHTML = items.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  }

  function renderHelp(items) {
    if (!helpList) return;
    helpList.innerHTML = items
      .map(
        (item, index) => `
          <article class="help-card">
            <span aria-hidden="true">${helpIcons[index % helpIcons.length]}</span>
            <strong>${escapeHtml(item)}</strong>
          </article>
        `
      )
      .join("");
  }

  function renderChallenges(items) {
    if (!challengeGrid) return;

    challengeGrid.innerHTML = items
      .map((item, index) => {
        const icon = challengeIcons[index % challengeIcons.length];
        return `
          <article class="challenge-card">
            <span class="challenge-icon" style="background:${icon.color}" aria-hidden="true">
              <svg viewBox="0 0 24 24">${icon.svg}</svg>
            </span>
            <strong>${escapeHtml(item)}</strong>
          </article>
        `;
      })
      .join("");
  }

  function renderInfographic({ conteudo, imagemUrl }) {
    const desafios = normalizarLista(conteudo?.desafios, 6, [
      "Perceber sinais",
      "Nomear emoção",
      "Reduzir pressa",
      "Pedir apoio",
      "Criar pausa",
      "Dormir melhor"
    ]);
    const perguntas = normalizarLista(conteudo?.perguntas_reflexao, 3, [
      "O que esta emoção tenta comunicar?",
      "Que pequeno passo posso testar hoje?",
      "Que apoio posso buscar?"
    ]);
    const ajuda = normalizarLista(conteudo?.o_que_pode_ajudar, 6, [
      "Respirar com calma",
      "Registrar pensamentos",
      "Fazer uma pausa",
      "Conversar com alguém seguro",
      "Manter rotina leve",
      "Buscar ajuda"
    ]);

    if (previewTask) previewTask.textContent = conteudo?.tarefa || "TAREFA 5";
    if (previewTitle) previewTitle.textContent = conteudo?.titulo || "Infográfico terapêutico";
    if (previewContext) previewContext.textContent = conteudo?.contexto || "";
    if (previewYellowStrip) previewYellowStrip.textContent = conteudo?.faixa_amarela || "Desafios do tema";
    if (previewChallengeTitle) {
      previewChallengeTitle.textContent = `DESAFIOS ${lastTheme ? `DE ${lastTheme.toUpperCase()}` : ""}`;
    }
    if (finalPhrase) finalPhrase.textContent = conteudo?.frase_final || "Cada passo pequeno também conta.";

    renderChallenges(desafios);
    renderList(reflectionList, perguntas);
    renderHelp(ajuda);

    if (previewImage && imagePlaceholder && imagemUrl) {
      previewImage.src = imagemUrl;
      previewImage.hidden = false;
      imagePlaceholder.hidden = true;
    }

    if (btnDownload) btnDownload.hidden = false;
  }

  function contarFrases(text) {
    return String(text || "")
      .split(/[.!?]+/)
      .map((item) => item.trim())
      .filter(Boolean).length;
  }

  function contarPalavras(text) {
    return String(text || "")
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }

  function validarObservacoes() {
    if (!notesInput || !notesHint) return true;

    const text = notesInput.value.trim();
    const wordCount = contarPalavras(text);
    const sentenceCount = contarFrases(text);
    const isValid = !text || wordCount <= 20 || sentenceCount <= 3;

    notesHint.classList.toggle("is-warning", !isValid);
    notesHint.textContent = isValid
      ? "Máximo recomendado: 20 palavras ou até 3 frases curtas."
      : "Tente reduzir para até 20 palavras ou 3 frases curtas.";

    return isValid;
  }

  function setLoading(isLoading) {
    if (!btnGenerate) return;
    btnGenerate.disabled = isLoading;
    btnGenerate.textContent = isLoading ? "Gerando..." : "Gerar infográfico";
  }

  async function obterUsuarioAutenticado() {
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(`Falha ao obter sessão autenticada: ${sessionError.message}`);
    }

    return session?.user || null;
  }

  async function carregarPerfil() {
    currentUser = await obterUsuarioAutenticado();

    if (!currentUser) {
      window.location.href = "../../auth/profissional-login/index.html";
      return false;
    }

    const { data: perfil, error } = await supabase
      .from("perfis")
      .select("nome, email, perfil")
      .eq("user_id", currentUser.id)
      .single();

    if (error) {
      throw new Error(`Falha ao carregar perfil: ${error.message}`);
    }

    if (perfil?.perfil !== "profissional") {
      window.location.href = "../../auth/profissional-login/index.html";
      return false;
    }

    currentProfile = perfil;
    return true;
  }

  async function sairDoSistema() {
    await registrarEvento({
      evento: "logout",
      pagina: "meu_infografico",
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

  async function gerarInfografico(event) {
    event.preventDefault();
    showMessage();

    if (!validarObservacoes()) {
      showMessage("Revise o campo de observações antes de gerar.", "error");
      return;
    }

    const tema = themeInput?.value.trim() || "";
    const personagem = characterSelect?.value || "";
    const qualidade = qualitySelect?.value || "medium";
    const observacoes = notesInput?.value.trim() || "";

    if (!tema || !personagem) {
      showMessage("Informe tema e personagem para gerar o infográfico.", "error");
      return;
    }

    lastTheme = tema;
    setLoading(true);

    try {
      const response = await fetch(getInfographicEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tema,
          personagem,
          observacoes,
          qualidade
        })
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload?.error || "Não foi possível gerar o infográfico.");
      }

      renderInfographic(payload);
      showMessage("Infográfico gerado. Revise o conteúdo antes de usar com o paciente.", "success");

      await registrarEvento({
        evento: "meu_infografico_gerado",
        pagina: "meu_infografico",
        perfil: "profissional",
        userId: currentUser?.id || null,
        email: currentProfile?.email || currentUser?.email || null,
        contexto: { tema, personagem, qualidade }
      });
    } catch (error) {
      console.error("Erro ao gerar infográfico:", error);
      showMessage(error.message || "Não foi possível gerar o infográfico.", "error");
    } finally {
      setLoading(false);
    }
  }

  async function baixarImagem() {
    if (!infographicCard || !window.html2canvas) return;

    try {
      if (btnDownload) btnDownload.disabled = true;
      infographicCard.classList.add("is-exporting");
      const canvas = await window.html2canvas(infographicCard, {
        backgroundColor: "#ffffff",
        scale: 1,
        useCORS: true,
        width: 1080,
        height: 1920
      });
      const link = document.createElement("a");
      link.download = `${slugify(lastTheme)}-infografico-psicotarefas.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();
    } catch (error) {
      console.error("Erro ao baixar imagem:", error);
      showMessage("Não foi possível baixar a imagem agora.", "error");
    } finally {
      infographicCard.classList.remove("is-exporting");
      if (btnDownload) btnDownload.disabled = false;
    }
  }

  function ajustarEscalaPreview() {
    if (!infographicCard) return;
    const wrap = infographicCard.parentElement;
    if (!wrap) return;

    const width = Math.min(wrap.clientWidth || 540, 540);
    const scale = Math.max(0.28, Math.min(0.5, width / 1080));
    infographicCard.style.setProperty("--preview-scale", String(scale));
  }

  function renderInitialState() {
    renderChallenges([
      "Preocupação",
      "Cansaço",
      "Sintomas",
      "Pensamentos",
      "Medo",
      "Sono"
    ]);
    renderList(reflectionList, [
      "O que dispara essa emoção?",
      "Como meu corpo reage?",
      "Que apoio posso buscar?"
    ]);
    renderHelp([
      "Respirar com calma",
      "Nomear a emoção",
      "Dar um passo pequeno",
      "Conversar com alguém seguro",
      "Manter rotina leve",
      "Buscar ajuda"
    ]);
  }

  form?.addEventListener("submit", gerarInfografico);
  notesInput?.addEventListener("input", validarObservacoes);
  btnDownload?.addEventListener("click", baixarImagem);
  btnBottomMenu?.addEventListener("click", alternarMenuInferior);
  btnMenuLogout?.addEventListener("click", sairDoSistema);
  document.addEventListener("click", (event) => {
    if (!bottomMenuPanel || !btnBottomMenu) return;

    const clicouDentroDoMenu = bottomMenuPanel.contains(event.target);
    const clicouNoBotao = btnBottomMenu.contains(event.target);

    if (!clicouDentroDoMenu && !clicouNoBotao) {
      fecharMenuInferior();
    }
  });
  bottomMenuPanel?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", fecharMenuInferior);
  });
  window.addEventListener("resize", ajustarEscalaPreview);

  renderInitialState();
  ajustarEscalaPreview();

  carregarPerfil()
    .then((ok) => {
      if (!ok) return;
      return registrarAcessoPagina({
        pagina: "meu_infografico",
        perfil: "profissional",
        userId: currentUser?.id || null,
        email: currentProfile?.email || currentUser?.email || null
      });
    })
    .catch((error) => {
      console.error("Erro na tela Meu Infográfico:", error);
      showMessage(error.message || "Não foi possível carregar a tela.", "error");
    });
});
