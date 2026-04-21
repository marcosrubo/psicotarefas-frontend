import supabase from "../../shared/supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  const professionalLine = document.getElementById("professionalLine");
  const screenMessage = document.getElementById("screenMessage");

  const patientsGrid = document.getElementById("patientsGrid");
  const patientsEmptyState = document.getElementById("patientsEmptyState");

  const tasksTitle = document.getElementById("tasksTitle");
  const tasksSubtitle = document.getElementById("tasksSubtitle");
  const tasksList = document.getElementById("tasksList");
  const tasksEmptyState = document.getElementById("tasksEmptyState");

  const btnNewTask = document.getElementById("btnNewTask");

  const aliasBox = document.getElementById("aliasBox");
  const patientAliasInput = document.getElementById("patientAliasInput");
  const btnSaveAlias = document.getElementById("btnSaveAlias");

  const taskFormCard = document.getElementById("taskFormCard");
  const taskTitleInput = document.getElementById("taskTitleInput");
  const taskDescriptionInput = document.getElementById("taskDescriptionInput");
  const btnCancelTask = document.getElementById("btnCancelTask");
  const btnCreateTask = document.getElementById("btnCreateTask");
  const taskFormMessage = document.getElementById("taskFormMessage");

  let currentUser = null;
  let currentProfile = null;
  let patients = [];
  let tasks = [];
  let interactionsByTask = new Map();
  let selectedPatientId = null;

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

  function getSelectedPatient() {
    return patients.find((patient) => patient.patient_user_id === selectedPatientId) || null;
  }

  function getTasksOfSelectedPatient() {
    if (!selectedPatientId) return [];
    return tasks.filter((task) => task.patient_user_id === selectedPatientId);
  }

  function getTaskInteractions(taskId) {
    return interactionsByTask.get(taskId) || [];
  }

  function getTaskStatus(task) {
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

  async function validarProfissional() {
    const {
      data: { user },
      error: userError
    } = await supabase.auth.getUser();

    if (userError) {
      throw new Error(`Falha ao obter usuário autenticado: ${userError.message}`);
    }

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

  async function carregarPacientes() {
    const { data: vinculos, error } = await supabase
      .from("vinculos")
      .select("id, patient_user_id, patient_name, patient_alias, patient_email, created_at")
      .eq("professional_user_id", currentUser.id)
      .eq("status", "ativo")
      .not("patient_user_id", "is", null)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Falha ao carregar vínculos ativos: ${error.message}`);
    }

    const patientUserIds = [...new Set((vinculos || []).map((v) => v.patient_user_id).filter(Boolean))];

    let perfisPacientes = [];
    if (patientUserIds.length) {
      const { data: perfis, error: perfisError } = await supabase
        .from("perfis")
        .select("user_id, nome, email")
        .in("user_id", patientUserIds);

      if (perfisError) {
        throw new Error(`Falha ao carregar nomes completos dos pacientes: ${perfisError.message}`);
      }

      perfisPacientes = perfis || [];
    }

    patients = (vinculos || []).map((vinculo) => {
      const perfilPaciente = perfisPacientes.find(
        (perfil) => perfil.user_id === vinculo.patient_user_id
      );

      const nomeCompleto =
        perfilPaciente?.nome?.trim() ||
        vinculo.patient_name ||
        perfilPaciente?.email ||
        vinculo.patient_email ||
        "Paciente";

      const email =
        perfilPaciente?.email ||
        vinculo.patient_email ||
        "";

      return {
        vinculo_id: vinculo.id,
        patient_user_id: vinculo.patient_user_id,
        alias: vinculo.patient_alias || nomeCompleto,
        nome_real: nomeCompleto,
        email,
        created_at: vinculo.created_at
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
      aliasBox.hidden = true;
      taskFormCard.hidden = true;
      return;
    }

    tasksTitle.textContent = `Tarefas de ${patient.alias}`;
    tasksSubtitle.textContent = patient.nome_real;
    btnNewTask.disabled = false;
    aliasBox.hidden = false;

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
        const status = getTaskStatus(task);

        return `
          <article class="task-card">
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
        throw new Error(`Não foi possível salvar o apelido: ${error.message}`);
      }

      patient.alias = alias || patient.nome_real;
      renderPatients();
      renderTasksArea();
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
      if (taskFormCard) taskFormCard.hidden = true;

      await carregarTarefas();
      renderPatients();
      renderTasksArea();
      setTaskFormMessage("Tarefa criada com sucesso.", "success");
    } catch (error) {
      setTaskFormMessage(error.message || "Erro ao criar tarefa.", "error");
    } finally {
      if (btnCreateTask) btnCreateTask.disabled = false;
    }
  }

  function renderAll() {
    renderProfessionalName();
    renderPatients();
    renderTasksArea();
  }

  if (patientsGrid) {
    patientsGrid.addEventListener("click", (event) => {
      const card = event.target.closest("[data-patient-id]");
      if (!card) return;

      selectedPatientId = card.getAttribute("data-patient-id");

      if (taskFormCard) taskFormCard.hidden = true;
      setTaskFormMessage();
      renderAll();
    });
  }

  if (btnNewTask) {
    btnNewTask.addEventListener("click", () => {
      if (!selectedPatientId || !taskFormCard) return;

      taskFormCard.hidden = !taskFormCard.hidden;
      setTaskFormMessage();

      if (!taskFormCard.hidden && taskTitleInput) {
        taskTitleInput.focus();
      }
    });
  }

  if (btnCancelTask) {
    btnCancelTask.addEventListener("click", () => {
      if (taskFormCard) taskFormCard.hidden = true;
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

  async function iniciar() {
    hideScreenError();

    const ok = await validarProfissional();
    if (!ok) return;

    await carregarPacientes();
    await carregarTarefas();
    renderAll();
  }

  iniciar().catch((error) => {
    console.error("Erro na tela profissional-tarefas:", error);

    if (professionalLine) {
      professionalLine.textContent = "PROFISSIONAL: erro ao carregar";
    }

    showScreenError(error.message || "Erro ao carregar a gestão de tarefas.");
  });
});

