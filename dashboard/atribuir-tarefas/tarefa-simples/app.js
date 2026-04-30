import supabase from "../../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const searchParams = new URLSearchParams(window.location.search);
  const initialPatientId = (searchParams.get("patient") || "").trim();
  const initialPatientAlias = (searchParams.get("alias") || "").trim();

  const btnBackLink = document.getElementById("btnBackLink");
  const brandBackLink = document.getElementById("brandBackLink");
  const btnCancelLink = document.getElementById("btnCancelLink");
  const selectedPatientName = document.getElementById("selectedPatientName");
  const screenMessage = document.getElementById("screenMessage");
  const simpleTaskForm = document.getElementById("simpleTaskForm");
  const taskTitleInput = document.getElementById("taskTitleInput");
  const taskDescriptionInput = document.getElementById("taskDescriptionInput");
  const taskInteractionType = document.getElementById("taskInteractionType");
  const taskInteractionLimitField = document.getElementById("taskInteractionLimitField");
  const taskInteractionLimit = document.getElementById("taskInteractionLimit");
  const formMessage = document.getElementById("formMessage");
  const btnSaveTask = document.getElementById("btnSaveTask");
  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");

  let currentUser = null;
  let currentProfile = null;
  let selectedPatient = null;

  function normalizarTipoInteracao(value) {
    if (value === "limitado" || value === "ilimitado") return value;
    return "nao_permitir";
  }

  function normalizarLimiteInteracao(tipo, value) {
    if (tipo !== "limitado") return null;
    const numero = Number.parseInt(String(value || "1"), 10);
    return Number.isFinite(numero) && numero > 0 ? numero : 1;
  }

  function syncTaskInteractionVisibility() {
    const tipo = normalizarTipoInteracao(taskInteractionType?.value);
    const isLimitado = tipo === "limitado";

    if (taskInteractionLimitField) {
      taskInteractionLimitField.hidden = !isLimitado;
    }

    if (taskInteractionLimit) {
      if (isLimitado) {
        if (!String(taskInteractionLimit.value || "").trim()) {
          taskInteractionLimit.value = String(
            normalizarLimiteInteracao(tipo, currentProfile?.tarefa_interacao_padrao_limite)
          );
        }
      } else {
        taskInteractionLimit.value = "";
      }
    }
  }

  function aplicarPadraoInteracaoDoProfissional() {
    if (!taskInteractionType) return;

    taskInteractionType.value = normalizarTipoInteracao(
      currentProfile?.tarefa_interacao_padrao_tipo
    );

    if (taskInteractionLimit) {
      const limite = normalizarLimiteInteracao(
        taskInteractionType.value,
        currentProfile?.tarefa_interacao_padrao_limite
      );
      taskInteractionLimit.value = limite ? String(limite) : "";
    }

    syncTaskInteractionVisibility();
  }

  function buildAssignmentsUrl() {
    const query = new URLSearchParams({
      patient: initialPatientId,
      alias: initialPatientAlias || selectedPatient?.alias || selectedPatient?.nome_real || "Paciente"
    });

    return `../atribuicoes/index.html?${query.toString()}`;
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
      .select("nome, email, perfil, tarefa_interacao_padrao_tipo, tarefa_interacao_padrao_limite")
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

  async function sairDoSistema() {
    await registrarEvento({
      evento: "logout",
      pagina: "tarefa_simples",
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
    const interactionType = normalizarTipoInteracao(taskInteractionType?.value);
    const interactionLimit = normalizarLimiteInteracao(
      interactionType,
      taskInteractionLimit?.value
    );

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

    if (interactionType === "limitado" && !interactionLimit) {
      setFormMessage("Informe o número máximo de interações permitidas.", "error");
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
        interacao_paciente_tipo: interactionType,
        interacao_paciente_limite: interactionLimit
      };

      const { data: novaTarefa, error } = await supabase
        .from("tarefas")
        .insert(payload)
        .select()
        .single();

      if (error || !novaTarefa) {
        throw new Error(error?.message || "Não foi possível criar a tarefa.");
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

      window.location.href = buildAssignmentsUrl();
    } catch (error) {
      console.error("Erro ao criar tarefa simples:", error);
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

  if (taskInteractionType) {
    taskInteractionType.addEventListener("change", syncTaskInteractionVisibility);
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
    setFormMessage();

    const assignmentsUrl = buildAssignmentsUrl();
    if (btnBackLink) btnBackLink.href = assignmentsUrl;
    if (brandBackLink) brandBackLink.href = assignmentsUrl;
    if (btnCancelLink) btnCancelLink.href = assignmentsUrl;

    const ok = await validarProfissional();
    if (!ok) return;

    aplicarPadraoInteracaoDoProfissional();
    await carregarPacienteSelecionado();
  }

  iniciar().catch((error) => {
    console.error("Erro na tela tarefa-simples:", error);
    setScreenMessage(error.message || "Não foi possível carregar a tela da tarefa simples.");
  });
});
