import supabase from "../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const patientsList = document.getElementById("patientsList");
  const patientsEmptyState = document.getElementById("patientsEmptyState");
  const screenMessage = document.getElementById("screenMessage");
  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");

  let currentUser = null;
  let currentProfile = null;
  let patients = [];
  let tasks = [];
  let openPatientId = null;

  function setScreenMessage(text = "", type = "error") {
    if (!screenMessage) return;
    if (!text) {
      screenMessage.hidden = true;
      screenMessage.textContent = "";
      screenMessage.className = "screen-message";
      return;
    }
    screenMessage.hidden = false;
    screenMessage.textContent = text;
    screenMessage.className = `screen-message screen-message--${type}`;
  }

  function fecharMenuInferior() {
    if (!bottomMenuPanel || !btnBottomMenu) return;
    bottomMenuPanel.hidden = true;
    btnBottomMenu.setAttribute("aria-expanded", "false");
  }

  function alternarMenuInferior() {
    if (!bottomMenuPanel || !btnBottomMenu) return;
    const vaiAbrir = bottomMenuPanel.hidden;
    bottomMenuPanel.hidden = !vaiAbrir;
    btnBottomMenu.setAttribute("aria-expanded", String(vaiAbrir));
  }

  function normalizarTipoInteracao(value) {
    if (value === "limitado" || value === "ilimitado") return value;
    return "nao_permitir";
  }

  function getTaskKind(task) {
    if (task.origem_tipo === "banco" || task.origem_banco_tarefa_id) return "Banco de tarefas";
    if (task.origem_tipo === "ia" || task.pdf_path?.includes("/ia/")) return "Gerado por IA";
    if (task.pdf_path && task.video_url) return "PDF e vídeo";
    if (task.pdf_path) return "PDF anexado";
    if (task.video_url) return "Vídeo anexado";
    return "Atividade simples";
  }

  function getTaskPermissionMessage(task) {
    const tipo = normalizarTipoInteracao(task?.interacao_paciente_tipo);
    if (tipo === "nao_permitir") {
      return "Essa TAREFA NÃO permite interações";
    }
    return "";
  }

  function buildTaskInteractionUrl(task, patient) {
    const query = new URLSearchParams({
      task: task.id,
      patient: patient.patient_user_id,
      alias: patient.alias || patient.nome_real || "Paciente"
    });

    return `./interagindo/index.html?${query.toString()}`;
  }

  async function obterUsuarioAutenticado() {
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(`Falha ao obter sessão autenticada: ${sessionError.message}`);
    }

    if (session?.user) return session.user;

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
      window.location.href = "../../auth/profissional-login/index.html";
      return false;
    }

    currentProfile = perfil;

    await registrarAcessoPagina({
      pagina: "profissional_interacoes",
      perfil: "profissional",
      userId: currentUser.id,
      email: currentProfile.email || currentUser.email || ""
    });

    return true;
  }

  async function sairDoSistema() {
    await registrarEvento({
      evento: "logout",
      pagina: "profissional_interacoes",
      perfil: "profissional",
      userId: currentUser?.id || null,
      email: currentProfile?.email || currentUser?.email || null
    });

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Erro ao sair:", error);
    }

    window.location.href = "../../auth/profissional-login/index.html";
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
        nome_real: nomeCompleto
      };
    });
  }

  async function carregarTarefas() {
    const { data, error } = await supabase
      .from("tarefas")
      .select("id, patient_user_id, titulo, descricao, pdf_path, video_url, origem_tipo, origem_banco_tarefa_id, interacao_paciente_tipo, status, created_at")
      .eq("professional_user_id", currentUser.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Falha ao carregar tarefas dos pacientes: ${error.message}`);
    }

    tasks = data || [];
  }

  function getPatientTasks(patientId) {
    return tasks.filter((task) => task.patient_user_id === patientId);
  }

  function renderTasksForPatient(patient) {
    const patientTasks = getPatientTasks(patient.patient_user_id);

    if (!patientTasks.length) {
      return `<div class="empty-state">Nenhuma tarefa encontrada para este paciente.</div>`;
    }

    return `
      <div class="tasks-list">
        ${patientTasks.map((task) => `
          <article class="task-card">
            <div class="task-card__header">
              <p class="task-card__eyebrow">${getTaskKind(task)}</p>
              <h3 class="task-card__title">${escapeHtml(task.titulo || "Tarefa sem título")}</h3>
            </div>
            <p class="task-card__description">${escapeHtml(task.descricao || "Sem descrição cadastrada.")}</p>
            <div class="task-card__meta">
              <span class="task-chip task-chip--neutral">${escapeHtml(task.status || "aberta")}</span>
              ${task.pdf_path ? '<span class="task-chip">PDF</span>' : ""}
              ${task.video_url ? '<span class="task-chip">Vídeo</span>' : ""}
            </div>
            <div class="task-card__actions">
              <button class="btn-secondary" type="button" data-action="interagir" data-task-id="${task.id}" data-patient-id="${patient.patient_user_id}">
                Interagir
              </button>
            </div>
          </article>
        `).join("")}
      </div>
    `;
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function renderPatients() {
    if (!patientsList || !patientsEmptyState) return;

    if (!patients.length) {
      patientsList.innerHTML = "";
      patientsEmptyState.hidden = false;
      return;
    }

    patientsEmptyState.hidden = true;
    patientsList.innerHTML = patients.map((patient) => {
      const totalTasks = getPatientTasks(patient.patient_user_id).length;
      const isOpen = openPatientId === patient.patient_user_id;

      return `
        <section class="patient-cascade ${isOpen ? "patient-cascade--open" : ""}" data-patient-id="${patient.patient_user_id}">
          <button class="patient-cascade__toggle" type="button" data-action="toggle-patient" data-patient-id="${patient.patient_user_id}">
            <div class="patient-cascade__title">
              <span class="patient-cascade__name">${escapeHtml(patient.alias || patient.nome_real || "Paciente")}</span>
              <span class="patient-cascade__meta">${totalTasks} tarefa(s)</span>
            </div>
            <span class="patient-cascade__arrow">›</span>
          </button>
          <div class="patient-cascade__content" ${isOpen ? "" : "hidden"}>
            ${renderTasksForPatient(patient)}
          </div>
        </section>
      `;
    }).join("");
  }

  function togglePatient(patientId) {
    openPatientId = openPatientId === patientId ? null : patientId;
    renderPatients();
  }

  function handleInteragir(taskId, patientId) {
    const task = tasks.find((item) => item.id === taskId);
    const patient = patients.find((item) => item.patient_user_id === patientId);

    if (!task || !patient) return;

    const blockedMessage = getTaskPermissionMessage(task);

    if (blockedMessage) {
      window.alert(blockedMessage);
      return;
    }

    window.location.href = buildTaskInteractionUrl(task, patient);
  }

  function bindEvents() {
    btnBottomMenu?.addEventListener("click", alternarMenuInferior);
    btnMenuLogout?.addEventListener("click", sairDoSistema);

    document.addEventListener("click", (event) => {
      const toggleButton = event.target.closest('[data-action="toggle-patient"]');
      if (toggleButton) {
        togglePatient(toggleButton.dataset.patientId || "");
        return;
      }

      const interactButton = event.target.closest('[data-action="interagir"]');
      if (interactButton) {
        handleInteragir(
          interactButton.dataset.taskId || "",
          interactButton.dataset.patientId || ""
        );
        return;
      }

      if (
        bottomMenuPanel &&
        btnBottomMenu &&
        !bottomMenuPanel.hidden &&
        !bottomMenuPanel.contains(event.target) &&
        !btnBottomMenu.contains(event.target)
      ) {
        fecharMenuInferior();
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        fecharMenuInferior();
      }
    });
  }

  async function init() {
    bindEvents();

    try {
      const ok = await validarProfissional();
      if (!ok) return;

      await Promise.all([carregarPacientes(), carregarTarefas()]);
      renderPatients();
    } catch (error) {
      console.error(error);
      setScreenMessage(error.message || "Não foi possível carregar as interações do profissional.");
    }
  }

  init();
});
