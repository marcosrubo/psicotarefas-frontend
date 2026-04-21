import supabase from "../../shared/supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  const userName = document.getElementById("userName");
  const userRole = document.getElementById("userRole");
  const userAvatar = document.getElementById("userAvatar");
  const welcomeTitle = document.getElementById("welcomeTitle");
  const welcomeText = document.getElementById("welcomeText");

  const professionalCard = document.getElementById("professionalCard");
  const professionalEmpty = document.getElementById("professionalEmpty");
  const professionalAvatar = document.getElementById("professionalAvatar");
  const professionalName = document.getElementById("professionalName");
  const professionalRole = document.getElementById("professionalRole");
  const professionalEmail = document.getElementById("professionalEmail");
  const vinculoInfo = document.getElementById("vinculoInfo");
  const tasksList = document.getElementById("tasksList");
  const tasksEmptyState = document.getElementById("tasksEmptyState");
  const taskDetailCard = document.getElementById("taskDetailCard");
  const taskDetailEmptyState = document.getElementById("taskDetailEmptyState");
  const taskDetailTitle = document.getElementById("taskDetailTitle");
  const taskDetailDescription = document.getElementById("taskDetailDescription");
  const taskStatusChip = document.getElementById("taskStatusChip");
  const taskCreatedAt = document.getElementById("taskCreatedAt");
  const taskProfessionalName = document.getElementById("taskProfessionalName");
  const interactionsList = document.getElementById("interactionsList");
  const interactionEditCard = document.getElementById("interactionEditCard");
  const interactionEditInput = document.getElementById("interactionEditInput");
  const interactionEditMessage = document.getElementById("interactionEditMessage");
  const btnCancelEditInteraction = document.getElementById("btnCancelEditInteraction");
  const btnSaveEditInteraction = document.getElementById("btnSaveEditInteraction");
  const interactionFormCard = document.getElementById("interactionFormCard");
  const interactionTextInput = document.getElementById("interactionTextInput");
  const interactionFormMessage = document.getElementById("interactionFormMessage");
  const btnClearInteraction = document.getElementById("btnClearInteraction");
  const btnCreateInteraction = document.getElementById("btnCreateInteraction");

  const btnLogout = document.getElementById("btnLogout");

  let currentUser = null;
  let currentPatientProfile = null;
  let currentProfessional = null;
  let currentVinculo = null;
  let tasks = [];
  let interactionsByTask = new Map();
  let selectedTaskId = null;
  let editingInteractionId = null;

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

  function limparNome(valor) {
    const texto = (valor || "").trim();

    if (!texto) return "";

    if (texto.includes("@")) {
      const antesDoArroba = texto.split("@")[0].trim();
      return antesDoArroba || "";
    }

    return texto;
  }

  function obterPrimeiroNome(nomeCompleto) {
    const nomeLimpo = limparNome(nomeCompleto);
    if (!nomeLimpo) return "Paciente";
    return nomeLimpo.split(" ")[0];
  }

  function formatarData(dataIso) {
    return new Date(dataIso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  }

  function formatarDataHora(dataIso) {
    return new Date(dataIso).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function setInteractionFormMessage(text = "", type = "") {
    if (!interactionFormMessage) return;

    interactionFormMessage.textContent = text;
    interactionFormMessage.className = "form-message";

    if (type) {
      interactionFormMessage.classList.add(`form-message--${type}`);
      interactionFormMessage.hidden = false;
    } else {
      interactionFormMessage.hidden = true;
    }
  }

  function setInteractionEditMessage(text = "", type = "") {
    if (!interactionEditMessage) return;

    interactionEditMessage.textContent = text;
    interactionEditMessage.className = "form-message";

    if (type) {
      interactionEditMessage.classList.add(`form-message--${type}`);
      interactionEditMessage.hidden = false;
    } else {
      interactionEditMessage.hidden = true;
    }
  }

  function getSelectedTask() {
    return tasks.find((task) => task.id === selectedTaskId) || null;
  }

  function getTaskInteractions(taskId) {
    return interactionsByTask.get(taskId) || [];
  }

  function getEditingInteraction() {
    if (!editingInteractionId) return null;

    for (const list of interactionsByTask.values()) {
      const interaction = list.find((item) => item.id === editingInteractionId);
      if (interaction) return interaction;
    }

    return null;
  }

  function getTaskStatus(task) {
    if (!task) {
      return {
        label: "Sem tarefa",
        className: "task-status-chip task-status-chip--muted"
      };
    }

    if (task.status === "encerrada") {
      return {
        label: "Encerrada",
        className: "task-status-chip task-status-chip--closed"
      };
    }

    const interactions = getTaskInteractions(task.id);
    const lastInteraction = interactions[interactions.length - 1];

    if (!lastInteraction || lastInteraction.autor_tipo === "profissional") {
      return {
        label: "Aguardando paciente",
        className: "task-status-chip task-status-chip--waiting-patient"
      };
    }

    return {
      label: "Aguardando profissional",
      className: "task-status-chip task-status-chip--waiting-professional"
    };
  }

  function closeInteractionEditCard() {
    editingInteractionId = null;

    if (interactionEditCard) {
      interactionEditCard.hidden = true;
    }

    if (interactionEditInput) {
      interactionEditInput.value = "";
    }

    setInteractionEditMessage();
  }

  function openInteractionEditCard(interactionId) {
    const interaction = getTaskInteractions(selectedTaskId).find((item) => item.id === interactionId);

    if (
      !interaction ||
      interaction.autor_tipo !== "paciente" ||
      interaction.autor_user_id !== currentUser?.id
    ) {
      return;
    }

    editingInteractionId = interactionId;

    if (interactionEditInput) {
      interactionEditInput.value = interaction.mensagem || "";
      interactionEditInput.focus();
      interactionEditInput.select();
    }

    if (interactionEditCard) {
      interactionEditCard.hidden = false;
    }

    setInteractionEditMessage();
  }

  async function carregarPaciente() {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href = "../../auth/index.html?perfil=paciente";
      return false;
    }

    currentUser = session.user;

    const { data: perfil, error } = await supabase
      .from("perfis")
      .select("nome, email, perfil")
      .eq("user_id", currentUser.id)
      .single();

    if (error || !perfil) {
      await supabase.auth.signOut();
      window.location.href = "../../auth/index.html?perfil=paciente";
      return false;
    }

    if (perfil.perfil !== "paciente") {
      await supabase.auth.signOut();
      window.location.href = "../../auth/index.html?perfil=paciente";
      return false;
    }

    const nomeBase = limparNome(perfil.nome || perfil.email || "");
    const nomeExibicao = nomeBase || "Paciente";
    const primeiroNome = obterPrimeiroNome(perfil.nome || perfil.email || "");
    currentPatientProfile = perfil;

    userName.textContent = nomeExibicao;
    userRole.textContent = "Paciente vinculado";
    userAvatar.textContent = obterIniciais(nomeExibicao);

    welcomeTitle.textContent = `Olá, ${primeiroNome}`;
    welcomeText.textContent =
      "Aqui você acompanha seu profissional e pode visualizar/realizar suas tarefas de forma simples e objetiva.";

    return true;
  }

  async function carregarProfissionalVinculado() {
    if (!currentUser) return;

    const { data: vinculo, error: vinculoError } = await supabase
      .from("vinculos")
      .select("professional_user_id, status, created_at")
      .eq("patient_user_id", currentUser.id)
      .eq("status", "ativo")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (vinculoError || !vinculo) {
      professionalCard.hidden = true;
      professionalEmpty.hidden = false;
      return;
    }

    const { data: profissional, error: profissionalError } = await supabase
      .from("perfis")
      .select("nome, email")
      .eq("user_id", vinculo.professional_user_id)
      .single();

    if (profissionalError || !profissional) {
      professionalCard.hidden = true;
      professionalEmpty.hidden = false;
      return;
    }

    const nomeBase = limparNome(profissional.nome || profissional.email || "");
    const nomeExibicao = nomeBase || "Profissional";
    currentProfessional = profissional;
    currentVinculo = vinculo;

    professionalAvatar.textContent = obterIniciais(nomeExibicao);
    professionalName.textContent = nomeExibicao;
    professionalRole.textContent = "Psicólogo(a)";
    professionalEmail.textContent = profissional.email || "";
    vinculoInfo.textContent = `Vínculo ativo desde ${formatarData(vinculo.created_at)}`;

    professionalEmpty.hidden = true;
    professionalCard.hidden = false;
  }

  async function carregarTarefas() {
    if (!currentUser) return;

    const { data: tarefasData, error } = await supabase
      .from("tarefas")
      .select("*")
      .eq("patient_user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Falha ao carregar tarefas: ${error.message}`);
    }

    tasks = tarefasData || [];
    interactionsByTask = new Map();

    if (selectedTaskId && !tasks.some((task) => task.id === selectedTaskId)) {
      selectedTaskId = null;
    }

    if (!selectedTaskId && tasks.length > 0) {
      selectedTaskId = tasks[0].id;
    }

    const taskIds = tasks.map((task) => task.id);
    if (!taskIds.length) {
      return;
    }

    const { data: interactions, error: interactionsError } = await supabase
      .from("tarefa_interacoes")
      .select("*")
      .in("tarefa_id", taskIds)
      .order("created_at", { ascending: true });

    if (interactionsError) {
      throw new Error(`Falha ao carregar interações: ${interactionsError.message}`);
    }

    (interactions || []).forEach((interaction) => {
      const current = interactionsByTask.get(interaction.tarefa_id) || [];
      current.push(interaction);
      interactionsByTask.set(interaction.tarefa_id, current);
    });
  }

  function renderTasks() {
    if (!tasksList || !tasksEmptyState) return;

    if (!tasks.length) {
      tasksList.innerHTML = "";
      tasksEmptyState.hidden = false;
      return;
    }

    tasksEmptyState.hidden = true;

    tasksList.innerHTML = tasks
      .map((task) => {
        const status = getTaskStatus(task);
        const isActive = task.id === selectedTaskId ? "is-active" : "";

        return `
          <article class="task-card ${isActive}" data-task-id="${task.id}">
            <div class="task-card__top">
              <h4 class="task-card__title">${escapeHtml(task.titulo)}</h4>
              <span class="${status.className}">${status.label}</span>
            </div>
            <p class="task-card__description">${escapeHtml(task.descricao)}</p>
            <div class="task-card__meta">
              <span>Criada em ${escapeHtml(formatarDataHora(task.created_at))}</span>
              <span>${getTaskInteractions(task.id).length} interação(ões)</span>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderTaskDetail() {
    const task = getSelectedTask();

    if (!task) {
      if (taskDetailCard) taskDetailCard.hidden = true;
      if (taskDetailEmptyState) taskDetailEmptyState.hidden = false;
      if (interactionsList) interactionsList.innerHTML = "";
      closeInteractionEditCard();
      if (interactionFormCard) interactionFormCard.hidden = true;
      setInteractionFormMessage();
      return;
    }

    const status = getTaskStatus(task);
    const interactions = getTaskInteractions(task.id);

    if (taskDetailCard) taskDetailCard.hidden = false;
    if (taskDetailEmptyState) taskDetailEmptyState.hidden = true;
    if (taskDetailTitle) taskDetailTitle.textContent = task.titulo;
    if (taskDetailDescription) taskDetailDescription.textContent = task.descricao;
    if (taskStatusChip) {
      taskStatusChip.className = status.className;
      taskStatusChip.textContent = status.label;
    }
    if (taskCreatedAt) taskCreatedAt.textContent = `Criada em ${formatarDataHora(task.created_at)}`;
    if (taskProfessionalName) {
      const professionalName = limparNome(currentProfessional?.nome || currentProfessional?.email || "") || "Profissional";
      taskProfessionalName.textContent = `Profissional: ${professionalName}`;
    }

    if (interactionsList) {
      interactionsList.innerHTML = interactions
        .map((interaction) => {
          const isProfissional = interaction.autor_tipo === "profissional";
          const cssClass = isProfissional
            ? "interaction-item interaction-item--profissional"
            : "interaction-item interaction-item--paciente";

          return `
            <article class="${cssClass}">
              <div class="interaction-item__top">
                <strong class="interaction-item__author">${isProfissional ? "Profissional" : "Você"}</strong>
                <span class="interaction-item__time">${escapeHtml(formatarDataHora(interaction.created_at))}</span>
              </div>
              <p class="interaction-item__text">${escapeHtml(interaction.mensagem || "")}</p>
              ${
                !isProfissional && interaction.autor_user_id === currentUser?.id
                  ? `
                    <div class="interaction-item__actions">
                      <button
                        class="btn-secondary btn-secondary--small"
                        type="button"
                        data-edit-interaction-id="${interaction.id}"
                      >
                        Alterar interação
                      </button>
                    </div>
                  `
                  : ""
              }
            </article>
          `;
        })
        .join("");
    }

    if (interactionFormCard) {
      interactionFormCard.hidden = task.status === "encerrada";
    }
  }

  function renderAll() {
    renderTasks();
    renderTaskDetail();
  }

  async function criarInteracao() {
    const task = getSelectedTask();
    const mensagem = interactionTextInput?.value.trim() || "";

    if (!task) {
      setInteractionFormMessage("Selecione uma tarefa antes de enviar sua interação.", "error");
      return;
    }

    if (!mensagem) {
      setInteractionFormMessage("Digite sua mensagem antes de enviar.", "error");
      return;
    }

    if (btnCreateInteraction) btnCreateInteraction.disabled = true;
    setInteractionFormMessage();

    try {
      const { error } = await supabase
        .from("tarefa_interacoes")
        .insert({
          tarefa_id: task.id,
          autor_tipo: "paciente",
          autor_user_id: currentUser.id,
          mensagem
        });

      if (error) {
        throw new Error(`Não foi possível enviar sua interação: ${error.message}`);
      }

      if (interactionTextInput) interactionTextInput.value = "";

      await carregarTarefas();
      closeInteractionEditCard();
      renderAll();
      setInteractionFormMessage("Interação enviada com sucesso.", "success");
    } catch (error) {
      setInteractionFormMessage(error.message || "Erro ao enviar interação.", "error");
    } finally {
      if (btnCreateInteraction) btnCreateInteraction.disabled = false;
    }
  }

  async function salvarInteracaoEditada() {
    const interaction = getEditingInteraction();
    const mensagem = interactionEditInput?.value ?? "";

    if (!interaction) {
      setInteractionEditMessage("Selecione uma interação válida para alterar.", "error");
      return;
    }

    if (btnSaveEditInteraction) btnSaveEditInteraction.disabled = true;
    setInteractionEditMessage();

    try {
      const { error } = await supabase
        .from("tarefa_interacoes")
        .update({
          mensagem
        })
        .eq("id", interaction.id)
        .eq("autor_tipo", "paciente")
        .eq("autor_user_id", currentUser.id);

      if (error) {
        throw new Error(`Não foi possível alterar sua interação: ${error.message}`);
      }

      await carregarTarefas();
      closeInteractionEditCard();
      renderAll();
      setInteractionFormMessage("Interação alterada com sucesso.", "success");
    } catch (error) {
      setInteractionEditMessage(error.message || "Erro ao alterar interação.", "error");
    } finally {
      if (btnSaveEditInteraction) btnSaveEditInteraction.disabled = false;
    }
  }

  btnLogout.addEventListener("click", async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Erro ao sair:", error);
    }

    window.location.href = "/";
  });

  if (tasksList) {
    tasksList.addEventListener("click", (event) => {
      const card = event.target.closest("[data-task-id]");
      if (!card) return;

      selectedTaskId = Number(card.getAttribute("data-task-id"));
      closeInteractionEditCard();
      setInteractionFormMessage();
      renderAll();
    });
  }

  if (btnClearInteraction) {
    btnClearInteraction.addEventListener("click", () => {
      if (interactionTextInput) interactionTextInput.value = "";
      setInteractionFormMessage();
    });
  }

  if (btnCreateInteraction) {
    btnCreateInteraction.addEventListener("click", criarInteracao);
  }

  if (interactionsList) {
    interactionsList.addEventListener("click", (event) => {
      const button = event.target.closest("[data-edit-interaction-id]");
      if (!button) return;

      openInteractionEditCard(Number(button.getAttribute("data-edit-interaction-id")));
    });
  }

  if (btnCancelEditInteraction) {
    btnCancelEditInteraction.addEventListener("click", closeInteractionEditCard);
  }

  if (btnSaveEditInteraction) {
    btnSaveEditInteraction.addEventListener("click", salvarInteracaoEditada);
  }

  async function iniciarDashboard() {
    const ok = await carregarPaciente();
    if (!ok) return;

    await carregarProfissionalVinculado();
    await carregarTarefas();
    renderAll();
  }

  iniciarDashboard();
});
