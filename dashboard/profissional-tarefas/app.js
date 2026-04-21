const patientsMock = [
  {
    id: 1,
    alias: "João vestibular",
    name: "João da Silva",
    activeTasks: 2,
    pendingMessages: 1
  },
  {
    id: 2,
    alias: "Maria ansiedade",
    name: "Maria Souza",
    activeTasks: 3,
    pendingMessages: 2
  },
  {
    id: 3,
    alias: "Carlos rotina",
    name: "Carlos Lima",
    activeTasks: 1,
    pendingMessages: 0
  }
];

const tasksMock = {
  1: [
    {
      id: 101,
      title: "Registro de pensamentos automáticos",
      description: "Durante a semana, observar pensamentos automáticos antes dos estudos e registrar situações, emoções e interpretações.",
      status: "waiting-patient",
      createdAt: "15/04/2026 09:20",
      createdBy: "Profissional",
      interactions: [
        {
          authorType: "profissional",
          authorLabel: "Profissional",
          createdAt: "15/04/2026 09:20",
          text: "Durante esta semana, registre os pensamentos automáticos que surgirem antes de começar a estudar."
        },
        {
          authorType: "paciente",
          authorLabel: "Paciente",
          createdAt: "16/04/2026 20:10",
          text: "Percebi que pensei que não iria conseguir aprender o conteúdo e já comecei desanimado."
        },
        {
          authorType: "profissional",
          authorLabel: "Profissional",
          createdAt: "17/04/2026 08:40",
          text: "Ótimo registro. Agora tente observar também qual emoção apareceu no momento e qual intensidade ela teve."
        }
      ]
    },
    {
      id: 102,
      title: "Planejamento semanal de estudo",
      description: "Montar uma rotina simples de estudo com blocos curtos e pausas definidas.",
      status: "open",
      createdAt: "18/04/2026 10:30",
      createdBy: "Profissional",
      interactions: [
        {
          authorType: "profissional",
          authorLabel: "Profissional",
          createdAt: "18/04/2026 10:30",
          text: "Vamos estruturar uma rotina de estudo com blocos de 25 minutos e pausas curtas."
        }
      ]
    }
  ],
  2: [
    {
      id: 201,
      title: "Escala de ansiedade da semana",
      description: "Registrar em quais momentos do dia a ansiedade ficou mais intensa e o que aconteceu antes.",
      status: "waiting-professional",
      createdAt: "14/04/2026 11:00",
      createdBy: "Profissional",
      interactions: [
        {
          authorType: "profissional",
          authorLabel: "Profissional",
          createdAt: "14/04/2026 11:00",
          text: "Observe os momentos da semana em que sua ansiedade ficou mais forte."
        },
        {
          authorType: "paciente",
          authorLabel: "Paciente",
          createdAt: "15/04/2026 18:12",
          text: "Percebi aumento da ansiedade quando precisei sair sozinha para resolver coisas no centro."
        }
      ]
    },
    {
      id: 202,
      title: "Respiração guiada",
      description: "Praticar duas vezes ao dia uma sequência curta de respiração diafragmática.",
      status: "closed",
      createdAt: "10/04/2026 09:15",
      createdBy: "Profissional",
      interactions: [
        {
          authorType: "profissional",
          authorLabel: "Profissional",
          createdAt: "10/04/2026 09:15",
          text: "Pratique a respiração diafragmática pela manhã e à noite."
        },
        {
          authorType: "paciente",
          authorLabel: "Paciente",
          createdAt: "12/04/2026 20:00",
          text: "Consegui fazer e senti que o corpo desacelerou mais rápido do que antes."
        },
        {
          authorType: "profissional",
          authorLabel: "Profissional",
          createdAt: "13/04/2026 08:20",
          text: "Ótimo. Vamos encerrar esta tarefa e manter como prática livre."
        }
      ]
    },
    {
      id: 203,
      title: "Situações de evitação",
      description: "Listar situações evitadas durante a semana e o motivo da evitação.",
      status: "open",
      createdAt: "19/04/2026 14:45",
      createdBy: "Profissional",
      interactions: [
        {
          authorType: "profissional",
          authorLabel: "Profissional",
          createdAt: "19/04/2026 14:45",
          text: "Liste situações em que você percebeu vontade de evitar ou adiar algo."
        }
      ]
    }
  ],
  3: [
    {
      id: 301,
      title: "Rotina de sono",
      description: "Anotar horário de deitar, hora de dormir e qualidade percebida do sono.",
      status: "waiting-patient",
      createdAt: "17/04/2026 21:10",
      createdBy: "Profissional",
      interactions: [
        {
          authorType: "profissional",
          authorLabel: "Profissional",
          createdAt: "17/04/2026 21:10",
          text: "Vamos acompanhar sua rotina de sono por alguns dias para identificar padrões."
        }
      ]
    }
  ]
};

