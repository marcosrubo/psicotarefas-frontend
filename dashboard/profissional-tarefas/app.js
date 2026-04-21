import supabase from "../../shared/supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  const professionalLine = document.getElementById("professionalLine");
  const screenMessage = document.getElementById("screenMessage");

  const patientsGrid = document.getElementById("patientsGrid");
  const patientsEmptyState = document.getElementById("patientsEmptyState");
  const patientsPanel = document.getElementById("patientsPanel");

  const tasksTitle = document.getElementById("tasksTitle");
  const tasksSubtitle = document.getElementById("tasksSubtitle");
  const tasksList = document.getElementById("tasksList");
  const tasksEmptyState = document.getElementById("tasksEmptyState");
  const tasksPanel = document.getElementById("tasksPanel");

  const btnNewTask = document.getElementById("btnNewTask");
  const btnEditAlias = document.getElementById("btnEditAlias");

  const aliasBox = document.getElementById("aliasBox");
  const patientAliasInput = document.getElementById("patientAliasInput");
  const btnSaveAlias = document.getElementById("btnSaveAlias");

  const taskFormCard = document.getElementById("taskFormCard");
  const taskFormTitle = document.getElementById("taskFormTitle");
  const taskTitleInput = document.getElementById("taskTitleInput");
  const taskDescriptionInput = document.getElementById("taskDescriptionInput");
  const btnCancelTask = document.getElementById("btnCancelTask");
  const btnCreateTask = document.getElementById("btnCreateTask");
  const taskFormMessage = document.getElementById("taskFormMessage");

  const selectedTaskBox = document.getElementById("selectedTaskBox");
  const selectedTaskName = document.getElementById("selectedTaskName");
  const selectedTaskDescription = document.getElementById("selectedTaskDescription");
  const selectedTaskCreatedAt = document.getElementById("selectedTaskCreatedAt");
  const selectedTaskPatient = document.getElementById("selectedTaskPatient");
  const btnEditTask = document.getElementById("btnEditTask");
  const interactionsDivider = document.getElementById("interactionsDivider");
  const interactionPanel = document.getElementById("interactionPanel");

  const interactionsEmptyState = document.getElementById("interactionsEmptyState");
  const interactionsList = document.getElementById("interactionsList");
  const mobileStepPatients = document.getElementById("mobileStepPatients");
  const mobileStepTasks = document.getElementById("mobileStepTasks");
  const mobileStepInteractions = document.getElementById("mobileStepInteractions");

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

  let currentUser = null;
  let currentProfile = null;
  let patients = [];
  let tasks = [];
  let interactionsByTask = new Map();
  let selectedPatientId = null;
  let selectedTaskId = null;
  let taskFormMode = "create";
  let editingInteractionId = null;
  let mobileView = "patients";

  function syncAliasButton() {
    if (!btnEditAlias) return;
    btnEditAlias.textContent = aliasBox?.hidden === false ? "Ocultar apelido" : "Alterar apelido";
  }

  function closeAliasBox() {
    if (aliasBox) {
      aliasBox.hidden = true;
    }
    syncAliasButton();
  }

  function openAliasBox() {
    const patient = getSelectedPatient();
    if (!patient || !aliasBox) return;

    aliasBox.hidden = false;
    syncAliasButton();

    if (patientAliasInput) {
      patientAliasInput.value = patient.alias;
      patientAliasInput.focus();
      patientAliasInput.select();
    }
  }

  function showScreenError(text) {
    if (!screenMessage) return;
    screenMessage.hidden = false;
    screenMessage.textContent = text;
  }

  function hideScreenError() {
    if (!screenMessage) return;
    screenMessage.hidden = true;
    screenMessage.textContent = "";
  }

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

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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

  function isMobileLayout() {
    return window.innerWidth < 768;
  }

  function renderMobileFlowIndicator() {
    if (!mobileStepPatients || !mobileStepTasks || !mobileStepInteractions) return;

    mobileStepPatients.classList.toggle("mobile-flow-step--active", mobileView === "patients");
    mobileStepTasks.classList.toggle("mobile-flow-step--active", mobileView === "tasks");
    mobileStepInteractions.classList.toggle("mobile-flow-step--active", mobileView === "interactions");

    mobileStepTasks.disabled = !selectedPatientId;
    mobileStepInteractions.disabled = !selectedTaskId;
  }

  function setMobileView(nextView) {
    mobileView = nextView;

    if (isMobileLayout()) {
      document.body.setAttribute("data-mobile-view", nextView);
    } else {
      document.body.removeAttribute("data-mobile-view");
    }

    renderMobileFlowIndicator();
  }

  function syncMobileViewWithSelection() {
    if (!isMobileLayout()) {
      document.body.removeAttribute("data-mobile-view");
      renderMobileFlowIndicator();
      return;
    }

    if (selectedTaskId) {
      setMobileView("interactions");
      return;
    }

    if (selectedPatientId) {
      setMobileView("tasks");
      return;
    }

    setMobileView("patients");
  }

  function getSelectedPatient() {
    return patients.find((patient) => patient.patient_user_id === selectedPatientId) || null;
  }

  function getSelectedTask() {
    return tasks.find((task) => task.id === selectedTaskId) || null;
  }

  function getTasksOfSelectedPatient() {
    if (!selectedPatientId) return [];
    return tasks.filter((task) => task.patient_user_id === selectedPatientId);
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

  function esperar(ms) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, ms);
    });
  }

  async function obterUsuarioAutenticado() {
    for (let tentativa = 0; tentativa < 2; tentativa += 1) {
      const {
        data: { session },
        error: sessionError
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(`Falha ao obter sessão autenticada: ${sessionError.message}`);
      }

      if (session?.user) {
        return session.user;
      }

      if (tentativa === 0) {
        await esperar(180);
      }
    }

    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError) {
      throw new Error(`Falha ao obter usuário autenticado: ${userError.message}`);
    }

    return user || null;
  }

  async function validarProfissional() {
    const user = await obterUsuarioAutenticado();

    if (!user) {
      window.location.href = "../../auth/profissional-login/index.html";
      return false;
    }

    currentUser = user;

    const { data: perfil, error } = await supabase
      .from("perfis")
      .select("nome, email, perfil")
      .eq("user_id", currentUser.id)
      .single();

    if (error) {
      throw new Error(`Falha ao carregar perfil do profissional: ${error.message}`);
    }

    if (!perfil || perfil.perfil !== "profissional") {
      await supabase.auth.signOut();
      window.location.href = "../../auth/profissional-login/index.html";
      return false;
    }

    currentProfile = perfil;
    return true;
  }

  function renderProfessionalName() {
    if (!professionalLine) return;

    const nome =
      currentProfile?.nome ||
      currentProfile?.email ||
      "Profissional";

    professionalLine.textContent = `PROFISSIONAL: ${nome}`;
  }

  function resetTaskForm() {
    taskFormMode = "create";

    if (taskFormTitle) {
      taskFormTitle.textContent = "Nova tarefa";
    }

    if (btnCreateTask) {
      btnCreateTask.textContent = "Criar tarefa";
    }

    if (taskTitleInput) taskTitleInput.value = "";
    if (taskDescriptionInput) taskDescriptionInput.value = "";
    setTaskFormMessage();
  }

  function openTaskFormForCreate() {
    if (!taskFormCard) return;

    resetTaskForm();
    taskFormCard.hidden = false;

    if (taskTitleInput) {
      taskTitleInput.focus();
    }
  }

  function openTaskFormForEdit() {
    const task = getSelectedTask();
    if (!task || !taskFormCard) return;

    taskFormMode = "edit";

    if (taskFormTitle) {
      taskFormTitle.textContent = "Alterar tarefa";
    }

    if (btnCreateTask) {
      btnCreateTask.textContent = "Salvar alteração";
    }

    if (taskTitleInput) taskTitleInput.value = task.titulo || "";
    if (taskDescriptionInput) taskDescriptionInput.value = task.descricao || "";
    setTaskFormMessage();
    taskFormCard.hidden = false;

    if (taskTitleInput) {
      taskTitleInput.focus();
      taskTitleInput.select();
    }
  }

  function closeTaskForm() {
    if (taskFormCard) {
      taskFormCard.hidden = true;
    }

    resetTaskForm();
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
      interaction.autor_tipo !== "profissional" ||
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

  async function carregarPacientes() {
    const { data, error } = await supabase.rpc("listar_pacientes_vinculados_profissional");

    if (error) {
      throw new Error(`Falha ao carregar pacientes vinculados: ${error.message}`);
    }

    patients = (data || []).map((item) => {
      const nomeCompleto =
        item.patient_name?.trim() ||
        item.patient_email?.trim() ||
        "Paciente";

      return {
        vinculo_id: item.vinculo_id,
        patient_user_id: item.patient_user_id,
        alias: item.patient_alias || nomeCompleto,
        nome_real: nomeCompleto,
        email: item.patient_email || "",
        created_at: item.created_at
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
      throw new Error(`Falha ao carregar tarefas: ${error.message}`);
    }

    tasks = tarefasData || [];
    interactionsByTask = new Map();

    const taskIds = tasks.map((task) => task.id);
    if (!taskIds.length) return;

    const { data: interactions, error: interactionsError } = await supabase
      .from("tarefa_interacoes")
      .select("*")
      .in("tarefa_id", taskIds)
      .order("created_at", { ascending: true });

    if (interactionsError) {
      throw new Error(`Falha ao carregar interações das tarefas: ${interactionsError.message}`);
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
        const isActive = patient.patient_user_id === selectedPatientId ? "is-active" : "";
        const patientTasks = tasks.filter((task) => task.patient_user_id === patient.patient_user_id);
        const activeTasksCount = patientTasks.filter((task) => task.status !== "encerrada").length;

        return `
          <article class="patient-card ${isActive}" data-patient-id="${patient.patient_user_id}">
            <h4 class="patient-card__alias">${escapeHtml(patient.alias)}</h4>
            <p class="patient-card__name">${escapeHtml(patient.nome_real)}</p>
            <p class="patient-card__email">${escapeHtml(patient.email || "E-mail não informado")}</p>
            <div class="patient-card__meta">
              <span class="patient-meta-chip">Vínculo ativo</span>
              <span class="patient-meta-chip">${activeTasksCount} tarefa(s)</span>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderTasksArea() {
    const patient = getSelectedPatient();
    const patientTasks = getTasksOfSelectedPatient();

    if (
      !tasksTitle ||
      !tasksSubtitle ||
      !tasksList ||
      !tasksEmptyState ||
      !btnNewTask ||
      !aliasBox ||
      !taskFormCard
    ) {
      return;
    }

    if (!patient) {
      tasksTitle.textContent = "Tarefas do paciente";
      tasksSubtitle.textContent = "Selecione um paciente para começar.";
      tasksList.innerHTML = "";
      tasksEmptyState.hidden = false;
      tasksEmptyState.textContent = "Selecione um paciente para visualizar as tarefas.";
      btnNewTask.disabled = true;
      if (btnEditAlias) btnEditAlias.disabled = true;
      closeAliasBox();
      closeTaskForm();
      return;
    }

    tasksTitle.textContent = `Tarefas de ${patient.alias}`;
    tasksSubtitle.textContent = patient.nome_real;
    btnNewTask.disabled = false;
    if (btnEditAlias) btnEditAlias.disabled = false;
    syncAliasButton();

    if (!patientTasks.length) {
      tasksList.innerHTML = "";
      tasksEmptyState.hidden = false;
      tasksEmptyState.textContent = "Nenhuma tarefa criada para este paciente.";
      return;
    }

    tasksEmptyState.hidden = true;

    tasksList.innerHTML = patientTasks
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
              <span>Criada em ${escapeHtml(formatDateTime(task.created_at))}</span>
              <span>${getTaskInteractions(task.id).length} interação(ões)</span>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderInteractionArea() {
    const task = getSelectedTask();
    const patient = getSelectedPatient();

    if (
      !selectedTaskBox ||
      !interactionsEmptyState ||
      !interactionsList ||
      !interactionFormCard
    ) {
      return;
    }

    if (!task) {
      selectedTaskBox.hidden = true;
      if (interactionsDivider) interactionsDivider.hidden = true;
      interactionsList.innerHTML = "";
      interactionsEmptyState.hidden = false;
      interactionsEmptyState.textContent = "Selecione uma tarefa para visualizar as interações.";
      interactionFormCard.hidden = true;
      setInteractionFormMessage();
      return;
    }

    const status = getTaskStatus(task);
    const interactions = getTaskInteractions(task.id);

    selectedTaskBox.hidden = false;
    if (selectedTaskName) selectedTaskName.textContent = `TAREFA: ${task.titulo}`;
    if (selectedTaskDescription) selectedTaskDescription.textContent = task.descricao;
    if (selectedTaskCreatedAt) selectedTaskCreatedAt.textContent = `Criada em ${formatDateTime(task.created_at)}`;
    if (selectedTaskPatient) selectedTaskPatient.textContent = `Paciente: ${patient ? patient.nome_real : "-"}`;
    if (btnEditTask) btnEditTask.hidden = false;
    if (interactionsDivider) interactionsDivider.hidden = false;

    if (!interactions.length) {
      interactionsList.innerHTML = "";
      interactionsEmptyState.hidden = false;
      interactionsEmptyState.textContent = "Nenhuma interação registrada para esta tarefa.";
    } else {
      interactionsEmptyState.hidden = true;

      interactionsList.innerHTML = interactions
        .map((interaction) => {
          const isProfissional = interaction.autor_tipo === "profissional";
          const cssClass = isProfissional
            ? "interaction-item interaction-item--profissional"
            : "interaction-item interaction-item--paciente";

          return `
            <article class="${cssClass}">
              <div class="interaction-item__top">
                <div class="interaction-item__header">
                  <strong class="interaction-item__author">${isProfissional ? "Profissional" : "Paciente"}</strong>
                </div>
                <span class="interaction-item__time">${formatDateTime(interaction.created_at)}</span>
              </div>
              <p class="interaction-item__text">${escapeHtml(interaction.mensagem)}</p>
              ${
                isProfissional && interaction.autor_user_id === currentUser?.id
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

    interactionFormCard.hidden = false;
  }

  async function salvarApelidoPaciente() {
    const patient = getSelectedPatient();
    const alias = patientAliasInput?.value.trim() || "";

    if (!patient || !btnSaveAlias) return;

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
        throw new Error(`Não foi possível salvar o apelido: ${error.message}`);
      }

      patient.alias = alias || patient.nome_real;
      closeAliasBox();
      renderPatients();
      renderTasksArea();
      renderInteractionArea();
    } catch (error) {
      window.alert(error.message || "Erro ao salvar o apelido.");
    } finally {
      btnSaveAlias.disabled = false;
    }
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

      if (taskTitleInput) taskTitleInput.value = "";
      if (taskDescriptionInput) taskDescriptionInput.value = "";
      if (taskFormCard) taskFormCard.hidden = true;

      await carregarTarefas();
      selectedTaskId = novaTarefa.id;
      renderAll();
      setTaskFormMessage("Tarefa criada com sucesso.", "success");
    } catch (error) {
      setTaskFormMessage(error.message || "Erro ao criar tarefa.", "error");
    } finally {
      if (btnCreateTask) btnCreateTask.disabled = false;
    }
  }

  async function salvarTarefaEditada() {
    const task = getSelectedTask();
    const titulo = taskTitleInput?.value.trim() || "";
    const descricao = taskDescriptionInput?.value.trim() || "";

    if (!task) {
      setTaskFormMessage("Selecione uma tarefa antes de alterar.", "error");
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
      const { error } = await supabase
        .from("tarefas")
        .update({
          titulo,
          descricao
        })
        .eq("id", task.id)
        .eq("professional_user_id", currentUser.id);

      if (error) {
        throw new Error(`Não foi possível alterar a tarefa: ${error.message}`);
      }

      await carregarTarefas();
      renderAll();
      closeTaskForm();
      setTaskFormMessage("Tarefa alterada com sucesso.", "success");
    } catch (error) {
      setTaskFormMessage(error.message || "Erro ao alterar tarefa.", "error");
    } finally {
      if (btnCreateTask) btnCreateTask.disabled = false;
    }
  }

  async function criarInteracao() {
    const task = getSelectedTask();
    const mensagem = interactionTextInput?.value.trim() || "";

    if (!task) {
      setInteractionFormMessage("Selecione uma tarefa antes de registrar a interação.", "error");
      return;
    }

    if (!mensagem) {
      setInteractionFormMessage("Digite a mensagem da interação.", "error");
      return;
    }

    if (btnCreateInteraction) btnCreateInteraction.disabled = true;
    setInteractionFormMessage();

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
        throw new Error(`Não foi possível registrar a interação: ${error.message}`);
      }

      if (interactionTextInput) interactionTextInput.value = "";

      await carregarTarefas();
      renderTasksArea();
      renderInteractionArea();
      setInteractionFormMessage("Interação registrada com sucesso.", "success");
    } catch (error) {
      setInteractionFormMessage(error.message || "Erro ao registrar a interação.", "error");
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
        .eq("autor_tipo", "profissional")
        .eq("autor_user_id", currentUser.id);

      if (error) {
        throw new Error(`Não foi possível alterar a interação: ${error.message}`);
      }

      await carregarTarefas();
      renderTasksArea();
      renderInteractionArea();
      closeInteractionEditCard();
      setInteractionFormMessage("Interação alterada com sucesso.", "success");
    } catch (error) {
      setInteractionEditMessage(error.message || "Erro ao alterar interação.", "error");
    } finally {
      if (btnSaveEditInteraction) btnSaveEditInteraction.disabled = false;
    }
  }

  function renderAll() {
    renderProfessionalName();
    renderPatients();
    renderTasksArea();
    renderInteractionArea();
    syncMobileViewWithSelection();
  }

  if (patientsGrid) {
    patientsGrid.addEventListener("click", (event) => {
      const card = event.target.closest("[data-patient-id]");
      if (!card) return;

      selectedPatientId = card.getAttribute("data-patient-id");
      selectedTaskId = null;

      closeAliasBox();
      closeTaskForm();
      closeInteractionEditCard();
      setTaskFormMessage();
      setInteractionFormMessage();
      renderAll();
    });
  }

  if (tasksList) {
    tasksList.addEventListener("click", (event) => {
      const card = event.target.closest("[data-task-id]");
      if (!card) return;

      selectedTaskId = Number(card.getAttribute("data-task-id"));
      closeTaskForm();
      closeInteractionEditCard();
      setInteractionFormMessage();
      renderTasksArea();
      renderInteractionArea();
      syncMobileViewWithSelection();
    });
  }

  if (btnNewTask) {
    btnNewTask.addEventListener("click", () => {
      if (!selectedPatientId || !taskFormCard) return;

      if (taskFormCard.hidden || taskFormMode !== "create") {
        openTaskFormForCreate();
      } else {
        closeTaskForm();
      }
    });
  }

  if (btnEditAlias) {
    btnEditAlias.addEventListener("click", () => {
      if (!selectedPatientId || !aliasBox) return;

      if (aliasBox.hidden) {
        openAliasBox();
      } else {
        closeAliasBox();
      }
    });
  }

  if (btnCancelTask) {
    btnCancelTask.addEventListener("click", () => {
      closeTaskForm();
    });
  }

  if (btnCreateTask) {
    btnCreateTask.addEventListener("click", async () => {
      if (taskFormMode === "edit") {
        await salvarTarefaEditada();
        return;
      }

      await criarTarefa();
    });
  }

  if (btnEditTask) {
    btnEditTask.addEventListener("click", openTaskFormForEdit);
  }

  if (btnSaveAlias) {
    btnSaveAlias.addEventListener("click", salvarApelidoPaciente);
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

  if (mobileStepPatients) {
    mobileStepPatients.addEventListener("click", () => {
      if (!isMobileLayout()) return;

      selectedTaskId = null;
      closeTaskForm();
      closeInteractionEditCard();
      setInteractionFormMessage();
      renderTasksArea();
      renderInteractionArea();
      setMobileView("patients");
    });
  }

  if (mobileStepTasks) {
    mobileStepTasks.addEventListener("click", () => {
      if (!isMobileLayout() || !selectedPatientId) return;

      selectedTaskId = null;
      closeInteractionEditCard();
      setInteractionFormMessage();
      renderTasksArea();
      renderInteractionArea();
      setMobileView("tasks");
    });
  }

  if (mobileStepInteractions) {
    mobileStepInteractions.addEventListener("click", () => {
      if (!isMobileLayout() || !selectedTaskId) return;
      setMobileView("interactions");
    });
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

  async function iniciar() {
    hideScreenError();
    syncMobileViewWithSelection();

    const ok = await validarProfissional();
    if (!ok) return;

    await carregarPacientes();
    await carregarTarefas();
    renderAll();
  }

  window.addEventListener("resize", () => {
    syncMobileViewWithSelection();
  });

  iniciar().catch((error) => {
    console.error("Erro na tela profissional-tarefas:", error);

    if (professionalLine) {
      professionalLine.textContent = "PROFISSIONAL: erro ao carregar";
    }

    showScreenError(error.message || "Erro ao carregar a gestão de tarefas.");
  });
});
