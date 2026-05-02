import supabase from "../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const patientsGrid = document.getElementById("patientsGrid");
  const patientsEmptyState = document.getElementById("patientsEmptyState");
  const btnOpenInviteModal = document.getElementById("btnOpenInviteModal");
  const awaitingEmailList = document.getElementById("awaitingEmailList");
  const awaitingEmailEmptyState = document.getElementById("awaitingEmailEmptyState");
  const pendingInviteList = document.getElementById("pendingInviteList");
  const pendingInviteEmptyState = document.getElementById("pendingInviteEmptyState");
  const canceledInviteList = document.getElementById("canceledInviteList");
  const canceledInviteEmptyState = document.getElementById("canceledInviteEmptyState");
  const screenMessage = document.getElementById("screenMessage");
  const taskChoiceModal = document.getElementById("taskChoiceModal");
  const taskChoiceBackdrop = document.getElementById("taskChoiceBackdrop");
  const taskChoicePatientName = document.getElementById("taskChoicePatientName");
  const taskChoicePatientAlias = document.getElementById("taskChoicePatientAlias");
  const taskChoiceSessionValue = document.getElementById("taskChoiceSessionValue");
  const taskChoicePaymentFrequency = document.getElementById("taskChoicePaymentFrequency");
  const taskChoiceDueDay = document.getElementById("taskChoiceDueDay");
  const taskChoiceContractStatus = document.getElementById("taskChoiceContractStatus");
  const taskChoiceContractNotes = document.getElementById("taskChoiceContractNotes");
  const taskChoiceMessage = document.getElementById("taskChoiceMessage");
  const btnCloseTaskChoice = document.getElementById("btnCloseTaskChoice");
  const btnCancelTaskChoice = document.getElementById("btnCancelTaskChoice");
  const btnSaveTaskChoice = document.getElementById("btnSaveTaskChoice");
  const inviteModal = document.getElementById("inviteModal");
  const inviteModalBackdrop = document.getElementById("inviteModalBackdrop");
  const invitePatientName = document.getElementById("invitePatientName");
  const invitePatientWhatsapp = document.getElementById("invitePatientWhatsapp");
  const inviteModalMessage = document.getElementById("inviteModalMessage");
  const btnCloseInviteModal = document.getElementById("btnCloseInviteModal");
  const btnCancelInviteModal = document.getElementById("btnCancelInviteModal");
  const btnSubmitInviteModal = document.getElementById("btnSubmitInviteModal");
  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");

  let currentUser = null;
  let currentProfile = null;
  let currentProfessionalName = "seu psicólogo(a)";
  let patients = [];
  let awaitingEmailPatients = [];
  let pendingInvitePatients = [];
  let canceledInvitePatients = [];
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

  function formatarWhatsapp(value) {
    const digits = normalizarWhatsapp(value).slice(0, 13);

    if (!digits) return "Não informado";
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    if (digits.length <= 11) {
      return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
    }

    return `+${digits.slice(0, 2)} (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }

  function normalizarWhatsapp(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function gerarTokenConvite() {
    if (window.crypto?.randomUUID) {
      return window.crypto.randomUUID();
    }

    return `conv-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function montarLinkConvite(token) {
    return `${window.location.origin}/?convite=${encodeURIComponent(token)}`;
  }

  function montarMensagemWhatsapp(nomePaciente, link) {
    return (
      `Olá, ${nomePaciente}! ` +
      `Seu psicólogo(a) ${currentProfessionalName} enviou um convite para acessar o PsicoTarefas.\n\n` +
      `Use este link para entrar no sistema:\n${link}`
    );
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
    if (taskChoicePatientAlias) taskChoicePatientAlias.value = "";
    if (taskChoiceSessionValue) taskChoiceSessionValue.value = "";
    if (taskChoicePaymentFrequency) taskChoicePaymentFrequency.value = "";
    if (taskChoiceDueDay) taskChoiceDueDay.value = "";
    if (taskChoiceContractStatus) taskChoiceContractStatus.value = "";
    if (taskChoiceContractNotes) taskChoiceContractNotes.value = "";
    setTaskChoiceMessage();
  }

  async function carregarDadosContrato(vinculoId) {
    if (!vinculoId) return {};

    const { data, error } = await supabase
      .from("vinculos")
      .select("valor_sessao, periodicidade_pagamento, dia_vencimento, status_contrato, observacoes_contrato")
      .eq("id", vinculoId)
      .eq("professional_user_id", currentUser.id)
      .single();

    if (error) {
      throw new Error(`Não foi possível carregar os dados do contrato: ${error.message}`);
    }

    return data || {};
  }

  async function abrirMensagemPaciente(patient) {
    if (!taskChoiceModal || !taskChoicePatientName || !taskChoicePatientAlias) return;
    selectedPatient = patient;
    taskChoicePatientName.textContent = patient.nome_real || "-";
    taskChoicePatientAlias.value = patient.alias || "";
    setTaskChoiceMessage();
    taskChoiceModal.hidden = false;

    try {
      const contrato = await carregarDadosContrato(patient.vinculo_id);

      if (taskChoiceSessionValue) {
        taskChoiceSessionValue.value =
          contrato.valor_sessao === null || contrato.valor_sessao === undefined
            ? ""
            : Number(contrato.valor_sessao).toFixed(2);
      }
      if (taskChoicePaymentFrequency) {
        taskChoicePaymentFrequency.value = contrato.periodicidade_pagamento || "";
      }
      if (taskChoiceDueDay) {
        taskChoiceDueDay.value =
          contrato.dia_vencimento === null || contrato.dia_vencimento === undefined
            ? ""
            : String(contrato.dia_vencimento);
      }
      if (taskChoiceContractStatus) {
        taskChoiceContractStatus.value = contrato.status_contrato || "";
      }
      if (taskChoiceContractNotes) {
        taskChoiceContractNotes.value = contrato.observacoes_contrato || "";
      }
    } catch (error) {
      setTaskChoiceMessage(error.message || "Erro ao carregar dados do contrato.", "error");
    }

    setTaskChoiceMessage();
    window.setTimeout(() => {
      taskChoicePatientAlias.focus();
      taskChoicePatientAlias.select();
    }, 60);
  }

  function setInviteModalMessage(text = "", type = "error") {
    if (!inviteModalMessage) return;

    if (!text) {
      inviteModalMessage.hidden = true;
      inviteModalMessage.textContent = "";
      inviteModalMessage.className = "screen-message";
      return;
    }

    inviteModalMessage.hidden = false;
    inviteModalMessage.textContent = text;
    inviteModalMessage.className = `screen-message screen-message--${type}`;
  }

  function fecharModalConvite() {
    if (!inviteModal) return;
    inviteModal.hidden = true;
    setInviteModalMessage();

    if (invitePatientName) invitePatientName.value = "";
    if (invitePatientWhatsapp) invitePatientWhatsapp.value = "";
  }

  function abrirModalConvite() {
    if (!inviteModal || !invitePatientName) return;
    setInviteModalMessage();
    inviteModal.hidden = false;
    window.setTimeout(() => {
      invitePatientName.focus();
    }, 60);
  }

  async function salvarApelidoPaciente() {
    if (!selectedPatient || !taskChoicePatientAlias || !btnSaveTaskChoice) return;

    const alias = taskChoicePatientAlias.value.trim();
    const valorSessaoRaw = taskChoiceSessionValue?.value.trim() || "";
    const periodicidadePagamento = taskChoicePaymentFrequency?.value || "";
    const diaVencimentoRaw = taskChoiceDueDay?.value.trim() || "";
    const observacoesContrato = taskChoiceContractNotes?.value.trim() || "";
    const statusContrato = taskChoiceContractStatus?.value || "";

    if (!alias) {
      setTaskChoiceMessage("Digite um apelido válido para o paciente.", "error");
      return;
    }

    const valorSessao = valorSessaoRaw ? Number(valorSessaoRaw.replace(",", ".")) : null;
    if (valorSessaoRaw && (!Number.isFinite(valorSessao) || valorSessao < 0)) {
      setTaskChoiceMessage("Informe um valor de sessão válido.", "error");
      return;
    }

    const diaVencimento = diaVencimentoRaw ? Number.parseInt(diaVencimentoRaw, 10) : null;
    if (diaVencimentoRaw && (!Number.isFinite(diaVencimento) || diaVencimento < 1 || diaVencimento > 31)) {
      setTaskChoiceMessage("Informe um dia de vencimento entre 1 e 31.", "error");
      return;
    }

    btnSaveTaskChoice.disabled = true;
    btnSaveTaskChoice.textContent = "Gravando...";
    setTaskChoiceMessage();

    try {
      const { error } = await supabase
        .from("vinculos")
        .update({
          patient_alias: alias,
          valor_sessao: valorSessao,
          periodicidade_pagamento: periodicidadePagamento || null,
          dia_vencimento: diaVencimento,
          status_contrato: statusContrato || null,
          observacoes_contrato: observacoesContrato || null
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
        evento: "cadastro_paciente_atualizado",
        pagina: "cadastro_pacientes",
        contexto: {
          paciente_id: selectedPatient.patient_user_id,
          vinculo_id: selectedPatient.vinculo_id,
          possui_valor_sessao: valorSessao !== null,
          periodicidade_pagamento: periodicidadePagamento || null,
          dia_vencimento: diaVencimento,
          status_contrato: statusContrato || null
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

  async function criarEstruturaConvite({
    token,
    patientName,
    patientWhatsapp,
    inviteLink
  }) {
    const { error: erroCriarConvite } = await supabase.from("convites").insert({
      token,
      professional_user_id: currentUser.id,
      patient_name: patientName,
      patient_whatsapp: patientWhatsapp,
      invite_link: inviteLink,
      status: "pendente"
    });

    if (erroCriarConvite) {
      throw erroCriarConvite;
    }

    const { error: erroCriarVinculo } = await supabase.from("vinculos").insert({
      professional_user_id: currentUser.id,
      patient_user_id: null,
      token_convite: token,
      patient_name: patientName,
      patient_whatsapp: patientWhatsapp,
      patient_email: null,
      convite_created_at: new Date().toISOString(),
      respondeu_convite_at: null,
      confirmed_at: null,
      status: "pendente_convite"
    });

    if (erroCriarVinculo) {
      await supabase
        .from("convites")
        .delete()
        .eq("token", token)
        .eq("professional_user_id", currentUser.id);

      throw erroCriarVinculo;
    }
  }

  function abrirWhatsappConvite(numero, nomePaciente, link) {
    const digits = normalizarWhatsapp(numero);

    if (!digits) {
      throw new Error("Informe um WhatsApp válido para abrir o envio.");
    }

    const mensagem = encodeURIComponent(montarMensagemWhatsapp(nomePaciente, link));
    const url = `https://wa.me/${digits}?text=${mensagem}`;

    window.open(url, "_blank");
  }

  async function convidarPaciente() {
    if (!invitePatientName || !invitePatientWhatsapp || !btnSubmitInviteModal) return;

    const patientName = invitePatientName.value.trim();
    const patientWhatsapp = normalizarWhatsapp(invitePatientWhatsapp.value);

    if (!patientName) {
      setInviteModalMessage("Informe o nome do paciente.", "error");
      return;
    }

    if (patientWhatsapp.length < 10) {
      setInviteModalMessage("Informe um WhatsApp válido com DDD.", "error");
      return;
    }

    btnSubmitInviteModal.disabled = true;
    btnSubmitInviteModal.textContent = "Convidando...";
    setInviteModalMessage();

    const token = gerarTokenConvite();
    const inviteLink = montarLinkConvite(token);

    try {
      await criarEstruturaConvite({
        token,
        patientName,
        patientWhatsapp,
        inviteLink
      });

      await registrarEvento({
        evento: "convite_criado",
        pagina: "cadastro_pacientes",
        perfil: "profissional",
        userId: currentUser?.id || null,
        email: currentProfile?.email || currentUser?.email || null,
        contexto: {
          patient_name: patientName
        }
      });

      abrirWhatsappConvite(patientWhatsapp, patientName, inviteLink);

      await registrarEvento({
        evento: "whatsapp_convite_aberto",
        pagina: "cadastro_pacientes",
        perfil: "profissional",
        userId: currentUser?.id || null,
        email: currentProfile?.email || currentUser?.email || null,
        contexto: {
          origem: "cadastro_pacientes",
          patient_name: patientName
        }
      });

      fecharModalConvite();
      await carregarPacientesPorStatus();
      renderCompactSection(
        awaitingEmailList,
        awaitingEmailEmptyState,
        awaitingEmailPatients,
        "Nenhum paciente aguardando confirmação de e-mail."
      );
      renderCompactSection(
        pendingInviteList,
        pendingInviteEmptyState,
        pendingInvitePatients,
        "Nenhum paciente aguardando aceite de convite."
      );
      renderCompactSection(
        canceledInviteList,
        canceledInviteEmptyState,
        canceledInvitePatients,
        "Nenhum convite cancelado."
      );
    } catch (error) {
      console.error("Erro ao gerar convite:", error);
      setInviteModalMessage("Não foi possível gerar o convite.", "error");
    } finally {
      btnSubmitInviteModal.disabled = false;
      btnSubmitInviteModal.textContent = "CONVIDAR";
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
    currentProfessionalName =
      (perfil.nome || perfil.email || "")
        .trim()
        .split("@")[0]
        .trim() || "seu psicólogo(a)";

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

  async function carregarPacientesPorStatus() {
    if (!currentUser) return;

    const [{ data: convites, error: convitesError }, { data: vinculos, error: vinculosError }] =
      await Promise.all([
        supabase
          .from("convites")
          .select("id, token, patient_name, patient_whatsapp, status")
          .eq("professional_user_id", currentUser.id)
          .in("status", ["pendente", "respondido", "aceito", "cancelado"])
          .order("created_at", { ascending: false }),
        supabase
          .from("vinculos")
          .select("token_convite, status, patient_name, patient_email, patient_whatsapp, patient_alias")
          .eq("professional_user_id", currentUser.id)
      ]);

    if (convitesError) {
      throw new Error(`Falha ao carregar convites: ${convitesError.message}`);
    }

    if (vinculosError) {
      throw new Error(`Falha ao carregar vínculos: ${vinculosError.message}`);
    }

    const vinculosPorToken = new Map((vinculos || []).map((item) => [item.token_convite, item]));

    const convitesClassificados = (convites || []).map((convite) => {
      const vinculo = vinculosPorToken.get(convite.token) || null;
      const nome =
        vinculo?.patient_name?.trim() ||
        convite.patient_name?.trim() ||
        "Paciente";

      const email = vinculo?.patient_email?.trim() || "";
      const whatsapp = vinculo?.patient_whatsapp?.trim() || convite.patient_whatsapp?.trim() || "";

      let categoria = "pendente";

      if (convite.status === "cancelado") {
        categoria = "cancelado";
      } else if (
        vinculo?.status === "aguardando_confirmacao_email" ||
        convite.status === "respondido"
      ) {
        categoria = "aguardando_email";
      } else if (convite.status === "pendente" || vinculo?.status === "pendente_convite") {
        categoria = "pendente";
      } else {
        categoria = "ignorar";
      }

      return {
        nome,
        email,
        whatsapp,
        alias: vinculo?.patient_alias?.trim() || "",
        categoria
      };
    });

    awaitingEmailPatients = convitesClassificados.filter((item) => item.categoria === "aguardando_email");
    pendingInvitePatients = convitesClassificados.filter((item) => item.categoria === "pendente");
    canceledInvitePatients = convitesClassificados.filter((item) => item.categoria === "cancelado");
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

  function renderCompactSection(listEl, emptyEl, items, emptyText) {
    if (!listEl || !emptyEl) return;

    if (!items.length) {
      listEl.innerHTML = "";
      emptyEl.hidden = false;
      emptyEl.textContent = emptyText;
      return;
    }

    emptyEl.hidden = true;
    listEl.innerHTML = items
      .map((item) => {
        return `
          <article class="compact-patient-item">
            <strong class="compact-patient-item__name">${escapeHtml(item.nome)}</strong>
            <span class="compact-patient-item__meta">E-mail: ${escapeHtml(item.email || "Não informado")}</span>
            <span class="compact-patient-item__meta">WhatsApp: ${escapeHtml(formatarWhatsapp(item.whatsapp))}</span>
          </article>
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

      abrirMensagemPaciente(patient).catch((error) => {
        console.error("Erro ao abrir edição do paciente:", error);
        showScreenError(error.message || "Não foi possível abrir os dados do paciente.");
      });
    });
  }

  if (btnOpenInviteModal) {
    btnOpenInviteModal.addEventListener("click", abrirModalConvite);
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

  if (inviteModalBackdrop) {
    inviteModalBackdrop.addEventListener("click", fecharModalConvite);
  }

  if (btnCloseInviteModal) {
    btnCloseInviteModal.addEventListener("click", fecharModalConvite);
  }

  if (btnCancelInviteModal) {
    btnCancelInviteModal.addEventListener("click", fecharModalConvite);
  }

  if (btnSubmitInviteModal) {
    btnSubmitInviteModal.addEventListener("click", convidarPaciente);
  }

  if (invitePatientWhatsapp) {
    invitePatientWhatsapp.addEventListener("input", () => {
      invitePatientWhatsapp.value = formatarWhatsapp(invitePatientWhatsapp.value);
    });
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
      fecharModalConvite();
    }
  });

  async function iniciar() {
    hideScreenError();

    const ok = await validarProfissional();
    if (!ok) return;

    await carregarPacientes();
    await carregarPacientesPorStatus();
    renderPatients();
    renderCompactSection(
      awaitingEmailList,
      awaitingEmailEmptyState,
      awaitingEmailPatients,
      "Nenhum paciente aguardando confirmação de e-mail."
    );
    renderCompactSection(
      pendingInviteList,
      pendingInviteEmptyState,
      pendingInvitePatients,
      "Nenhum paciente aguardando aceite de convite."
    );
    renderCompactSection(
      canceledInviteList,
      canceledInviteEmptyState,
      canceledInvitePatients,
      "Nenhum convite cancelado."
    );
  }

  iniciar().catch((error) => {
    console.error("Erro na tela cadastro-pacientes:", error);
    showScreenError(error.message || "Erro ao carregar a seleção de pacientes.");
  });
});