const patientsGrid = document.getElementById("patientsGrid");
const tasksList = document.getElementById("tasksList");
const tasksEmptyState = document.getElementById("tasksEmptyState");
const tasksColumnTitle = document.getElementById("tasksColumnTitle");
const tasksColumnSubtitle = document.getElementById("tasksColumnSubtitle");
const btnNewTask = document.getElementById("btnNewTask");

const conversationTitle = document.getElementById("conversationTitle");
const conversationSubtitle = document.getElementById("conversationSubtitle");
const taskStatusChip = document.getElementById("taskStatusChip");
const taskSummaryCard = document.getElementById("taskSummaryCard");
const taskSummaryTitle = document.getElementById("taskSummaryTitle");
const taskSummaryDescription = document.getElementById("taskSummaryDescription");
const taskSummaryCreatedAt = document.getElementById("taskSummaryCreatedAt");
const taskSummaryOwner = document.getElementById("taskSummaryOwner");

const conversationList = document.getElementById("conversationList");
const conversationEmptyState = document.getElementById("conversationEmptyState");
const replyBox = document.getElementById("replyBox");
const replyText = document.getElementById("replyText");
const btnClearReply = document.getElementById("btnClearReply");

let selectedPatientId = null;
let selectedTaskId = null;

function getSelectedPatient() {
  return patientsMock.find((patient) => patient.id === selectedPatientId) || null;
}

function getTasksOfSelectedPatient() {
  if (!selectedPatientId) return [];
  return tasksMock[selectedPatientId] || [];
}

function getSelectedTask() {
  const tasks = getTasksOfSelectedPatient();
  return tasks.find((task) => task.id === selectedTaskId) || null;
}

function getStatusConfig(status) {
  if (status === "open") {
    return {
      label: "Aberta",
      className: "status-chip status-chip--open"
    };
  }

  if (status === "waiting-patient") {
    return {
      label: "Aguardando paciente",
      className: "status-chip status-chip--waiting-patient"
    };
  }

  if (status === "waiting-professional") {
    return {
      label: "Aguardando profissional",
      className: "status-chip status-chip--waiting-professional"
    };
  }

  if (status === "closed") {
    return {
      label: "Encerrada",
      className: "status-chip status-chip--closed"
    };
  }

  return {
    label: "Sem status",
    className: "status-chip status-chip--muted"
  };
}

