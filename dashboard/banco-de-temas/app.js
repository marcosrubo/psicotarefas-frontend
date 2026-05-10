import supabase from "../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const btnBack = document.getElementById("btnBack");
  const screenMessage = document.getElementById("screenMessage");
  const themesEmptyState = document.getElementById("themesEmptyState");
  const themesList = document.getElementById("themesList");
  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");

  let currentUser = null;
  let currentProfile = null;
  let themes = [];

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

    if (error) return false;
    return Array.isArray(data) && data.length > 0;
  }

  async function redirecionarPorPerfil(userId, perfil) {
    if (perfil === "profissional") {
      window.location.href = "../profissional/index.html";
      return;
    }

    if (perfil === "paciente") {
      const temVinculo = await pacienteTemVinculoAtivo(userId);
      window.location.href = temVinculo
        ? "../paciente-com-vinculo/index.html"
        : "../paciente-sem-vinculo/index.html";
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
      pagina: "banco_de_temas",
      perfil: "profissional",
      userId: currentUser.id,
      email: perfil.email || currentUser.email || null
    });

    return true;
  }

  async function sairDoSistema() {
    await registrarEvento({
      evento: "logout",
      pagina: "banco_de_temas",
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

  async function carregarTemas() {
    const { data, error } = await supabase
      .from("banco_tarefas_temas")
      .select("id, nome, ordem")
      .order("ordem", { ascending: true })
      .order("nome", { ascending: true });

    if (error) {
      throw new Error(`Falha ao carregar temas: ${error.message}`);
    }

    themes = data || [];
  }

  function renderTemas() {
    if (!themesList || !themesEmptyState) return;

    if (!themes.length) {
      themesList.innerHTML = "";
      themesEmptyState.hidden = false;
      return;
    }

    themesEmptyState.hidden = true;
    themesList.innerHTML = themes
      .map(
        (theme) => `
          <article class="theme-card">
            <div class="theme-card__content">
              <strong>${escapeHtml(theme.nome || "Tema")}</strong>
            </div>
            <div class="theme-card__actions">
              <button class="theme-card__button" type="button" data-theme-action="tarefas" data-theme-id="${escapeHtml(theme.id)}">
                tarefas
              </button>
              <button class="theme-card__button" type="button" data-theme-action="videos" data-theme-id="${escapeHtml(theme.id)}">
                vídeos
              </button>
            </div>
          </article>
        `
      )
      .join("");
  }

  if (btnBack) {
    btnBack.addEventListener("click", () => {
      window.location.href = "../profissional/index.html";
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

    await carregarTemas();
    renderTemas();
  }

  iniciar().catch((error) => {
    console.error("Erro na tela banco de temas:", error);
    setScreenMessage(error.message || "Não foi possível carregar os temas disponíveis.");
  });
});
