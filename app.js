let deferredPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredPrompt = event;

  const installBox = document.getElementById("installBox");
  if (installBox) {
    installBox.hidden = false;
  }
});

const btnInstall = document.getElementById("btnInstall");

if (btnInstall) {
  btnInstall.addEventListener("click", async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;

    const installBox = document.getElementById("installBox");
    if (installBox) {
      installBox.hidden = true;
    }
  });
}

window.addEventListener("appinstalled", () => {
  const installBox = document.getElementById("installBox");
  if (installBox) {
    installBox.hidden = true;
  }
});

