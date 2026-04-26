import supabase from "../../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const searchParams = new URLSearchParams(window.location.search);
  const initialPatientId = (searchParams.get("patient") || "").trim();
  const initialPatientAlias = (searchParams.get("alias") || "").trim();
  const createdTaskId = (searchParams.get("created_task_id") || "").trim();

  const btnBackLink = document.getElementById("btnBackLink");
  const selectedPatientName = document.getElementById("selectedPatientName");
  const screenMessage = document.getElementById("screenMessage");
  const tasksEmptyState = document.getElementById("tasksEmptyState");
  const tasksList = document.getElementById("tasksList");
  const btnSimpleTaskOption = document.getElementById("btnSimpleTaskOption");
  const btnPdfTaskOption = document.getElementById("btnPdfTaskOption");
  const btnBankTaskOption = document.getElementById("btnBankTaskOption");
  const btnAiTaskOption = document.getElementById("btnAiTaskOption");
  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");

  let currentUser = null;
  let currentProfile = null;
  let selectedPatient = null;
  let tasks = [];

  function esperar(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

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

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  function formatTaskType(task) {
    if (task.origem_tipo === "banco" || task.origem_banco_tarefa_id) {
      return "Banco de tarefas";
    }

    if (task.pdf_path) {
      return "Tarefa com PDF";
    }

    if (task.origem_tipo === "ia") {
      return "Tarefa com IA";
    }

    return "Tarefa simples";
  }

  function formatStatus(task) {
    if (task.status === "encerrada") {
      return { label: "Encerrada", className: "meta-chip--closed" };
    }

    if (task.status === "aberta") {
      return { label: "Aberta", className: "" };
    }

    return { label: task.status || "Sem status", className: "meta-chip--pending" };
  }

  function updateOptionLinks() {
    if (!selectedPatient?.patient_user_id) return;

    const query = new URLSearchParams({
      patient: selectedPatient.patient_user_id,
      alias: selectedPatient.alias || selectedPatient.nome_real || initialPatientAlias || "Paciente"
    }).toString();

    if (btnSimpleTaskOption) btnSimpleTaskOption.href = `../tarefa-simples/index.html?${query}`;
    if (btnPdfTaskOption) btnPdfTaskOption.href = `../tarefa-pdf/index.html?${query}`;
    if (btnBankTaskOption) btnBankTaskOption.href = `../tarefa-banco/index.html?${query}`;
    if (btnAiTaskOption) btnAiTaskOption.href = `../tarefa-ia/index.html?${query}`;
  }

  async function obterUsuarioAutenticado() {
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
      window.location.href = "../../../auth/profissional-login/index.html";
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
      window.location.href = "../../../auth/profissional-login/index.html";
      return false;
    }

    currentProfile = perfil;

    await registrarAcessoPagina({
      pagina: "atribuicoes",
      perfil: "profissional",
      userId: currentUser.id,
      email: currentProfile.email || currentUser.email || "",
      contexto: {
        paciente_id: initialPatientId || null
      }
    });

    return true;
  }

  async function sairDoSistema() {
    await registrarEvento({
      evento: "logout",
      pagina: "atribuicoes",
      perfil: "profissional",
      userId: currentUser?.id || null,
      email: currentProfile?.email || currentUser?.email || null
    });

    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Erro ao sair:", error);
    }

    window.location.href = "../../../auth/profissional-login/index.html";
  }

  async function carregarPacienteSelecionado() {
    if (!initialPatientId) {
      throw new Error("Nenhum paciente foi informado para abrir as atribuições.");
    }

    const { data, error } = await supabase.rpc("listar_pacientes_vinculados_profissional");

    if (error) {
      throw new Error(`Falha ao carregar pacientes vinculados: ${error.message}`);
    }

    const patients = (data || []).map((item) => {
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

    selectedPatient = patients.find((item) => item.patient_user_id === initialPatientId) || null;

    if (!selectedPatient) {
      throw new Error("O paciente selecionado não foi encontrado entre os vínculos ativos.");
    }

    if (selectedPatientName) {
      selectedPatientName.textContent =
        selectedPatient.alias || initialPatientAlias || selectedPatient.nome_real || "Paciente";
    }

    updateOptionLinks();
  }

  async function carregarTarefas() {
    const { data, error } = await supabase
      .from("tarefas")
      .select("*")
      .eq("professional_user_id", currentUser.id)
      .eq("patient_user_id", initialPatientId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Falha ao carregar tarefas: ${error.message}`);
    }

    tasks = data || [];
  }

  async function carregarTarefasAteEncontrarNova() {
    await carregarTarefas();

    if (!createdTaskId) {
      return;
    }

    if (tasks.some((task) => String(task.id) === createdTaskId)) {
      return;
    }

    for (let tentativa = 0; tentativa < 2; tentativa += 1) {
      await esperar(250);
      await carregarTarefas();

      if (tasks.some((task) => String(task.id) === createdTaskId)) {
        return;
      }
    }
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
        const taskType = formatTaskType(task);
        const taskStatus = formatStatus(task);

        return `
          <article class="assignment-card">
            <div class="assignment-card__top">
              <h3 class="assignment-card__title">${escapeHtml(task.titulo || "Tarefa sem título")}</h3>
              <span class="meta-chip meta-chip--status ${taskStatus.className}">${escapeHtml(taskStatus.label)}</span>
            </div>
            <p class="assignment-card__description">${escapeHtml(task.descricao || "Sem descrição cadastrada.")}</p>
            <div class="assignment-card__meta">
              <span class="meta-chip meta-chip--type">${escapeHtml(taskType)}</span>
              <span class="meta-chip meta-chip--type">${escapeHtml(formatDateTime(task.created_at))}</span>
            </div>
          </article>
        `;
      })
      .join("");
  }

  if (btnBottomMenu) {
    btnBottomMenu.addEventListener("click", alternarMenuInferior);
  }

  if (btnMenuLogout) {
    btnMenuLogout.addEventListener("click", sairDoSistema);
  }

  document.addEventListener("click", (event) => {
    if (!bottomMenuPanel || !btnBottomMenu) return;

    const clicouDentroDoMenu = bottomMenuPanel.contains(event.target);
    const clicouNoBotao = btnBottomMenu.contains(event.target);

    if (!clicouDentroDoMenu && !clicouNoBotao) {
      fecharMenuInferior();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      fecharMenuInferior();
    }
  });

  async function iniciar() {
    setScreenMessage();
    if (btnBackLink) {
      btnBackLink.href = "../index.html";
    }

    const ok = await validarProfissional();
    if (!ok) return;

    await carregarPacienteSelecionado();
    await carregarTarefasAteEncontrarNova();
    renderTasks();

    if (createdTaskId) {
      if (tasks.some((task) => String(task.id) === createdTaskId)) {
        setScreenMessage("Tarefa criada com sucesso.", "success");
      } else {
        setScreenMessage(
          "A tarefa foi enviada, mas ainda não apareceu na listagem. Atualize a tela para confirmar.",
          "error"
        );
      }
    }
  }

  iniciar().catch((error) => {
    console.error("Erro na tela atribuicoes:", error);
    setScreenMessage(error.message || "Não foi possível carregar as atribuições do paciente.");
  });
});
