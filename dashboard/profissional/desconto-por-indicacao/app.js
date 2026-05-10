import supabase from "../../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const btnBack = document.getElementById("btnBack");
  const screenMessage = document.getElementById("screenMessage");
  const professionalSearch = document.getElementById("professionalSearch");
  const professionalsList = document.getElementById("professionalsList");
  const professionalsEmptyState = document.getElementById("professionalsEmptyState");
  const currentReferralName = document.getElementById("currentReferralName");
  const confirmOverlay = document.getElementById("confirmOverlay");
  const selectedProfessionalName = document.getElementById("selectedProfessionalName");
  const btnCancelSelection = document.getElementById("btnCancelSelection");
  const btnConfirmSelection = document.getElementById("btnConfirmSelection");

  let currentUser = null;
  let currentProfile = null;
  let professionals = [];
  let selectedProfessional = null;

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

  function limparNome(valor) {
    const texto = (valor || "").trim();

    if (!texto) return "";
    if (texto.includes("@")) return texto.split("@")[0].trim();
    return texto;
  }

  function obterIniciais(nome) {
    const nomeLimpo = limparNome(nome);
    if (!nomeLimpo) return "PT";

    return nomeLimpo
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0].toUpperCase())
      .join("");
  }

  function normalizarTexto(valor) {
    return (valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
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

  async function validarProfissional() {
    const user = await obterUsuarioAutenticado();

    if (!user) {
      window.location.href = "../../../auth/profissional-login/index.html";
      return false;
    }

    currentUser = user;

    const { data: perfil, error } = await supabase
      .from("perfis")
      .select("nome, email, perfil, indicado_por_profissional_user_id")
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
      pagina: "desconto_por_indicacao",
      perfil: "profissional",
      userId: currentUser.id,
      email: perfil.email || currentUser.email || null
    });

    return true;
  }

  async function carregarProfissionais() {
    const { data, error } = await supabase
      .from("perfis")
      .select("user_id, nome, email")
      .eq("perfil", "profissional")
      .not("email_confirmed_at", "is", null)
      .neq("user_id", currentUser.id)
      .order("nome", { ascending: true });

    if (error) {
      throw new Error(`Falha ao carregar profissionais: ${error.message}`);
    }

    professionals = data || [];
  }

  function renderProfissionais() {
    if (!professionalsList || !professionalsEmptyState) return;

    const termo = normalizarTexto(professionalSearch?.value || "");
    const filtrados = professionals.filter((professional) => {
      const nome = normalizarTexto(professional.nome || "");
      const email = normalizarTexto(professional.email || "");
      return nome.includes(termo) || email.includes(termo);
    });

    if (!filtrados.length) {
      professionalsList.innerHTML = "";
      professionalsEmptyState.hidden = false;
      return;
    }

    professionalsEmptyState.hidden = true;
    professionalsList.innerHTML = filtrados
      .map((professional) => {
        const nome = limparNome(professional.nome || professional.email || "") || "Profissional";

        return `
          <button class="professional-card" type="button" data-professional-id="${escapeHtml(professional.user_id)}">
            <span class="professional-card__avatar">${escapeHtml(obterIniciais(nome))}</span>
            <span class="professional-card__text">
              <strong>${escapeHtml(nome)}</strong>
              <small>${escapeHtml(professional.email || "")}</small>
            </span>
          </button>
        `;
      })
      .join("");
  }

  function renderIndicacaoAtual() {
    if (!currentReferralName) return;

    const professionalId = currentProfile?.indicado_por_profissional_user_id;

    if (!professionalId) {
      currentReferralName.textContent = "Nenhum profissional selecionado.";
      return;
    }

    const professional = professionals.find((item) => item.user_id === professionalId);
    const nome = limparNome(professional?.nome || professional?.email || "");
    currentReferralName.textContent = nome || "Profissional não encontrado.";
  }

  function abrirConfirmacao(professional) {
    selectedProfessional = professional;
    const nome = limparNome(professional?.nome || professional?.email || "") || "Profissional";

    if (selectedProfessionalName) selectedProfessionalName.textContent = nome;
    if (confirmOverlay) confirmOverlay.hidden = false;
  }

  function fecharConfirmacao() {
    selectedProfessional = null;
    if (confirmOverlay) confirmOverlay.hidden = true;
  }

  async function confirmarIndicacao() {
    if (!selectedProfessional || !currentUser) return;

    if (selectedProfessional.user_id === currentUser.id) {
      setScreenMessage("O profissional não pode indicar a si mesmo.");
      fecharConfirmacao();
      return;
    }

    if (btnConfirmSelection) {
      btnConfirmSelection.disabled = true;
      btnConfirmSelection.textContent = "Gravando...";
    }

    try {
      const { error } = await supabase
        .from("perfis")
        .update({
          indicado_por_profissional_user_id: selectedProfessional.user_id,
          indicado_por_profissional_at: new Date().toISOString()
        })
        .eq("user_id", currentUser.id);

      if (error) {
        throw new Error(`Não foi possível gravar a indicação: ${error.message}`);
      }

      currentProfile = {
        ...currentProfile,
        indicado_por_profissional_user_id: selectedProfessional.user_id
      };
      renderIndicacaoAtual();

      await registrarEvento({
        evento: "desconto_indicacao_confirmado",
        pagina: "desconto_por_indicacao",
        perfil: "profissional",
        userId: currentUser.id,
        email: currentProfile?.email || currentUser.email || null,
        contexto: {
          indicado_por_profissional_user_id: selectedProfessional.user_id
        }
      });

      window.location.href = "../index.html";
    } catch (error) {
      console.error("Erro ao confirmar indicação:", error);
      setScreenMessage(error.message || "Não foi possível gravar a indicação.");
      fecharConfirmacao();
    } finally {
      if (btnConfirmSelection) {
        btnConfirmSelection.disabled = false;
        btnConfirmSelection.textContent = "Confirmar";
      }
    }
  }

  if (btnBack) {
    btnBack.addEventListener("click", () => {
      window.location.href = "../index.html";
    });
  }

  if (professionalSearch) {
    professionalSearch.addEventListener("input", renderProfissionais);
  }

  if (professionalsList) {
    professionalsList.addEventListener("click", (event) => {
      const card = event.target.closest("[data-professional-id]");
      if (!card) return;

      const professionalId = card.getAttribute("data-professional-id");
      const professional = professionals.find((item) => item.user_id === professionalId);
      if (professional) abrirConfirmacao(professional);
    });
  }

  if (btnCancelSelection) {
    btnCancelSelection.addEventListener("click", fecharConfirmacao);
  }

  if (btnConfirmSelection) {
    btnConfirmSelection.addEventListener("click", confirmarIndicacao);
  }

  if (confirmOverlay) {
    confirmOverlay.addEventListener("click", (event) => {
      if (event.target === confirmOverlay) fecharConfirmacao();
    });
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") fecharConfirmacao();
  });

  async function iniciar() {
    setScreenMessage();
    const ok = await validarProfissional();
    if (!ok) return;

    await carregarProfissionais();
    renderIndicacaoAtual();
    renderProfissionais();
  }

  iniciar().catch((error) => {
    console.error("Erro na tela desconto por indicação:", error);
    setScreenMessage(error.message || "Não foi possível carregar a tela de desconto por indicação.");
  });
});
