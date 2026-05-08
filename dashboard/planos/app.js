document.addEventListener("DOMContentLoaded", () => {
  const btnBack = document.getElementById("btnBack");

  btnBack?.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = "../profissional/index.html";
  });
});
