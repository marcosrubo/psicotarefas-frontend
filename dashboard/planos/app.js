document.addEventListener("DOMContentLoaded", () => {
  const btnBack = document.getElementById("btnBack");
  const paidPlansModal = document.getElementById("paidPlansModal");
  const btnPaidPlansOk = document.getElementById("btnPaidPlansOk");
  const paidPlanButtons = document.querySelectorAll(".plan-cta");

  btnBack?.addEventListener("click", () => {
    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = "../profissional/index.html";
  });

  const closePaidPlansModal = () => {
    if (!paidPlansModal) {
      return;
    }

    paidPlansModal.hidden = true;
  };

  const openPaidPlansModal = () => {
    if (!paidPlansModal) {
      return;
    }

    paidPlansModal.hidden = false;
    btnPaidPlansOk?.focus();
  };

  paidPlanButtons.forEach((button) => {
    button.addEventListener("click", openPaidPlansModal);
  });

  btnPaidPlansOk?.addEventListener("click", closePaidPlansModal);

  paidPlansModal?.addEventListener("click", (event) => {
    if (event.target.closest("[data-paid-plans-close]")) {
      closePaidPlansModal();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !paidPlansModal?.hidden) {
      closePaidPlansModal();
    }
  });
});
