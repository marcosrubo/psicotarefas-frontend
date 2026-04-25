import supabase from "../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const patientsGrid = document.getElementById("patientsGrid");
  const patientsEmptyState = document.getElementById("patientsEmptyState");
  const screenMessage = document.getElementById("screenMessage");
  const taskChoiceModal = document.getElementById("taskChoiceModal");
  const taskChoiceBackdrop = document.getElementById("taskChoiceBackdrop");
  const taskChoicePatientName = document.getElementById("taskChoicePatientName");
  const btnCloseTaskChoice = document.getElementById("btnCloseTaskChoice");
  const btnCancelTaskChoice = document.getElementById("btnCancelTaskChoice");
  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");

  let currentUser = null;
  let currentProfile = null;
  let patients = [];
  let selectedPatient = null;

  function showScreenError(message) {
    if (!screenMessage) return;
    screenMessage.hidden = false;
    screenMessage.textContent = message;
  }

  function hideScreenError() {
    if (!screenMessage) return;
    screenMessage.hidden = true;
    screenMessage.textContent = "";
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
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

  function fecharEscolhaDeTarefa() {
    if (!taskChoiceModal) return;
    taskChoiceModal.hidden = true;
  }

  function abrirEscolhaDeTarefa(patient) {
    if (!taskChoiceModal || !taskChoicePatientName) return;
    selectedPatient = patient;
    taskChoicePatientName.textContent = `Paciente: ${patient.alias}`;
    taskChoiceModal.hidden = false;
  }

  async function sairDoSistema() {
    await registrarEvento({
      evento: "logout",
      pagina: "atribuir_tarefas",
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
      pagina: "atribuir_tarefas",
      perfil: "profissional",
      userId: currentUser.id,
      email: currentProfile.email || currentUser.email || ""
    });

    return true;
  }

  async function carregarPacientes() {
    const { data, error } = await supabase.rpc("listar_pacientes_vinculados_profissional");

    if (error) {
      throw new Error(`Falha ao carregar pacientes vinculados: ${error.message}`);
    }

    patients = (data || [])
      .map((item) => {
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
      })
      .sort((a, b) => a.alias.localeCompare(b.alias, "pt-BR", { sensitivity: "base" }));
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
        return `
          <button
            class="patient-select-button"
            type="button"
            data-patient-id="${escapeHtml(patient.patient_user_id)}"
            aria-label="Selecionar ${escapeHtml(patient.alias)}"
          >
            ${escapeHtml(patient.alias)}
          </button>
        `;
      })
      .join("");
  }

  if (patientsGrid) {
    patientsGrid.addEventListener("click", (event) => {
      const button = event.target.closest("[data-patient-id]");
      if (!button) return;

      const patientId = button.getAttribute("data-patient-id");
      const patient = patients.find((item) => item.patient_user_id === patientId);

      registrarEvento({
        userId: currentUser?.id,
        email: currentProfile?.email || currentUser?.email || "",
        perfil: "profissional",
        evento: "paciente_selecionado_para_atribuicao",
        pagina: "atribuir_tarefas",
        contexto: {
          paciente_id: patientId,
          vinculo_id: patient?.vinculo_id || null
        }
      });

      abrirEscolhaDeTarefa(patient);
    });
  }

  if (taskChoiceBackdrop) {
    taskChoiceBackdrop.addEventListener("click", fecharEscolhaDeTarefa);
  }

  if (btnCloseTaskChoice) {
    btnCloseTaskChoice.addEventListener("click", fecharEscolhaDeTarefa);
  }

  if (btnCancelTaskChoice) {
    btnCancelTaskChoice.addEventListener("click", fecharEscolhaDeTarefa);
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
      fecharEscolhaDeTarefa();
    }
  });

  async function iniciar() {
    hideScreenError();

    const ok = await validarProfissional();
    if (!ok) return;

    await carregarPacientes();
    renderPatients();
  }

  iniciar().catch((error) => {
    console.error("Erro na tela atribuir-tarefas:", error);
    showScreenError(error.message || "Erro ao carregar a seleção de pacientes.");
  });
});
