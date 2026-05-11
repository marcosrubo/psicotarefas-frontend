document.addEventListener("DOMContentLoaded", () => {
  const btnBack = document.getElementById("btnBack");
  const tutorialVideo = document.getElementById("tutorialVideo");
  const selectedVideoTitle = document.getElementById("selectedVideoTitle");
  const videoPanel = document.querySelector(".video-panel");
  const tutorialCards = Array.from(document.querySelectorAll("[data-video-id]"));
  const mobileTutorialsQuery = window.matchMedia("(max-width: 767px)");

  function selecionarVideo(card) {
    const videoId = card.dataset.videoId;
    const videoTitle = card.dataset.videoTitle || "Tutorial";

    if (!videoId || !tutorialVideo || !selectedVideoTitle) return;

    tutorialCards.forEach((item) => item.classList.toggle("is-active", item === card));
    selectedVideoTitle.textContent = videoTitle;
    tutorialVideo.title = videoTitle;
    tutorialVideo.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}`;

    if (videoPanel && mobileTutorialsQuery.matches) {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      videoPanel.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "start"
      });
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
});
