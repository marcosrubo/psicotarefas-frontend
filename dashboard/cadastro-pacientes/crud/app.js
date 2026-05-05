import supabase from "../../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const vinculoId = params.get("vinculo") || "";
  const patientId = params.get("patient") || "";

  const screenMessage = document.getElementById("screenMessage");
  const formMessage = document.getElementById("formMessage");
  const patientName = document.getElementById("patientName");
  const patientEmail = document.getElementById("patientEmail");
  const patientWhatsapp = document.getElementById("patientWhatsapp");
  const patientForm = document.getElementById("patientForm");
  const patientAlias = document.getElementById("patientAlias");
  const contractStatus = document.getElementById("contractStatus");
  const sessionValue = document.getElementById("sessionValue");
  const paymentFrequency = document.getElementById("paymentFrequency");
  const dueDay = document.getElementById("dueDay");
  const contractNotes = document.getElementById("contractNotes");
  const sessionFrequency = document.getElementById("sessionFrequency");
  const sessionWeekday = document.getElementById("sessionWeekday");
  const sessionTime = document.getElementById("sessionTime");
  const firstReminder = document.getElementById("firstReminder");
  const secondReminder = document.getElementById("secondReminder");
  const professionalReminder = document.getElementById("professionalReminder");
  const btnSave = document.getElementById("btnSave");
  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");

  let currentUser = null;
  let currentProfile = null;
  let currentProfessionalPlan = "gratuito";

  function normalizarPlanoProfissional(value) {
    const normalized = String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    if (normalized === "gratuito" || normalized === "standard" || normalized === "pro") {
      return normalized;
    }

    return "gratuito";
  }

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

  function formatarWhatsapp(value) {
    const digits = String(value || "").replace(/\D/g, "").slice(0, 13);

    if (!digits) return "Não informado";
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }

    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
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

  function aplicarRegrasDoPlano() {
    if (!firstReminder || !secondReminder || !professionalReminder) return;

    if (currentProfessionalPlan === "pro") {
      firstReminder.disabled = false;
      secondReminder.disabled = false;
      professionalReminder.disabled = false;
      return;
    }

    if (currentProfessionalPlan === "standard") {
      firstReminder.disabled = false;
      secondReminder.value = "0";
      secondReminder.disabled = true;
      professionalReminder.value = "0";
      professionalReminder.disabled = true;
      return;
    }

    firstReminder.value = "0";
    secondReminder.value = "0";
    professionalReminder.value = "0";
    firstReminder.disabled = true;
    secondReminder.disabled = true;
    professionalReminder.disabled = true;
  }

  async function sairDoSistema() {
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.href = "../../../auth/profissional-login/index.html";
    }
  }

  async function obterUsuarioAutenticado() {
    const {
      data: { session },
      error: sessionError
    } = await supabase.auth.getSession();

    if (sessionError) {
      throw new Error(`Falha ao obter sessão atual: ${sessionError.message}`);
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
      .select("nome, email, perfil, plano_profissional")
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
    currentProfessionalPlan = normalizarPlanoProfissional(perfil.plano_profissional);

    await registrarAcessoPagina({
      pagina: "cadastro_pacientes_crud",
      perfil: "profissional",
      userId: currentUser.id,
      email: currentProfile.email || currentUser.email || ""
    });

    return true;
  }

  async function carregarPaciente() {
    if (!vinculoId) {
      throw new Error("Paciente não informado para edição.");
    }

    const { data, error } = await supabase
      .from("vinculos")
      .select(`
        id,
        patient_user_id,
        patient_name,
        patient_email,
        patient_whatsapp,
        patient_alias,
        valor_sessao,
        periodicidade_pagamento,
        dia_vencimento,
        status_contrato,
        observacoes_contrato,
        periodicidade_sessao,
        dia_semana_sessao,
        horario_sessao,
        primeiro_aviso_horas_antes,
        segundo_aviso_horas_antes,
        aviso_profissional_horas_antes
      `)
      .eq("id", vinculoId)
      .eq("professional_user_id", currentUser.id)
      .single();

    if (error) {
      throw new Error(`Não foi possível carregar os dados do paciente: ${error.message}`);
    }

    const nomeCompleto =
      data.patient_name?.trim() ||
      data.patient_alias?.trim() ||
      data.patient_email?.trim() ||
      "Paciente";

    patientName.textContent = nomeCompleto;
    patientEmail.textContent = data.patient_email?.trim() || "Não informado";
    patientWhatsapp.textContent = formatarWhatsapp(data.patient_whatsapp || "");

    patientAlias.value = data.patient_alias || nomeCompleto;
    contractStatus.value = data.status_contrato || "";
    sessionValue.value =
      data.valor_sessao === null || data.valor_sessao === undefined
        ? ""
        : Number(data.valor_sessao).toFixed(2);
    paymentFrequency.value = data.periodicidade_pagamento || "";
    dueDay.value =
      data.dia_vencimento === null || data.dia_vencimento === undefined
        ? ""
        : String(data.dia_vencimento);
    contractNotes.value = data.observacoes_contrato || "";
    sessionFrequency.value = data.periodicidade_sessao || "";
    sessionWeekday.value = data.dia_semana_sessao || "";
    sessionTime.value = data.horario_sessao ? String(data.horario_sessao).slice(0, 5) : "";
    firstReminder.value =
      data.primeiro_aviso_horas_antes === null || data.primeiro_aviso_horas_antes === undefined
        ? "0"
        : String(data.primeiro_aviso_horas_antes);
    secondReminder.value =
      data.segundo_aviso_horas_antes === null || data.segundo_aviso_horas_antes === undefined
        ? "0"
        : String(data.segundo_aviso_horas_antes);
    professionalReminder.value =
      data.aviso_profissional_horas_antes === null || data.aviso_profissional_horas_antes === undefined
        ? "0"
        : String(data.aviso_profissional_horas_antes);

    aplicarRegrasDoPlano();
  }

  function parseMoney(value) {
    const normalized = String(value || "").trim().replace(",", ".");
    if (!normalized) return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  function parseNullableInt(value) {
    const normalized = String(value || "").trim();
    if (!normalized) return null;
    const parsed = Number.parseInt(normalized, 10);
    return Number.isFinite(parsed) ? parsed : Number.NaN;
  }

  async function salvarPaciente(event) {
    event.preventDefault();
    hideScreenError();
    setFormMessage();

    const alias = patientAlias.value.trim();
    const valorSessao = parseMoney(sessionValue.value);
    const diaVencimento = parseNullableInt(dueDay.value);
    const primeiroAviso = parseNullableInt(firstReminder.value);
    const segundoAviso = parseNullableInt(secondReminder.value);
    const avisoProfissional = parseNullableInt(professionalReminder.value);

    if (!alias) {
      setFormMessage("Digite um apelido válido para o paciente.");
      patientAlias.focus();
      return;
    }

    if (Number.isNaN(valorSessao) || (valorSessao !== null && valorSessao < 0)) {
      setFormMessage("Informe um valor de sessão válido.");
      sessionValue.focus();
      return;
    }

    if (Number.isNaN(diaVencimento) || (diaVencimento !== null && (diaVencimento < 1 || diaVencimento > 31))) {
      setFormMessage("Informe um dia de vencimento entre 1 e 31.");
      dueDay.focus();
      return;
    }

    if (Number.isNaN(primeiroAviso) || (primeiroAviso !== null && (primeiroAviso < 0 || primeiroAviso > 720))) {
      setFormMessage("Informe um 1o aviso entre 0 e 720 horas.");
      firstReminder.focus();
      return;
    }

    if (Number.isNaN(segundoAviso) || (segundoAviso !== null && (segundoAviso < 0 || segundoAviso > 720))) {
      setFormMessage("Informe um 2o aviso entre 0 e 720 horas.");
      secondReminder.focus();
      return;
    }

    if (Number.isNaN(avisoProfissional) || (avisoProfissional !== null && (avisoProfissional < 0 || avisoProfissional > 720))) {
      setFormMessage("Informe o aviso ao profissional entre 0 e 720 horas.");
      professionalReminder.focus();
      return;
    }

    if (currentProfessionalPlan === "gratuito" && primeiroAviso !== 0) {
      setFormMessage("Somente clientes Standard ou PRO podem ativar o 1o aviso.");
      firstReminder.focus();
      return;
    }

    if (currentProfessionalPlan !== "pro" && segundoAviso !== 0) {
      setFormMessage("Somente clientes PRO podem ativar o 2o aviso.");
      secondReminder.focus();
      return;
    }

    if (currentProfessionalPlan !== "pro" && avisoProfissional !== 0) {
      setFormMessage("Somente clientes PRO podem ativar o aviso ao profissional.");
      professionalReminder.focus();
      return;
    }

    const hasSessionFrequency = Boolean(sessionFrequency.value);
    const hasSessionWeekday = Boolean(sessionWeekday.value);
    const hasSessionTime = Boolean(sessionTime.value);
    const hasAnySessionScheduling =
      hasSessionFrequency || hasSessionWeekday || hasSessionTime;
    const hasAnyReminderEnabled =
      (primeiroAviso ?? 0) !== 0 ||
      (segundoAviso ?? 0) !== 0 ||
      (avisoProfissional ?? 0) !== 0;

    if ((hasAnySessionScheduling || hasAnyReminderEnabled) && !hasSessionFrequency) {
      setFormMessage("Informe a periodicidade da sessão.");
      sessionFrequency.focus();
      return;
    }

    if ((hasAnySessionScheduling || hasAnyReminderEnabled) && !hasSessionWeekday) {
      setFormMessage("Informe o dia da semana da sessão.");
      sessionWeekday.focus();
      return;
    }

    if ((hasAnySessionScheduling || hasAnyReminderEnabled) && !hasSessionTime) {
      setFormMessage("Informe o horário da sessão.");
      sessionTime.focus();
      return;
    }

    if (
      primeiroAviso !== null &&
      segundoAviso !== null &&
      !(primeiroAviso === 0 && segundoAviso === 0) &&
      primeiroAviso <= segundoAviso
    ) {
      setFormMessage("O 1o aviso precisa acontecer antes do 2o aviso. Use um número maior de horas no primeiro aviso.");
      firstReminder.focus();
      return;
    }

    btnSave.disabled = true;
    btnSave.textContent = "Gravando...";

    try {
      const payload = {
        patient_alias: alias,
        valor_sessao: valorSessao,
        periodicidade_pagamento: paymentFrequency.value || null,
        dia_vencimento: diaVencimento,
        status_contrato: contractStatus.value || null,
        observacoes_contrato: contractNotes.value.trim() || null,
        periodicidade_sessao: sessionFrequency.value || null,
        dia_semana_sessao: sessionWeekday.value || null,
        horario_sessao: sessionTime.value || null,
        primeiro_aviso_horas_antes: primeiroAviso ?? 0,
        segundo_aviso_horas_antes: segundoAviso ?? 0,
        aviso_profissional_horas_antes: avisoProfissional ?? 0
      };

      const { error } = await supabase
        .from("vinculos")
        .update(payload)
        .eq("id", vinculoId)
        .eq("professional_user_id", currentUser.id);

      if (error) {
        throw new Error(`Não foi possível salvar o paciente: ${error.message}`);
      }

      await registrarEvento({
        userId: currentUser?.id,
        email: currentProfile?.email || currentUser?.email || "",
        perfil: "profissional",
        evento: "cadastro_paciente_crud_salvo",
        pagina: "cadastro_pacientes_crud",
        contexto: {
          paciente_id: patientId || null,
          vinculo_id: vinculoId,
          periodicidade_sessao: payload.periodicidade_sessao,
          dia_semana_sessao: payload.dia_semana_sessao,
          possui_horario_sessao: Boolean(payload.horario_sessao),
          primeiro_aviso_horas_antes: payload.primeiro_aviso_horas_antes,
          segundo_aviso_horas_antes: payload.segundo_aviso_horas_antes,
          aviso_profissional_horas_antes: payload.aviso_profissional_horas_antes
        }
      });

      setFormMessage("Dados do paciente gravados com sucesso.", "success");
    } catch (error) {
      setFormMessage(error.message || "Não foi possível salvar os dados do paciente.");
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = "Gravar alterações";
    }
  }

  if (patientForm) {
    patientForm.addEventListener("submit", salvarPaciente);
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
    hideScreenError();
    const ok = await validarProfissional();
    if (!ok) return;
    await carregarPaciente();
  }

  iniciar().catch((error) => {
    console.error("Erro na tela de CRUD do paciente:", error);
    showScreenError(error.message || "Erro ao carregar os dados do paciente.");
  });
});
