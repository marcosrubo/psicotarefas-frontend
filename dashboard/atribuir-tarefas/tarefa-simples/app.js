import supabase from "../../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const searchParams = new URLSearchParams(window.location.search);
  const initialPatientId = (searchParams.get("patient") || "").trim();
  const initialPatientAlias = (searchParams.get("alias") || "").trim();

  const selectedPatientName = document.getElementById("selectedPatientName");
  const screenMessage = document.getElementById("screenMessage");
  const simpleTaskForm = document.getElementById("simpleTaskForm");
  const taskTitleInput = document.getElementById("taskTitleInput");
  const taskDescriptionInput = document.getElementById("taskDescriptionInput");
  const formMessage = document.getElementById("formMessage");
  const btnSaveTask = document.getElementById("btnSaveTask");

  let currentUser = null;
  let currentProfile = null;
  let selectedPatient = null;

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

  function setFormMessage(text = "", type = "error") {
    if (!formMessage) return;

    if (!text) {
      formMessage.hidden = true;
      formMessage.textContent = "";
      formMessage.className = "screen-message";
      return;
    }

    formMessage.hidden = false;
    formMessage.textContent = text;
    formMessage.className = `screen-message screen-message--${type}`;
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
      pagina: "tarefa_simples",
      perfil: "profissional",
      userId: currentUser.id,
      email: currentProfile.email || currentUser.email || "",
      contexto: {
        paciente_id: initialPatientId || null
      }
    });

    return true;
  }

  async function carregarPacienteSelecionado() {
    if (!initialPatientId) {
      throw new Error("Nenhum paciente foi informado para criar a tarefa.");
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
  }

  async function salvarTarefaSimples(event) {
    event.preventDefault();

    const titulo = taskTitleInput?.value.trim() || "";
    const descricao = taskDescriptionInput?.value.trim() || "";

    if (!selectedPatient) {
      setFormMessage("Selecione um paciente válido antes de gravar a tarefa.", "error");
      return;
    }

    if (!titulo) {
      setFormMessage("Informe o título da tarefa.", "error");
      return;
    }

    if (!descricao) {
      setFormMessage("Informe a descrição da tarefa.", "error");
      return;
    }

    if (btnSaveTask) {
      btnSaveTask.disabled = true;
      btnSaveTask.textContent = "GRAVANDO...";
    }
    setFormMessage();

    try {
      const payload = {
        professional_user_id: currentUser.id,
        patient_user_id: selectedPatient.patient_user_id,
        vinculo_id: selectedPatient.vinculo_id,
        titulo,
        descricao,
        status: "aberta",
        interacao_paciente_tipo: "nao_permitir",
        interacao_paciente_limite: 0
      };

      const { data: novaTarefa, error } = await supabase
        .from("tarefas")
        .insert(payload)
        .select()
        .single();

      if (error || !novaTarefa) {
        throw new Error("Não foi possível criar a tarefa.");
      }

      await registrarEvento({
        userId: currentUser?.id,
        email: currentProfile?.email || currentUser?.email || "",
        perfil: "profissional",
        evento: "tarefa_criada",
        pagina: "tarefa_simples",
        contexto: {
          tarefa_id: novaTarefa.id,
          paciente_id: selectedPatient.patient_user_id,
          origem_tipo: "manual"
        }
      });

      window.location.href = "../index.html";
    } catch (error) {
      setFormMessage(error.message || "Erro ao criar tarefa.", "error");
    } finally {
      if (btnSaveTask) {
        btnSaveTask.disabled = false;
        btnSaveTask.textContent = "GRAVAR";
      }
    }
  }

  if (simpleTaskForm) {
    simpleTaskForm.addEventListener("submit", salvarTarefaSimples);
  }

  async function iniciar() {
    setScreenMessage();
    setFormMessage();

    const ok = await validarProfissional();
    if (!ok) return;

    await carregarPacienteSelecionado();
  }

  iniciar().catch((error) => {
    console.error("Erro na tela tarefa-simples:", error);
    setScreenMessage(error.message || "Não foi possível carregar a tela da tarefa simples.");
  });
});
