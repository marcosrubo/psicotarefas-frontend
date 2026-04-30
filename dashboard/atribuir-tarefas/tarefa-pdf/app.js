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
  const taskVideoUrlInput = document.getElementById("taskVideoUrlInput");
  const taskInteractionType = document.getElementById("taskInteractionType");
  const taskInteractionLimitField = document.getElementById("taskInteractionLimitField");
  const taskInteractionLimit = document.getElementById("taskInteractionLimit");
  const btnUploadTaskPdf = document.getElementById("btnUploadTaskPdf");
  const selectedPdfBox = document.getElementById("selectedPdfBox");
  const selectedPdfName = document.getElementById("selectedPdfName");
  const btnPreviewSelectedPdf = document.getElementById("btnPreviewSelectedPdf");
  const formMessage = document.getElementById("formMessage");
  const btnSaveTask = document.getElementById("btnSaveTask");
  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");
  const pdfPreviewModal = document.getElementById("pdfPreviewModal");
  const btnClosePdfPreview = document.getElementById("btnClosePdfPreview");
  const pdfPreviewFrame = document.getElementById("pdfPreviewFrame");

  const PDF_BUCKET = "banco-tarefas-pdf";

  let currentUser = null;
  let currentProfile = null;
  let selectedPatient = null;
  let selectedPdfFile = null;
  let currentPdfPreviewUrl = "";

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

  function getPdfUploadEndpoint() {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocal) {
      return "http://localhost:3000/api/storage/upload-task-pdf";
    }

    return "https://psicotarefas-backend.onrender.com/api/storage/upload-task-pdf";
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

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result || "");
        resolve(result.replace(/^data:.*;base64,/, ""));
      };
      reader.onerror = () => reject(new Error("Não foi possível ler o arquivo PDF."));
      reader.readAsDataURL(file);
    });
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

  function fecharPreviewPdf() {
    if (!pdfPreviewModal) return;
    pdfPreviewModal.hidden = true;

    if (pdfPreviewFrame) {
      pdfPreviewFrame.removeAttribute("src");
    }

    if (currentPdfPreviewUrl) {
      URL.revokeObjectURL(currentPdfPreviewUrl);
      currentPdfPreviewUrl = "";
    }
  }

  function isValidHttpUrl(value) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  function abrirPreviewPdfSelecionado() {
    if (!selectedPdfFile || !pdfPreviewModal || !pdfPreviewFrame) {
      setFormMessage("Selecione um PDF para visualizar.", "error");
      return;
    }

    fecharPreviewPdf();
    currentPdfPreviewUrl = URL.createObjectURL(selectedPdfFile);
    pdfPreviewFrame.src = currentPdfPreviewUrl;
    pdfPreviewModal.hidden = false;
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

    const fileBase64 = await fileToBase64(file);
    const response = await fetch(getPdfUploadEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: currentUser.id,
        fileName: file.name || "material.pdf",
        fileBase64,
        scope: "manual"
      })
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok || !payload?.pdfPath) {
      throw new Error(payload?.error || "Não foi possível enviar o PDF.");
    }

    return {
      pdfPath: payload.pdfPath,
      pdfName: file.name
    };
  }

  async function salvarTarefaPdf(event) {
    event.preventDefault();

    const titulo = taskTitleInput?.value.trim() || "";
    const descricao = taskDescriptionInput?.value.trim() || "";
    const videoUrl = taskVideoUrlInput?.value.trim() || "";
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

    if (!selectedPdfFile && !videoUrl) {
      setFormMessage("Selecione um PDF, informe um vídeo, ou os dois.", "error");
      return;
    }

    if (videoUrl && !isValidHttpUrl(videoUrl)) {
      setFormMessage("Informe uma URL de vídeo válida.", "error");
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
      const linkedPdf = selectedPdfFile
        ? await uploadCustomTaskPdf(selectedPdfFile)
        : { pdfPath: null, pdfName: null };

      const payload = {
        professional_user_id: currentUser.id,
        patient_user_id: selectedPatient.patient_user_id,
        vinculo_id: selectedPatient.vinculo_id,
        titulo,
        descricao,
        status: "aberta",
        interacao_paciente_tipo: interactionType,
        interacao_paciente_limite: interactionLimit,
        pdf_path: linkedPdf.pdfPath,
        pdf_nome: linkedPdf.pdfName || null,
        video_url: videoUrl || null
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
          pdf_nome: linkedPdf.pdfName || "",
          possui_video: Boolean(videoUrl)
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

  if (btnPreviewSelectedPdf) {
    btnPreviewSelectedPdf.addEventListener("click", abrirPreviewPdfSelecionado);
  }

  if (pdfTaskForm) {
    pdfTaskForm.addEventListener("submit", salvarTarefaPdf);
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

    if (event.target.closest("[data-close-pdf-preview='true']")) {
      fecharPreviewPdf();
    }
  });

  if (btnClosePdfPreview) {
    btnClosePdfPreview.addEventListener("click", fecharPreviewPdf);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      fecharMenuInferior();
      fecharPreviewPdf();
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

    aplicarPadraoInteracaoDoProfissional();
    await carregarPacienteSelecionado();
  }

  iniciar().catch((error) => {
    console.error("Erro na tela tarefa-pdf:", error);
    setScreenMessage(error.message || "Não foi possível carregar a tela da tarefa com PDF/Video.");
  });
});
