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
  const pdfTaskForm = document.getElementById("pdfTaskForm");
  const taskTitleInput = document.getElementById("taskTitleInput");
  const taskDescriptionInput = document.getElementById("taskDescriptionInput");
  const taskPdfUploadInput = document.getElementById("taskPdfUploadInput");
  const btnUploadTaskPdf = document.getElementById("btnUploadTaskPdf");
  const selectedPdfBox = document.getElementById("selectedPdfBox");
  const selectedPdfName = document.getElementById("selectedPdfName");
  const btnClearSelectedPdf = document.getElementById("btnClearSelectedPdf");
  const formMessage = document.getElementById("formMessage");
  const btnSaveTask = document.getElementById("btnSaveTask");
  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");

  const PDF_BUCKET = "banco-tarefas-pdf";

  let currentUser = null;
  let currentProfile = null;
  let selectedPatient = null;
  let selectedPdfFile = null;

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

  function slugifyFileName(value) {
    return String(value || "arquivo")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();
  }

  function applySelectedPdf(file) {
    selectedPdfFile = file;

    if (selectedPdfName) {
      selectedPdfName.textContent = file?.name || "PDF selecionado";
    }

    if (selectedPdfBox) {
      selectedPdfBox.hidden = !file;
    }
  }

  function clearSelectedPdf() {
    selectedPdfFile = null;
    if (taskPdfUploadInput) {
      taskPdfUploadInput.value = "";
    }
    if (selectedPdfBox) {
      selectedPdfBox.hidden = true;
    }
    if (selectedPdfName) {
      selectedPdfName.textContent = "PDF selecionado";
    }
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
      pagina: "tarefa_pdf",
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
      pagina: "tarefa_pdf",
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

  async function uploadCustomTaskPdf(file) {
    if (!currentUser?.id) {
      throw new Error("Sessão inválida para enviar o PDF.");
    }

    const baseName = file.name.replace(/\.pdf$/i, "") || "material";
    const safeBase = slugifyFileName(baseName) || "material";
    const fileName = `${Date.now()}-${safeBase}.pdf`;
    const storagePath = `${currentUser.id}/manual/${fileName}`;

    const { error } = await supabase.storage.from(PDF_BUCKET).upload(storagePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: "application/pdf"
    });

    if (error) {
      throw new Error(`Não foi possível enviar o PDF: ${error.message}`);
    }

    return {
      pdfPath: storagePath,
      pdfName: file.name
    };
  }

  async function salvarTarefaPdf(event) {
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

    if (!selectedPdfFile) {
      setFormMessage("Selecione um PDF para continuar.", "error");
      return;
    }

    if (btnSaveTask) {
      btnSaveTask.disabled = true;
      btnSaveTask.textContent = "GRAVANDO...";
    }
    setFormMessage();

    try {
      const linkedPdf = await uploadCustomTaskPdf(selectedPdfFile);

      const payload = {
        professional_user_id: currentUser.id,
        patient_user_id: selectedPatient.patient_user_id,
        vinculo_id: selectedPatient.vinculo_id,
        titulo,
        descricao,
        status: "aberta",
        interacao_paciente_tipo: "nao_permitir",
        interacao_paciente_limite: null,
        pdf_path: linkedPdf.pdfPath,
        pdf_nome: linkedPdf.pdfName || null
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
        pagina: "tarefa_pdf",
        contexto: {
          tarefa_id: novaTarefa.id,
          paciente_id: selectedPatient.patient_user_id,
          origem_tipo: "manual_pdf",
          pdf_nome: linkedPdf.pdfName || ""
        }
      });

      window.location.href = buildAssignmentsUrl();
    } catch (error) {
      console.error("Erro ao criar tarefa com PDF:", error);
      setFormMessage(error.message || "Erro ao criar tarefa.", "error");
    } finally {
      if (btnSaveTask) {
        btnSaveTask.disabled = false;
        btnSaveTask.textContent = "GRAVAR";
      }
    }
  }

  if (btnUploadTaskPdf) {
    btnUploadTaskPdf.addEventListener("click", () => {
      taskPdfUploadInput?.click();
    });
  }

  if (taskPdfUploadInput) {
    taskPdfUploadInput.addEventListener("change", (event) => {
      const file = event.target.files?.[0] || null;
      if (!file) return;

      if (!/\.pdf$/i.test(file.name) || (file.type && file.type !== "application/pdf")) {
        setFormMessage("Selecione um arquivo PDF válido.", "error");
        taskPdfUploadInput.value = "";
        return;
      }

      applySelectedPdf(file);
      setFormMessage();
      registrarEvento({
        userId: currentUser?.id,
        email: currentProfile?.email || currentUser?.email || "",
        perfil: "profissional",
        evento: "pdf_proprio_selecionado",
        pagina: "tarefa_pdf",
        contexto: {
          pdf_nome: file.name
        }
      });
    });
  }

  if (btnClearSelectedPdf) {
    btnClearSelectedPdf.addEventListener("click", clearSelectedPdf);
  }

  if (pdfTaskForm) {
    pdfTaskForm.addEventListener("submit", salvarTarefaPdf);
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
    clearSelectedPdf();

    const assignmentsUrl = buildAssignmentsUrl();
    if (btnBackLink) btnBackLink.href = assignmentsUrl;
    if (brandBackLink) brandBackLink.href = assignmentsUrl;
    if (btnCancelLink) btnCancelLink.href = assignmentsUrl;

    const ok = await validarProfissional();
    if (!ok) return;

    await carregarPacienteSelecionado();
  }

  iniciar().catch((error) => {
    console.error("Erro na tela tarefa-pdf:", error);
    setScreenMessage(error.message || "Não foi possível carregar a tela da tarefa com PDF.");
  });
});
