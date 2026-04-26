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
  const aiTaskForm = document.getElementById("aiTaskForm");
  const aiThemeInput = document.getElementById("aiThemeInput");
  const aiGoalInput = document.getElementById("aiGoalInput");
  const aiAgeRangeSelect = document.getElementById("aiAgeRangeSelect");
  const aiToneSelect = document.getElementById("aiToneSelect");
  const aiSizeSelect = document.getElementById("aiSizeSelect");
  const aiFormatSelect = document.getElementById("aiFormatSelect");
  const aiProfessionalNotes = document.getElementById("aiProfessionalNotes");
  const formMessage = document.getElementById("formMessage");
  const btnGeneratePreview = document.getElementById("btnGeneratePreview");
  const previewCard = document.getElementById("previewCard");
  const previewTitle = document.getElementById("previewTitle");
  const previewSummary = document.getElementById("previewSummary");
  const previewContent = document.getElementById("previewContent");
  const previewMessage = document.getElementById("previewMessage");
  const btnRegeneratePreview = document.getElementById("btnRegeneratePreview");
  const btnSaveTask = document.getElementById("btnSaveTask");
  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");

  let currentUser = null;
  let currentProfile = null;
  let selectedPatient = null;
  let lastGeneratedAiMaterial = null;

  function buildAssignmentsUrl() {
    const query = new URLSearchParams({
      patient: initialPatientId,
      alias: initialPatientAlias || selectedPatient?.alias || selectedPatient?.nome_real || "Paciente"
    });

    return `../atribuicoes/index.html?${query.toString()}`;
  }

  function getAiEndpoint() {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocal) {
      return "http://localhost:3000/api/ai/task-material-preview";
    }

    return "https://psicotarefas-backend.onrender.com/api/ai/task-material-preview";
  }

  function getAiPdfEndpoint() {
    const isLocal =
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1";

    if (isLocal) {
      return "http://localhost:3000/api/ai/task-material-pdf";
    }

    return "https://psicotarefas-backend.onrender.com/api/ai/task-material-pdf";
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

  function setPreviewMessage(text = "", type = "error") {
    if (!previewMessage) return;

    if (!text) {
      previewMessage.hidden = true;
      previewMessage.textContent = "";
      previewMessage.className = "screen-message";
      return;
    }

    previewMessage.hidden = false;
    previewMessage.textContent = text;
    previewMessage.className = `screen-message screen-message--${type}`;
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

  function getSelectedOptionLabel(element) {
    if (!element) return "";
    const option = element.options?.[element.selectedIndex];
    return option?.value ? option.textContent.trim() : "";
  }

  function buildDraftTitle() {
    const theme = aiThemeInput?.value.trim() || "Tarefa terapêutica";
    const goal = aiGoalInput?.value.trim() || "";
    const shortGoal = goal.split(/[.!?]/)[0].trim();

    if (!shortGoal) {
      return `Atividade - ${theme}`;
    }

    return `${theme} - ${shortGoal}`;
  }

  function buildDraftDescription() {
    const theme = aiThemeInput?.value.trim() || "";
    const goal = aiGoalInput?.value.trim() || "";
    const context = getSelectedOptionLabel(aiAgeRangeSelect);
    const tone = getSelectedOptionLabel(aiToneSelect);

    return [
      theme ? `Tema: ${theme}.` : "",
      goal ? `Objetivo: ${goal}` : "",
      context ? `Contexto: ${context}.` : "",
      tone ? `Tom sugerido: ${tone}.` : ""
    ]
      .filter(Boolean)
      .join(" ")
      .trim();
  }

  function buildAiParameters() {
    return {
      age_range: getSelectedOptionLabel(aiAgeRangeSelect),
      goal: aiGoalInput?.value.trim() || "",
      tone: getSelectedOptionLabel(aiToneSelect),
      estimated_time: getSelectedOptionLabel(aiSizeSelect),
      format: getSelectedOptionLabel(aiFormatSelect),
      frequency: "",
      context: aiThemeInput?.value.trim() || "",
      observe_after: aiProfessionalNotes?.value.trim() || ""
    };
  }

  function renderAiPreviewSection(title, bodyHtml) {
    return `
      <section class="preview-section">
        <h3>${escapeHtml(title)}</h3>
        ${bodyHtml}
      </section>
    `;
  }

  function renderAiPreview(material) {
    if (!previewCard || !previewContent || !previewTitle || !previewSummary) return;

    if (!material) {
      previewCard.hidden = true;
      previewContent.innerHTML = "";
      previewTitle.textContent = "Prévia da tarefa com IA";
      previewSummary.textContent = "Material inicial gerado a partir dos parâmetros informados.";
      return;
    }

    const sections = [];

    if (material.objective) {
      sections.push(renderAiPreviewSection("Objetivo", `<p>${escapeHtml(material.objective)}</p>`));
    }

    if (Array.isArray(material.instructions) && material.instructions.length) {
      sections.push(
        renderAiPreviewSection(
          "Como aplicar",
          `<ul>${material.instructions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
        )
      );
    }

    if (Array.isArray(material.reflection_questions) && material.reflection_questions.length) {
      sections.push(
        renderAiPreviewSection(
          "Perguntas guiadas",
          `<ul>${material.reflection_questions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
        )
      );
    }

    if (material.closing_message) {
      sections.push(renderAiPreviewSection("Fechamento", `<p>${escapeHtml(material.closing_message)}</p>`));
    }

    if (!sections.length && material.raw_text) {
      sections.push(renderAiPreviewSection("Conteúdo gerado", `<p>${escapeHtml(material.raw_text)}</p>`));
    }

    previewTitle.textContent = material.title || "Prévia da tarefa com IA";
    previewSummary.textContent =
      material.summary || "Material inicial gerado a partir dos parâmetros informados.";
    previewContent.innerHTML = sections.join("");
    previewCard.hidden = false;
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
      pagina: "tarefa_ia",
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
      pagina: "tarefa_ia",
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

  async function gerarMaterialComIa(event) {
    event?.preventDefault();

    const title = buildDraftTitle();
    const description = buildDraftDescription();
    const promptComplement = aiProfessionalNotes?.value.trim() || "";
    const parameters = buildAiParameters();

    if (!(aiThemeInput?.value.trim() || "")) {
      setFormMessage("Informe o tema principal antes de gerar com IA.", "error");
      return;
    }

    if (!(aiGoalInput?.value.trim() || "")) {
      setFormMessage("Informe o objetivo da tarefa antes de gerar com IA.", "error");
      return;
    }

    if (!btnGeneratePreview) return;

    btnGeneratePreview.disabled = true;
    btnGeneratePreview.textContent = "GERANDO...";
    setFormMessage();
    setPreviewMessage();

    try {
      const response = await fetch(getAiEndpoint(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          title,
          description,
          promptComplement,
          parameters
        })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Não foi possível gerar o material com IA neste momento.");
      }

      lastGeneratedAiMaterial = data?.material || null;
      renderAiPreview(lastGeneratedAiMaterial);
      setPreviewMessage("Prévia gerada com sucesso.", "success");

      await registrarEvento({
        userId: currentUser?.id,
        email: currentProfile?.email || currentUser?.email || "",
        perfil: "profissional",
        evento: "previa_ia_gerada",
        pagina: "tarefa_ia",
        contexto: {
          paciente_id: selectedPatient?.patient_user_id || null,
          titulo: title,
          objetivo_ia: parameters.goal || null,
          formato_ia: parameters.format || null
        }
      });
    } catch (error) {
      lastGeneratedAiMaterial = null;
      renderAiPreview(null);
      setFormMessage(error.message || "Erro ao gerar material com IA.", "error");
    } finally {
      btnGeneratePreview.disabled = false;
      btnGeneratePreview.textContent = "GERAR PRÉVIA";
    }
  }

  async function gerarPdfDaPreviaComIa({ title, description, patientName, professionalName }) {
    if (!lastGeneratedAiMaterial) {
      return null;
    }

    const response = await fetch(getAiPdfEndpoint(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: currentUser?.id,
        title,
        description,
        material: lastGeneratedAiMaterial,
        patientName,
        professionalName
      })
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || "Não foi possível gerar o PDF da prévia com IA.");
    }

    return {
      pdfPath: data?.pdfPath || null,
      pdfName: data?.pdfName || null
    };
  }

  async function salvarTarefaComIa() {
    if (!selectedPatient) {
      setPreviewMessage("Selecione um paciente válido antes de gravar a tarefa.", "error");
      return;
    }

    if (!lastGeneratedAiMaterial) {
      setPreviewMessage("Gere a prévia da tarefa antes de gravar.", "error");
      return;
    }

    const finalTitle = lastGeneratedAiMaterial.title || buildDraftTitle();
    const finalDescription = lastGeneratedAiMaterial.summary || buildDraftDescription();

    if (btnSaveTask) {
      btnSaveTask.disabled = true;
      btnSaveTask.textContent = "GRAVANDO...";
    }
    setPreviewMessage();

    try {
      const linkedPdf = await gerarPdfDaPreviaComIa({
        title: finalTitle,
        description: finalDescription,
        patientName: selectedPatient.alias || selectedPatient.nome_real,
        professionalName: currentProfile?.nome || currentProfile?.email || "Profissional"
      });

      const payload = {
        professional_user_id: currentUser.id,
        patient_user_id: selectedPatient.patient_user_id,
        vinculo_id: selectedPatient.vinculo_id,
        titulo: finalTitle,
        descricao: finalDescription,
        status: "aberta",
        interacao_paciente_tipo: "nao_permitir",
        interacao_paciente_limite: null,
        origem_tipo: "ia",
        pdf_path: linkedPdf?.pdfPath || null,
        pdf_nome: linkedPdf?.pdfName || null
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
        pagina: "tarefa_ia",
        contexto: {
          tarefa_id: novaTarefa.id,
          paciente_id: selectedPatient.patient_user_id,
          origem_tipo: "ia",
          pdf_nome: linkedPdf?.pdfName || ""
        }
      });

      window.location.href = buildAssignmentsUrl();
    } catch (error) {
      setPreviewMessage(error.message || "Erro ao criar tarefa com IA.", "error");
    } finally {
      if (btnSaveTask) {
        btnSaveTask.disabled = false;
        btnSaveTask.textContent = "GRAVAR";
      }
    }
  }

  if (aiTaskForm) {
    aiTaskForm.addEventListener("submit", gerarMaterialComIa);
  }

  if (btnRegeneratePreview) {
    btnRegeneratePreview.addEventListener("click", gerarMaterialComIa);
  }

  if (btnSaveTask) {
    btnSaveTask.addEventListener("click", salvarTarefaComIa);
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
    setPreviewMessage();
    renderAiPreview(null);

    const assignmentsUrl = buildAssignmentsUrl();
    if (btnBackLink) btnBackLink.href = assignmentsUrl;
    if (brandBackLink) brandBackLink.href = assignmentsUrl;
    if (btnCancelLink) btnCancelLink.href = assignmentsUrl;

    const ok = await validarProfissional();
    if (!ok) return;

    await carregarPacienteSelecionado();
  }

  iniciar().catch((error) => {
    console.error("Erro na tela tarefa-ia:", error);
    setScreenMessage(error.message || "Não foi possível carregar a tela da tarefa com IA.");
  });
});