function renderPatients() {
  patientsGrid.innerHTML = patientsMock
    .map((patient) => {
      const isActive = patient.id === selectedPatientId ? "is-active" : "";

      return `
        <article class="patient-card ${isActive}" data-patient-id="${patient.id}">
          <h4 class="patient-card__alias">${patient.alias}</h4>
          <p class="patient-card__name">${patient.name}</p>
          <div class="patient-card__meta">
            <span class="patient-meta-chip">${patient.activeTasks} tarefa(s)</span>
            <span class="patient-meta-chip">${patient.pendingMessages} pendência(s)</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderTasks() {
  const patient = getSelectedPatient();
  const tasks = getTasksOfSelectedPatient();

  if (!patient) {
    tasksColumnTitle.textContent = "Tarefas do paciente";
    tasksColumnSubtitle.textContent = "Selecione um paciente para começar.";
    tasksList.innerHTML = "";
    tasksEmptyState.hidden = false;
    tasksEmptyState.textContent = "Selecione um paciente para visualizar as tarefas.";
    btnNewTask.disabled = true;
    return;
  }

  tasksColumnTitle.textContent = `Tarefas de ${patient.alias}`;
  tasksColumnSubtitle.textContent = patient.name;
  btnNewTask.disabled = false;

  if (!tasks.length) {
    tasksList.innerHTML = "";
    tasksEmptyState.hidden = false;
    tasksEmptyState.textContent = "Nenhuma tarefa criada para este paciente.";
    return;
  }

  tasksEmptyState.hidden = true;

  tasksList.innerHTML = tasks
    .map((task) => {
      const status = getStatusConfig(task.status);
      const isActive = task.id === selectedTaskId ? "is-active" : "";

      return `
        <article class="task-card ${isActive}" data-task-id="${task.id}">
          <div class="task-card__top">
            <h4 class="task-card__title">${task.title}</h4>
            <span class="${status.className}">${status.label}</span>
          </div>
          <p class="task-card__description">${task.description}</p>
          <div class="task-card__meta">
            <span>Criada em ${task.createdAt}</span>
            <span>${task.interactions.length} interação(ões)</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderConversation() {
  const task = getSelectedTask();

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
    return;
  }

  const status = getStatusConfig(task.status);

  conversationTitle.textContent = task.title;
  conversationSubtitle.textContent = "Histórico de interações da tarefa";
  taskStatusChip.className = status.className;
  taskStatusChip.textContent = status.label;

  taskSummaryCard.hidden = false;
  taskSummaryTitle.textContent = task.title;
  taskSummaryDescription.textContent = task.description;
  taskSummaryCreatedAt.textContent = `Criada em ${task.createdAt}`;
  taskSummaryOwner.textContent = `Criada por ${task.createdBy}`;

  conversationEmptyState.hidden = true;

  conversationList.innerHTML = task.interactions
    .map((interaction) => {
      const authorClass =
        interaction.authorType === "profissional"
          ? "conversation-item conversation-item--profissional"
          : "conversation-item conversation-item--paciente";

      return `
        <article class="${authorClass}">
          <div class="conversation-item__top">
            <strong class="conversation-item__author">${interaction.authorLabel}</strong>
            <span class="conversation-item__time">${interaction.createdAt}</span>
          </div>
          <p class="conversation-item__text">${interaction.text}</p>
        </article>
      `;
    })
    .join("");

  replyBox.hidden = false;
}

function rerenderAll() {
  renderPatients();
  renderTasks();
  renderConversation();
}

patientsGrid.addEventListener("click", (event) => {
  const card = event.target.closest("[data-patient-id]");
  if (!card) return;

  selectedPatientId = Number(card.getAttribute("data-patient-id"));
  selectedTaskId = null;
  rerenderAll();
});

tasksList.addEventListener("click", (event) => {
  const card = event.target.closest("[data-task-id]");
  if (!card) return;

  selectedTaskId = Number(card.getAttribute("data-task-id"));
  renderTasks();
  renderConversation();
});

btnNewTask.addEventListener("click", () => {
  const patient = getSelectedPatient();

  if (!patient) return;

  window.alert(
    `Aqui abrirá a criação de uma nova tarefa para ${patient.alias}.`
  );
});

btnClearReply.addEventListener("click", () => {
  replyText.value = "";
  replyText.focus();
});

replyBox.addEventListener("submit", (event) => {
  event.preventDefault();

  const task = getSelectedTask();
  const text = replyText.value.trim();

  if (!task || !text) return;

  task.interactions.push({
    authorType: "profissional",
    authorLabel: "Profissional",
    createdAt: "Agora",
    text
  });

  replyText.value = "";
  renderConversation();
  renderTasks();
});

rerenderAll();

