import supabase from "../shared/supabase.js";
import { registrarEvento } from "../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const btnBack = document.getElementById("btnBack");
  const btnCloseVideo = document.getElementById("btnCloseVideo");
  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");
  const tutorialVideo = document.getElementById("tutorialVideo");
  const selectedVideoTitle = document.getElementById("selectedVideoTitle");
  const videoPanel = document.querySelector(".video-panel");
  const tutorialCards = Array.from(document.querySelectorAll("[data-video-id]"));
  const mobileTutorialsQuery = window.matchMedia("(max-width: 767px)");
  let currentVideoSrc = tutorialVideo?.src || "";

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

  function abrirVideoMobile() {
    if (!videoPanel || !tutorialVideo) return;

    tutorialVideo.src = currentVideoSrc;
    videoPanel.classList.add("is-open");
    document.body.classList.add("has-video-modal");
  }

  function fecharVideoMobile() {
    if (!videoPanel || !tutorialVideo) return;

    videoPanel.classList.remove("is-open");
    document.body.classList.remove("has-video-modal");
    tutorialVideo.src = "";
  }

  async function sairDoSistema() {
    await registrarEvento({
      evento: "logout",
      pagina: "tutoriais",
      perfil: "profissional"
    });

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Erro ao sair:", error);
    }

    window.location.href = "../auth/profissional-login/index.html";
  }

  function selecionarVideo(card) {
    const videoId = card.dataset.videoId;
    const videoTitle = card.dataset.videoTitle || "Tutorial";

    if (!videoId || !tutorialVideo || !selectedVideoTitle) return;

    tutorialCards.forEach((item) => item.classList.toggle("is-active", item === card));
    selectedVideoTitle.textContent = videoTitle;
    tutorialVideo.title = videoTitle;
    currentVideoSrc = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;
    tutorialVideo.src = currentVideoSrc;

    if (videoPanel && mobileTutorialsQuery.matches) {
      abrirVideoMobile();
    }
  }

  if (btnBack) {
    btnBack.addEventListener("click", () => {
      fecharVideoMobile();
      fecharMenuInferior();
      window.location.href = "../dashboard/profissional/index.html";
    });
  }

  tutorialCards.forEach((card) => {
    card.addEventListener("click", () => selecionarVideo(card));
  });

  btnCloseVideo?.addEventListener("click", fecharVideoMobile);
  btnBottomMenu?.addEventListener("click", alternarMenuInferior);
  btnMenuLogout?.addEventListener("click", sairDoSistema);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mobileTutorialsQuery.matches) {
      fecharVideoMobile();
    }
  });

  document.addEventListener("click", (event) => {
    if (!bottomMenuPanel || !btnBottomMenu) return;

    const clicouDentroDoMenu = bottomMenuPanel.contains(event.target);
    const clicouNoBotao = btnBottomMenu.contains(event.target);

    if (!clicouDentroDoMenu && !clicouNoBotao) {
      fecharMenuInferior();
    }
  });
});
