document.addEventListener("DOMContentLoaded", () => {
  const btnBack = document.getElementById("btnBack");
  const topbar = document.querySelector(".topbar");

  const syncTopbarHeight = () => {
    if (!topbar) return;

    const height = Math.ceil(topbar.getBoundingClientRect().height);
    document.documentElement.style.setProperty("--plans-topbar-height", `${height}px`);
  };

  syncTopbarHeight();
  window.addEventListener("resize", syncTopbarHeight);

  btnBack?.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = "../profissional/index.html";
  });
});
