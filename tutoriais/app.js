document.addEventListener("DOMContentLoaded", () => {
  const btnBack = document.getElementById("btnBack");
  const btnCloseVideo = document.getElementById("btnCloseVideo");
  const tutorialVideo = document.getElementById("tutorialVideo");
  const selectedVideoTitle = document.getElementById("selectedVideoTitle");
  const videoPanel = document.querySelector(".video-panel");
  const tutorialCards = Array.from(document.querySelectorAll("[data-video-id]"));
  const mobileTutorialsQuery = window.matchMedia("(max-width: 767px)");
  let currentVideoSrc = tutorialVideo?.src || "";

  function abrirVideoMobile() {
    if (!videoPanel) return;

    videoPanel.classList.add("is-open");
    document.body.classList.add("has-video-modal");
  }

  function fecharVideoMobile() {
    if (!videoPanel || !tutorialVideo) return;

    videoPanel.classList.remove("is-open");
    document.body.classList.remove("has-video-modal");
    tutorialVideo.src = "";
    tutorialVideo.src = currentVideoSrc;
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
      if (window.history.length > 1) {
        window.history.back();
        return;
      }

      window.location.href = "../index.html";
    });
  }

  tutorialCards.forEach((card) => {
    card.addEventListener("click", () => selecionarVideo(card));
  });

  btnCloseVideo?.addEventListener("click", fecharVideoMobile);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && mobileTutorialsQuery.matches) {
      fecharVideoMobile();
    }
  });
});
