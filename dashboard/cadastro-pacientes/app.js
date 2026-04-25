import supabase from "../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const patientsGrid = document.getElementById("patientsGrid");
  const patientsEmptyState = document.getElementById("patientsEmptyState");
  const screenMessage = document.getElementById("screenMessage");
  const taskChoiceModal = document.getElementById("taskChoiceModal");
  const taskChoiceBackdrop = document.getElementById("taskChoiceBackdrop");
  const taskChoicePatientName = document.getElementById("taskChoicePatientName");
  const taskChoicePatientEmail = document.getElementById("taskChoicePatientEmail");
  const taskChoicePatientWhatsapp = document.getElementById("taskChoicePatientWhatsapp");
  const taskChoicePatientAlias = document.getElementById("taskChoicePatientAlias");
  const taskChoiceMessage = document.getElementById("taskChoiceMessage");
  const btnCloseTaskChoice = document.getElementById("btnCloseTaskChoice");
  const btnCancelTaskChoice = document.getElementById("btnCancelTaskChoice");
  const btnSaveTaskChoice = document.getElementById("btnSaveTaskChoice");
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

  function setTaskChoiceMessage(text = "", type = "error") {
    if (!taskChoiceMessage) return;

    if (!text) {
      taskChoiceMessage.hidden = true;
      taskChoiceMessage.textContent = "";
      taskChoiceMessage.className = "screen-message";
      return;
    }

    taskChoiceMessage.hidden = false;
    taskChoiceMessage.textContent = text;
    taskChoiceMessage.className = `screen-message screen-message--${type}`;
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

  function fecharMensagemPaciente() {
    if (!taskChoiceModal) return;
    taskChoiceModal.hidden = true;
    selectedPatient = null;
    setTaskChoiceMessage();
  }

  function abrirMensagemPaciente(patient) {
    if (!taskChoiceModal || !taskChoicePatientName || !taskChoicePatientAlias) return;
    selectedPatient = patient;
    taskChoicePatientName.textContent = patient.nome_real || "-";
    if (taskChoicePatientEmail) {
      taskChoicePatientEmail.textContent = patient.email || "Não informado";
    }
    if (taskChoicePatientWhatsapp) {
      taskChoicePatientWhatsapp.textContent = patient.whatsapp || "Não informado";
    }
    taskChoicePatientAlias.value = patient.alias || "";
    setTaskChoiceMessage();
    taskChoiceModal.hidden = false;
    window.setTimeout(() => {
      taskChoicePatientAlias.focus();
      taskChoicePatientAlias.select();
    }, 60);
  }

  async function salvarApelidoPaciente() {
    if (!selectedPatient || !taskChoicePatientAlias || !btnSaveTaskChoice) return;

    const alias = taskChoicePatientAlias.value.trim();

    if (!alias) {
      setTaskChoiceMessage("Digite um apelido válido para o paciente.", "error");
      return;
    }

    btnSaveTaskChoice.disabled = true;
    btnSaveTaskChoice.textContent = "Gravando...";
    setTaskChoiceMessage();

    try {
      const { error } = await supabase
        .from("vinculos")
        .update({
          patient_alias: alias
        })
        .eq("id", selectedPatient.vinculo_id)
        .eq("professional_user_id", currentUser.id);

      if (error) {
        throw new Error(`Não foi possível salvar o apelido: ${error.message}`);
      }

      selectedPatient.alias = alias;

      const patientIndex = patients.findIndex((item) => item.vinculo_id === selectedPatient.vinculo_id);
      if (patientIndex >= 0) {
        patients[patientIndex].alias = alias;
      }

      patients.sort((a, b) => a.alias.localeCompare(b.alias, "pt-BR", { sensitivity: "base" }));
      renderPatients();

      await registrarEvento({
        userId: currentUser?.id,
        email: currentProfile?.email || currentUser?.email || "",
        perfil: "profissional",
        evento: "apelido_paciente_atualizado",
        pagina: "cadastro_pacientes",
        contexto: {
          paciente_id: selectedPatient.patient_user_id,
          vinculo_id: selectedPatient.vinculo_id
        }
      });

      fecharMensagemPaciente();
    } catch (error) {
      setTaskChoiceMessage(error.message || "Erro ao salvar o apelido.", "error");
    } finally {
      btnSaveTaskChoice.disabled = false;
      btnSaveTaskChoice.textContent = "Gravar";
    }
  }

  async function sairDoSistema() {
    await registrarEvento({
      evento: "logout",
      pagina: "cadastro_pacientes",
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
      pagina: "cadastro_pacientes",
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
          whatsapp: item.patient_whatsapp || ""
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
      if (!patient) return;

      registrarEvento({
        userId: currentUser?.id,
        email: currentProfile?.email || currentUser?.email || "",
        perfil: "profissional",
        evento: "paciente_selecionado_para_cadastro",
        pagina: "cadastro_pacientes",
        contexto: {
          paciente_id: patientId,
          vinculo_id: patient.vinculo_id || null
        }
      });

      abrirMensagemPaciente(patient);
    });
  }

  if (taskChoiceBackdrop) {
    taskChoiceBackdrop.addEventListener("click", fecharMensagemPaciente);
  }

  if (btnCloseTaskChoice) {
    btnCloseTaskChoice.addEventListener("click", fecharMensagemPaciente);
  }

  if (btnCancelTaskChoice) {
    btnCancelTaskChoice.addEventListener("click", fecharMensagemPaciente);
  }

  if (btnSaveTaskChoice) {
    btnSaveTaskChoice.addEventListener("click", salvarApelidoPaciente);
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
      fecharMensagemPaciente();
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
    console.error("Erro na tela cadastro-pacientes:", error);
    showScreenError(error.message || "Erro ao carregar a seleção de pacientes.");
  });
});
