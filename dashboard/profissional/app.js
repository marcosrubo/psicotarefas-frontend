import supabase from "../../shared/supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  const userName = document.getElementById("userName");
  const userRole = document.getElementById("userRole");
  const userAvatar = document.getElementById("userAvatar");
  const welcomeTitle = document.getElementById("welcomeTitle");
  const welcomeText = document.getElementById("welcomeText");

  const btnEditName = document.getElementById("btnEditName");
  const editNameBox = document.getElementById("editNameBox");
  const editNameInput = document.getElementById("editNameInput");
  const btnCancelName = document.getElementById("btnCancelName");
  const btnSaveName = document.getElementById("btnSaveName");

  const btnLogout = document.getElementById("btnLogout");
  const btnToggleInvite = document.getElementById("btnToggleInvite");
  const invitePanel = document.getElementById("invitePanel");
  const inviteForm = document.getElementById("inviteForm");
  const inviteMessage = document.getElementById("inviteMessage");

  const patientNameInput = document.getElementById("patientName");
  const patientWhatsappInput = document.getElementById("patientWhatsapp");

  const generatedLinkBox = document.getElementById("generatedLinkBox");
  const generatedLinkInput = document.getElementById("generatedLink");
  const btnCopyLink = document.getElementById("btnCopyLink");
  const btnOpenWhatsapp = document.getElementById("btnOpenWhatsapp");

  const invitesList = document.getElementById("invitesList");
  const emptyState = document.getElementById("emptyState");

  let currentUser = null;
  let currentProfile = null;
  let currentInviteLink = "";
  let currentInvitePatientName = "";
  let currentWhatsappDigits = "";
  let currentProfessionalName = "seu psicólogo(a)";

  function mostrarMensagem(texto, tipo = "success") {
    if (!inviteMessage) return;
    inviteMessage.hidden = false;
    inviteMessage.textContent = texto;
    inviteMessage.className = `form-message form-message--${tipo}`;
  }

  function esconderMensagem() {
    if (!inviteMessage) return;
    inviteMessage.hidden = true;
    inviteMessage.textContent = "";
    inviteMessage.className = "form-message";
  }

  function obterIniciais(nome) {
    if (!nome) return "PT";

    return nome
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0].toUpperCase())
      .join("");
  }

  function normalizarWhatsapp(valor) {
    return (valor || "").replace(/\D/g, "");
  }

  function formatarWhatsapp(valor) {
    const digits = normalizarWhatsapp(valor).slice(0, 13);

    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }

    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }

  function gerarTokenConvite() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function montarLinkConvite(token) {
    return `${window.location.origin}/auth/index.html?modo=signup&perfil=paciente&convite=${encodeURIComponent(token)}`;
  }

  function limparNomeProfissional(valor) {
    const texto = (valor || "").trim();

    if (!texto) return "";

    if (texto.includes("@")) {
      const antesDoArroba = texto.split("@")[0].trim();
      if (!antesDoArroba) return "";
      return antesDoArroba;
    }

    return texto;
  }

  function obterPrimeiroNome(nomeCompleto) {
    const nomeLimpo = limparNomeProfissional(nomeCompleto);

    if (!nomeLimpo) return "Profissional";

    return nomeLimpo.split(" ")[0];
  }

  function formatarDataHora(dataIso) {
    const data = new Date(dataIso);

    return data.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function aplicarNomeNaTela(nome, email) {
    const nomeBase = limparNomeProfissional(nome || email || "");
    const nomeExibicao = nomeBase || "Profissional";
    const primeiroNome = obterPrimeiroNome(nome || email || "");

    currentProfessionalName = nomeExibicao;

    userName.textContent = nomeExibicao;
    userRole.textContent = "Psicólogo(a)";
    userAvatar.textContent = obterIniciais(nomeExibicao);
    welcomeTitle.textContent = `Olá, ${primeiroNome}`;
    welcomeText.textContent =
      "Convide pacientes, acompanhe seus convites e organize as tarefas entre vocês de forma simples e rápida.";

    editNameInput.value = nomeExibicao;
  }

  function abrirEdicaoNome() {
    editNameBox.hidden = false;
    btnEditName.hidden = true;
    editNameInput.focus();
    editNameInput.select();
  }

  function fecharEdicaoNome() {
    editNameBox.hidden = true;
    btnEditName.hidden = false;

    if (currentProfile) {
      editNameInput.value = limparNomeProfissional(
        currentProfile.nome || currentProfile.email || ""
      ) || "Profissional";
    }
  }

  function montarMensagemWhatsapp(nomePaciente, link) {
    return (
      `Olá, ${nomePaciente}! ` +
      `Seu psicólogo(a) ${currentProfessionalName} enviou um convite para acessar o PsicoTarefas.\n\n` +
      `Use este link para entrar no sistema:\n${link}`
    );
  }

  function renderInviteItem(convite) {
    const criadoEm = formatarDataHora(convite.created_at);
    const whatsapp = formatarWhatsapp(convite.patient_whatsapp);

    return `
      <article class="invite-item">
        <div class="invite-item__top">
          <div>
            <strong>${convite.patient_name}</strong>
            <span>${whatsapp}</span>
          </div>
          <span class="invite-badge">${convite.status}</span>
        </div>

        <div class="invite-item__meta">
          <span>Enviado em ${criadoEm}</span>
        </div>

        <div class="invite-item__actions">
          <button
            class="mini-btn mini-btn--ghost"
            data-copy-link="${convite.invite_link}"
            type="button"
          >
            Copiar link
          </button>

          <button
            class="mini-btn"
            data-whatsapp="${convite.patient_whatsapp}"
            data-patient-name="${convite.patient_name}"
            data-link="${convite.invite_link}"
            type="button"
          >
            WhatsApp
          </button>

          <button
            class="mini-btn mini-btn--danger"
            data-cancel-id="${convite.id}"
            type="button"
          >
            Cancelar convite
          </button>
        </div>
      </article>
    `;
  }

  async function carregarUsuario() {
    try {
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session?.user) {
        window.location.href = "../../auth/index.html?perfil=profissional";
        return;
      }

      currentUser = session.user;

      const { data: perfil, error } = await supabase
        .from("perfis")
        .select("nome, email, perfil")
        .eq("user_id", currentUser.id)
        .single();

      if (error || !perfil) {
        throw new Error("Perfil não encontrado.");
      }

      if (perfil.perfil !== "profissional") {
        await supabase.auth.signOut();
        window.location.href = "../../auth/index.html?perfil=profissional";
        return;
      }

      currentProfile = perfil;
      aplicarNomeNaTela(perfil.nome, perfil.email);
    } catch (error) {
      console.error("Erro ao carregar usuário:", error);
      mostrarMensagem(
        "Erro ao carregar os dados do profissional. Verifique o console.",
        "error"
      );
    }
  }

  async function atualizarNomeProfissional() {
    if (!currentUser || !currentProfile) {
      mostrarMensagem("Sessão inválida. Entre novamente.", "error");
      return;
    }

    const novoNome = editNameInput.value.trim();

    if (!novoNome) {
      mostrarMensagem("Informe um nome válido.", "error");
      return;
    }

    btnSaveName.disabled = true;
    btnSaveName.textContent = "Salvando...";

    try {
      const { error } = await supabase
        .from("perfis")
        .update({ nome: novoNome })
        .eq("user_id", currentUser.id);

      if (error) {
        throw error;
      }

      currentProfile.nome = novoNome;
      aplicarNomeNaTela(currentProfile.nome, currentProfile.email);
      fecharEdicaoNome();
      mostrarMensagem("Nome atualizado com sucesso.", "success");
    } catch (error) {
      console.error("Erro ao atualizar nome:", error);
      mostrarMensagem("Não foi possível atualizar o nome.", "error");
    } finally {
      btnSaveName.disabled = false;
      btnSaveName.textContent = "Salvar";
    }
  }

  async function carregarConvites() {
    if (!currentUser) return;

    try {
      const { data, error } = await supabase
        .from("convites")
        .select("id, patient_name, patient_whatsapp, invite_link, status, created_at")
        .eq("professional_user_id", currentUser.id)
        .eq("status", "pendente")
        .order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      if (!data || data.length === 0) {
        invitesList.innerHTML = "";
        emptyState.hidden = false;
        emptyState.textContent = "Você ainda não enviou convites pendentes.";
        return;
      }

      emptyState.hidden = true;
      invitesList.innerHTML = data.map(renderInviteItem).join("");
    } catch (error) {
      console.error("Erro ao carregar convites:", error);
      invitesList.innerHTML = "";
      emptyState.hidden = false;
      emptyState.textContent = "Não foi possível carregar os convites.";
    }
  }

  async function copiarTexto(texto) {
    await navigator.clipboard.writeText(texto);
  }

  async function cancelarConvite(inviteId) {
    const { error } = await supabase
      .from("convites")
      .update({ status: "cancelado" })
      .eq("id", inviteId)
      .eq("professional_user_id", currentUser.id);

    if (error) {
      throw error;
    }
  }

  function abrirWhatsapp(numero, nomePaciente, link) {
    const digits = normalizarWhatsapp(numero);

    if (!digits) {
      mostrarMensagem("Informe um WhatsApp válido para abrir o envio.", "error");
      return;
    }

    const mensagem = encodeURIComponent(montarMensagemWhatsapp(nomePaciente, link));
    const url = `https://wa.me/${digits}?text=${mensagem}`;

    window.open(url, "_blank");
  }

  btnEditName.addEventListener("click", abrirEdicaoNome);
  btnCancelName.addEventListener("click", fecharEdicaoNome);
  btnSaveName.addEventListener("click", atualizarNomeProfissional);

  editNameInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      atualizarNomeProfissional();
    }

    if (event.key === "Escape") {
      fecharEdicaoNome();
    }
  });

  if (btnToggleInvite && invitePanel) {
    btnToggleInvite.addEventListener("click", () => {
      invitePanel.hidden = !invitePanel.hidden;

      if (!invitePanel.hidden && patientNameInput) {
        patientNameInput.focus();
      }
    });
  }

  if (patientWhatsappInput) {
    patientWhatsappInput.addEventListener("input", () => {
      patientWhatsappInput.value = formatarWhatsapp(patientWhatsappInput.value);
    });
  }

  if (inviteForm) {
    inviteForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      esconderMensagem();

      const patientName = patientNameInput.value.trim();
      const patientWhatsapp = normalizarWhatsapp(patientWhatsappInput.value);

      if (!patientName) {
        mostrarMensagem("Informe o nome do paciente.", "error");
        return;
      }

      if (patientWhatsapp.length < 10) {
        mostrarMensagem("Informe um WhatsApp válido com DDD.", "error");
        return;
      }

      if (!currentUser) {
        mostrarMensagem("Sessão inválida. Entre novamente.", "error");
        return;
      }

      const token = gerarTokenConvite();
      const inviteLink = montarLinkConvite(token);

      try {
        const { error } = await supabase.from("convites").insert({
          token,
          professional_user_id: currentUser.id,
          patient_name: patientName,
          patient_whatsapp: patientWhatsapp,
          invite_link: inviteLink,
          status: "pendente"
        });

        if (error) {
          throw error;
        }

        currentInviteLink = inviteLink;
        currentInvitePatientName = patientName;
        currentWhatsappDigits = patientWhatsapp;

        generatedLinkInput.value = inviteLink;
        generatedLinkBox.hidden = false;

        mostrarMensagem(
          "Convite gerado com sucesso! Agora envie pelo WhatsApp.",
          "success"
        );

        inviteForm.reset();
        patientWhatsappInput.value = "";
        await carregarConvites();
      } catch (error) {
        console.error("Erro ao gerar convite:", error);
        mostrarMensagem("Não foi possível gerar o convite.", "error");
      }
    });
  }

  if (btnCopyLink) {
    btnCopyLink.addEventListener("click", async () => {
      if (!currentInviteLink) return;

      try {
        await copiarTexto(currentInviteLink);
        mostrarMensagem("Link copiado para a área de transferência.", "success");
      } catch (error) {
        console.error("Erro ao copiar link:", error);
        mostrarMensagem("Não foi possível copiar o link.", "error");
      }
    });
  }

  if (btnOpenWhatsapp) {
    btnOpenWhatsapp.addEventListener("click", () => {
      const link = generatedLinkInput.value.trim();

      abrirWhatsapp(
        currentWhatsappDigits,
        currentInvitePatientName || "paciente",
        link
      );
    });
  }

  if (invitesList) {
    invitesList.addEventListener("click", async (event) => {
      const copyButton = event.target.closest("[data-copy-link]");
      const whatsappButton = event.target.closest("[data-whatsapp]");
      const cancelButton = event.target.closest("[data-cancel-id]");

      if (copyButton) {
        const link = copyButton.getAttribute("data-copy-link");

        try {
          await copiarTexto(link);
          mostrarMensagem("Link copiado para a área de transferência.", "success");
        } catch (error) {
          console.error("Erro ao copiar link:", error);
          mostrarMensagem("Não foi possível copiar o link.", "error");
        }

        return;
      }

      if (whatsappButton) {
        const numero = whatsappButton.getAttribute("data-whatsapp");
        const nomePaciente = whatsappButton.getAttribute("data-patient-name");
        const link = whatsappButton.getAttribute("data-link");

        abrirWhatsapp(numero, nomePaciente, link);
        return;
      }

      if (cancelButton) {
        const inviteId = cancelButton.getAttribute("data-cancel-id");
        const confirmar = window.confirm("Deseja cancelar este convite?");

        if (!confirmar) return;

        try {
          await cancelarConvite(inviteId);
          mostrarMensagem("Convite cancelado com sucesso.", "success");
          await carregarConvites();
        } catch (error) {
          console.error("Erro ao cancelar convite:", error);
          mostrarMensagem("Não foi possível cancelar o convite.", "error");
        }
      }
    });
  }

  if (btnLogout) {
    btnLogout.addEventListener("click", async () => {
      await supabase.auth.signOut();
      window.location.href = "../../auth/index.html?perfil=profissional";
    });
  }

  async function iniciarDashboard() {
    await carregarUsuario();
    await carregarConvites();
  }

  iniciarDashboard();
});