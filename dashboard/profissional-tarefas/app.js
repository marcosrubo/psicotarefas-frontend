import supabase from "../../shared/supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  const patientsGrid = document.getElementById("patientsGrid");
  const patientsEmptyState = document.getElementById("patientsEmptyState");

  const tasksList = document.getElementById("tasksList");
  const tasksEmptyState = document.getElementById("tasksEmptyState");
  const tasksColumnTitle = document.getElementById("tasksColumnTitle");
  const tasksColumnSubtitle = document.getElementById("tasksColumnSubtitle");

  const btnNewTask = document.getElementById("btnNewTask");
  const taskCreateCard = document.getElementById("taskCreateCard");
  const taskTitleInput = document.getElementById("taskTitleInput");
  const taskDescriptionInput = document.getElementById("taskDescriptionInput");
  const btnCreateTask = document.getElementById("btnCreateTask");
  const btnCancelTask = document.getElementById("btnCancelTask");
  const taskFormMessage = document.getElementById("taskFormMessage");

  const aliasCard = document.getElementById("aliasCard");
  const patientAliasInput = document.getElementById("patientAliasInput");
  const btnSaveAlias = document.getElementById("btnSaveAlias");

  const conversationTitle = document.getElementById("conversationTitle");
  const conversationSubtitle = document.getElementById("conversationSubtitle");
  const taskStatusChip = document.getElementById("taskStatusChip");

  const taskSummaryCard = document.getElementById("taskSummaryCard");
  const taskSummaryTitle = document.getElementById("taskSummaryTitle");
  const taskSummaryDescription = document.getElementById("taskSummaryDescription");
  const taskSummaryCreatedAt = document.getElementById("taskSummaryCreatedAt");
  const taskSummaryOwner = document.getElementById("taskSummaryOwner");

  const btnCloseTask = document.getElementById("btnCloseTask");
  const btnReopenTask = document.getElementById("btnReopenTask");

  const conversationList = document.getElementById("conversationList");
  const conversationEmptyState = document.getElementById("conversationEmptyState");

  const replyBox = document.getElementById("replyBox");
  const replyText = document.getElementById("replyText");
  const replyMessage = document.getElementById("replyMessage");
  const btnClearReply = document.getElementById("btnClearReply");

  let currentUser = null;
  let currentProfile = null;

  let patients = [];
  let tasks = [];
  let interactionsByTask = new Map();

  let selectedPatientId = null;
  let selectedTaskId = null;

  function setTaskFormMessage(text = "", type = "") {
    if (!taskFormMessage) return;

    taskFormMessage.textContent = text;
    taskFormMessage.className = "form-message";

    if (type) {
      taskFormMessage.classList.add(`form-message--${type}`);
      taskFormMessage.hidden = false;
    } else {
      taskFormMessage.hidden = true;
    }
  }

  function setReplyMessage(text = "", type = "") {
    if (!replyMessage) return;

    replyMessage.textContent = text;
    replyMessage.className = "form-message";

    if (type) {
      replyMessage.classList.add(`form-message--${type}`);
      replyMessage.hidden = false;
    } else {
      replyMessage.hidden = true;
    }
  }

  function formatDateTime(value) {
    if (!value) return "-";

    return new Date(value).toLocaleString("pt-BR", {
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

  function getSelectedPatient() {
    return patients.find((patient) => patient.patient_user_id === selectedPatientId) || null;
  }

  function getTasksOfSelectedPatient() {
    if (!selectedPatientId) return [];
    return tasks.filter((task) => task.patient_user_id === selectedPatientId);
  }

  function getSelectedTask() {
    return tasks.find((task) => task.id === selectedTaskId) || null;
  }

  function getTaskInteractions(taskId) {
    return interactionsByTask.get(taskId) || [];
  }

  function deriveTaskStatus(task) {
    if (!task) {
      return {
        key: "muted",
        label: "Sem tarefa",
        className: "status-chip status-chip--muted"
      };
    }

    if (task.status === "encerrada") {
      return {
        key: "closed",
        label: "Encerrada",
        className: "status-chip status-chip--closed"
      };
    }

    const interactions = getTaskInteractions(task.id);
    const lastInteraction = interactions[interactions.length - 1];

    if (!lastInteraction) {
      return {
        key: "waiting-patient",
        label: "Aguardando paciente",
        className: "status-chip status-chip--waiting-patient"
      };
    }

    if (lastInteraction.autor_tipo === "profissional") {
      return {
        key: "waiting-patient",
        label: "Aguardando paciente",
        className: "status-chip status-chip--waiting-patient"
      };
    }

    return {
      key: "waiting-professional",
      label: "Aguardando profissional",
      className: "status-chip status-chip--waiting-professional"
    };
  }

  async function validarProfissional() {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href = "../../auth/profissional-login/index.html";
      return false;
    }

    currentUser = session.user;

    const { data: perfil, error } = await supabase
      .from("perfis")
      .select("nome, email, perfil")
      .eq("user_id", currentUser.id)
      .single();

    if (error || !perfil || perfil.perfil !== "profissional") {
      await supabase.auth.signOut();
      window.location.href = "../../auth/profissional-login/index.html";
      return false;
    }

    currentProfile = perfil;
    return true;
  }

  async function carregarPacientes() {
    const { data: vinculos, error } = await supabase
      .from("vinculos")
      .select("id, patient_user_id, patient_name, patient_alias, patient_email, created_at")
      .eq("professional_user_id", currentUser.id)
      .eq("status", "ativo")
      .not("patient_user_id", "is", null)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Não foi possível carregar os pacientes vinculados. ${error.message || ""}`.trim());
    }

    patients = (vinculos || []).map((vinculo) => {
      const nomeReal =
        vinculo.patient_name ||
        vinculo.patient_email ||
        "Paciente";

      return {
        vinculo_id: vinculo.id,
        patient_user_id: vinculo.patient_user_id,
        alias: vinculo.patient_alias || nomeReal,
        nome_real: nomeReal,
        email: vinculo.patient_email || ""
      };
    });
  }

  async function carregarTarefas() {
    const { data: tarefasData, error } = await supabase
      .from("tarefas")
      .select("*")
      .eq("professional_user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Não foi possível carregar as tarefas. ${error.message || ""}`.trim());
    }

    tasks = tarefasData || [];
    interactionsByTask = new Map();

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
      throw new Error(`Não foi possível carregar as interações das tarefas. ${interactionsError.message || ""}`.trim());
    }

    (interactions || []).forEach((interaction) => {
      const current = interactionsByTask.get(interaction.tarefa_id) || [];
      current.push(interaction);
      interactionsByTask.set(interaction.tarefa_id, current);
    });
  }

  function renderPatients() {
    if (!patientsGrid || !patientsEmptyState) return;

    if (!patients.length) {
      patientsGrid.innerHTML = "";
      patientsEmptyState.hidden = false;
      return;
    }

    patientsEmptyState.hidden = true;

    patientsGrid.innerHTML = patients
      .map((patient) => {
        const patientTasks = tasks.filter((task) => task.patient_user_id === patient.patient_user_id);
        const activeTasksCount = patientTasks.filter((task) => task.status !== "encerrada").length;
        const pendingMessages = patientTasks.filter((task) => {
          const derived = deriveTaskStatus(task);
          return derived.key === "waiting-professional";
        }).length;

        const isActive = patient.patient_user_id === selectedPatientId ? "is-active" : "";

        return `
          <article class="patient-card ${isActive}" data-patient-id="${patient.patient_user_id}">
            <h4 class="patient-card__alias">${escapeHtml(patient.alias)}</h4>
            <p class="patient-card__name">${escapeHtml(patient.nome_real)}</p>
            <div class="patient-card__meta">
              <span class="patient-meta-chip">${activeTasksCount} tarefa(s) ativa(s)</span>
              <span class="patient-meta-chip">${pendingMessages} aguardando você</span>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderTasks() {
    const patient = getSelectedPatient();
    const patientTasks = getTasksOfSelectedPatient();

    if (!tasksColumnTitle || !tasksColumnSubtitle || !tasksList || !tasksEmptyState || !btnNewTask || !aliasCard || !taskCreateCard) {
      return;
    }

    if (!patient) {
      tasksColumnTitle.textContent = "Tarefas do paciente";
      tasksColumnSubtitle.textContent = "Selecione um paciente para começar.";
      tasksList.innerHTML = "";
      tasksEmptyState.hidden = false;
      tasksEmptyState.textContent = "Selecione um paciente para visualizar as tarefas.";
      btnNewTask.disabled = true;
      aliasCard.hidden = true;
      taskCreateCard.hidden = true;
      return;
    }

    tasksColumnTitle.textContent = `Tarefas de ${patient.alias}`;
    tasksColumnSubtitle.textContent = patient.nome_real;
    btnNewTask.disabled = false;
    aliasCard.hidden = false;

    if (patientAliasInput) {
      patientAliasInput.value = patient.alias;
    }

    if (!patientTasks.length) {
      tasksList.innerHTML = "";
      tasksEmptyState.hidden = false;
      tasksEmptyState.textContent = "Nenhuma tarefa criada para este paciente.";
      return;
    }

    tasksEmptyState.hidden = true;

    tasksList.innerHTML = patientTasks
      .map((task) => {
        const derived = deriveTaskStatus(task);
        const isActive = task.id === selectedTaskId ? "is-active" : "";

        return `
          <article class="task-card ${isActive}" data-task-id="${task.id}">
            <div class="task-card__top">
              <h4 class="task-card__title">${escapeHtml(task.titulo)}</h4>
              <span class="${derived.className}">${derived.label}</span>
            </div>
            <p class="task-card__description">${escapeHtml(task.descricao)}</p>
            <div class="task-card__meta">
              <span>Criada em ${escapeHtml(formatDateTime(task.created_at))}</span>
              <span>${getTaskInteractions(task.id).length} interação(ões)</span>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderConversation() {
    const task = getSelectedTask();

    if (
      !conversationTitle ||
      !conversationSubtitle ||
      !taskStatusChip ||
      !taskSummaryCard ||
      !conversationList ||
      !conversationEmptyState ||
      !replyBox ||
      !btnCloseTask ||
      !btnReopenTask
    ) {
      return;
    }

    if (!task) {
      conversationTitle.textContent = "Detalhes da tarefa";
      conversationSubtitle.textContent = "Nenhuma tarefa selecionada.";
      taskStatusChip.className = "status-chip status-chip--muted";
      taskStatusChip.textContent = "Sem tarefa";
      taskSummaryCard.hidden = true;
      conversationList.innerHTML = "";
      conversationEmptyState.hidden = false;
      conversationEmptyState.textContent = "Selecione uma tarefa para visualizar as interações.";
      replyBox.hidden = true;
      btnCloseTask.hidden = true;
      btnReopenTask.hidden = true;
      setReplyMessage();
      return;
    }

    const derived = deriveTaskStatus(task);

    conversationTitle.textContent = task.titulo;
    conversationSubtitle.textContent = "Histórico de interações da tarefa";
    taskStatusChip.className = derived.className;
    taskStatusChip.textContent = derived.label;

    taskSummaryCard.hidden = false;

    if (taskSummaryTitle) taskSummaryTitle.textContent = task.titulo;
    if (taskSummaryDescription) taskSummaryDescription.textContent = task.descricao;
    if (taskSummaryCreatedAt) taskSummaryCreatedAt.textContent = `Criada em ${formatDateTime(task.created_at)}`;
    if (taskSummaryOwner) taskSummaryOwner.textContent = `Criada por ${currentProfile?.nome || currentProfile?.email || "Profissional"}`;

    if (task.status === "encerrada") {
      btnCloseTask.hidden = true;
      btnReopenTask.hidden = false;
      replyBox.hidden = true;
    } else {
      btnCloseTask.hidden = false;
      btnReopenTask.hidden = true;
      replyBox.hidden = false;
    }

    const interactions = getTaskInteractions(task.id);

    if (!interactions.length) {
      conversationList.innerHTML = "";
      conversationEmptyState.hidden = false;
      conversationEmptyState.textContent = "Nenhuma interação registrada para esta tarefa.";
    } else {
      conversationEmptyState.hidden = true;

      conversationList.innerHTML = interactions
        .map((interaction) => {
          const authorClass =
            interaction.autor_tipo === "profissional"
              ? "conversation-item conversation-item--profissional"
              : "conversation-item conversation-item--paciente";

          const authorLabel =
            interaction.autor_tipo === "profissional" ? "Profissional" : "Paciente";

          return `
            <article class="${authorClass}">
              <div class="conversation-item__top">
                <strong class="conversation-item__author">${authorLabel}</strong>
                <span class="conversation-item__time">${formatDateTime(interaction.created_at)}</span>
              </div>
              <p class="conversation-item__text">${escapeHtml(interaction.mensagem)}</p>
            </article>
          `;
        })
        .join("");
    }
  }

  function rerenderAll() {
    renderPatients();
    renderTasks();
    renderConversation();
  }

  async function criarTarefa() {
    const patient = getSelectedPatient();
    const titulo = taskTitleInput?.value.trim() || "";
    const descricao = taskDescriptionInput?.value.trim() || "";

    if (!patient) {
      setTaskFormMessage("Selecione um paciente antes de criar a tarefa.", "error");
      return;
    }

    if (!titulo) {
      setTaskFormMessage("Informe o título da tarefa.", "error");
      return;
    }

    if (!descricao) {
      setTaskFormMessage("Informe a descrição da tarefa.", "error");
      return;
    }

    if (btnCreateTask) btnCreateTask.disabled = true;
    setTaskFormMessage();

    try {
      const { data: novaTarefa, error } = await supabase
        .from("tarefas")
        .insert({
          professional_user_id: currentUser.id,
          patient_user_id: patient.patient_user_id,
          vinculo_id: patient.vinculo_id,
          titulo,
          descricao,
          status: "aberta"
        })
        .select()
        .single();

      if (error || !novaTarefa) {
        throw new Error("Não foi possível criar a tarefa.");
      }

      const { error: interactionError } = await supabase
        .from("tarefa_interacoes")
        .insert({
          tarefa_id: novaTarefa.id,
          autor_tipo: "profissional",
          autor_user_id: currentUser.id,
          mensagem: descricao
        });

      if (interactionError) {
        throw new Error("A tarefa foi criada, mas não foi possível registrar a interação inicial.");
      }

      if (taskTitleInput) taskTitleInput.value = "";
      if (taskDescriptionInput) taskDescriptionInput.value = "";
      if (taskCreateCard) taskCreateCard.hidden = true;
      setTaskFormMessage();

      await carregarTarefas();
      selectedTaskId = novaTarefa.id;
      rerenderAll();
    } catch (error) {
      setTaskFormMessage(error.message || "Erro ao criar tarefa.", "error");
    } finally {
      if (btnCreateTask) btnCreateTask.disabled = false;
    }
  }

  async function salvarApelidoPaciente() {
    const patient = getSelectedPatient();
    const alias = patientAliasInput?.value.trim() || "";

    if (!patient) return;
    if (!btnSaveAlias) return;

    btnSaveAlias.disabled = true;

    try {
      const { error } = await supabase
        .from("vinculos")
        .update({
          patient_alias: alias || patient.nome_real
        })
        .eq("id", patient.vinculo_id)
        .eq("professional_user_id", currentUser.id);

      if (error) {
        throw new Error("Não foi possível salvar o apelido.");
      }

      patient.alias = alias || patient.nome_real;
      renderPatients();
      renderTasks();
    } catch (error) {
      window.alert(error.message || "Erro ao salvar o apelido.");
    } finally {
      btnSaveAlias.disabled = false;
    }
  }

  async function registrarInteracao() {
    const task = getSelectedTask();
    const mensagem = replyText?.value.trim() || "";

    if (!task) {
      setReplyMessage("Selecione uma tarefa antes de registrar a interação.", "error");
      return;
    }

    if (!mensagem) {
      setReplyMessage("Digite uma mensagem antes de registrar a interação.", "error");
      return;
    }

    setReplyMessage();

    const submitButton = replyBox?.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
      const { error } = await supabase
        .from("tarefa_interacoes")
        .insert({
          tarefa_id: task.id,
          autor_tipo: "profissional",
          autor_user_id: currentUser.id,
          mensagem
        });

      if (error) {
        throw new Error("Não foi possível registrar a interação.");
      }

      if (replyText) replyText.value = "";
      await carregarTarefas();
      rerenderAll();
    } catch (error) {
      setReplyMessage(error.message || "Erro ao registrar a interação.", "error");
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  }

  async function encerrarTarefa() {
    const task = getSelectedTask();
    if (!task) return;

    const confirmar = window.confirm("Deseja encerrar esta tarefa?");
    if (!confirmar) return;

    if (btnCloseTask) btnCloseTask.disabled = true;

    try {
      const { error } = await supabase
        .from("tarefas")
        .update({
          status: "encerrada",
          closed_at: new Date().toISOString()
        })
        .eq("id", task.id)
        .eq("professional_user_id", currentUser.id);

      if (error) {
        throw new Error("Não foi possível encerrar a tarefa.");
      }

      await carregarTarefas();
      rerenderAll();
    } catch (error) {
      window.alert(error.message || "Erro ao encerrar a tarefa.");
    } finally {
      if (btnCloseTask) btnCloseTask.disabled = false;
    }
  }

  async function reabrirTarefa() {
    const task = getSelectedTask();
    if (!task) return;

    const confirmar = window.confirm("Deseja reabrir esta tarefa?");
    if (!confirmar) return;

    if (btnReopenTask) btnReopenTask.disabled = true;

    try {
      const { error } = await supabase
        .from("tarefas")
        .update({
          status: "aberta",
          closed_at: null
        })
        .eq("id", task.id)
        .eq("professional_user_id", currentUser.id);

      if (error) {
        throw new Error("Não foi possível reabrir a tarefa.");
      }

      await carregarTarefas();
      rerenderAll();
    } catch (error) {
      window.alert(error.message || "Erro ao reabrir a tarefa.");
    } finally {
      if (btnReopenTask) btnReopenTask.disabled = false;
    }
  }

  if (patientsGrid) {
    patientsGrid.addEventListener("click", (event) => {
      const card = event.target.closest("[data-patient-id]");
      if (!card) return;

      selectedPatientId = card.getAttribute("data-patient-id");
      selectedTaskId = null;

      if (taskCreateCard) taskCreateCard.hidden = true;
      setTaskFormMessage();
      rerenderAll();
    });
  }

  if (tasksList) {
    tasksList.addEventListener("click", (event) => {
      const card = event.target.closest("[data-task-id]");
      if (!card) return;

      selectedTaskId = Number(card.getAttribute("data-task-id"));
      renderTasks();
      renderConversation();
    });
  }

  if (btnNewTask) {
    btnNewTask.addEventListener("click", () => {
      if (!selectedPatientId || !taskCreateCard) return;

      taskCreateCard.hidden = !taskCreateCard.hidden;
      setTaskFormMessage();

      if (!taskCreateCard.hidden && taskTitleInput) {
        taskTitleInput.focus();
      }
    });
  }

  if (btnCancelTask) {
    btnCancelTask.addEventListener("click", () => {
      if (taskCreateCard) taskCreateCard.hidden = true;
      if (taskTitleInput) taskTitleInput.value = "";
      if (taskDescriptionInput) taskDescriptionInput.value = "";
      setTaskFormMessage();
    });
  }

  if (btnCreateTask) {
    btnCreateTask.addEventListener("click", criarTarefa);
  }

  if (btnSaveAlias) {
    btnSaveAlias.addEventListener("click", salvarApelidoPaciente);
  }

  if (replyBox) {
    replyBox.addEventListener("submit", async (event) => {
      event.preventDefault();
      await registrarInteracao();
    });
  }

  if (btnClearReply) {
    btnClearReply.addEventListener("click", () => {
      if (replyText) {
        replyText.value = "";
        replyText.focus();
      }
      setReplyMessage();
    });
  }

  if (btnCloseTask) {
    btnCloseTask.addEventListener("click", encerrarTarefa);
  }

  if (btnReopenTask) {
    btnReopenTask.addEventListener("click", reabrirTarefa);
  }

  async function iniciar() {
    const ok = await validarProfissional();
    if (!ok) return;

    await carregarPacientes();
    await carregarTarefas();
    rerenderAll();
  }

  iniciar().catch((error) => {
    console.error(error);
    window.alert(error.message || "Erro ao carregar a gestão de tarefas.");
  });
});
