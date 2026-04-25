import supabase from "../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const userName = document.getElementById("userName");
  const userRole = document.getElementById("userRole");
  const userAvatar = document.getElementById("userAvatar");
  const btnEditName = document.getElementById("btnEditName");
  const editNameBox = document.getElementById("editNameBox");
  const editNameInput = document.getElementById("editNameInput");
  const btnCancelName = document.getElementById("btnCancelName");
  const btnSaveName = document.getElementById("btnSaveName");
  const welcomeTitle = document.getElementById("welcomeTitle");
  const welcomeText = document.getElementById("welcomeText");

  const searchProfessional = document.getElementById("searchProfessional");
  const professionalsList = document.getElementById("professionalsList");
  const professionalsEmpty = document.getElementById("professionalsEmpty");
  const requestMessage = document.getElementById("requestMessage");

  const btnBack = document.getElementById("btnBack");

  let currentUser = null;
  let currentPatientProfile = null;
  let professionals = [];
  let vinculosMap = new Map();

  function aplicarNomePacienteNaTela(nome, email) {
    const nomeBase = limparNome(nome || email || "");
    const nomeExibicao = nomeBase || "Paciente";
    const primeiroNome = obterPrimeiroNome(nome || email || "");

    userName.textContent = nomeExibicao;
    userRole.textContent = "Sem vínculo ativo";
    userAvatar.textContent = obterIniciais(nomeExibicao);

    welcomeTitle.textContent = `Olá, ${primeiroNome}`;
    welcomeText.textContent =
      "Você ainda não possui vínculo ativo. Escolha um profissional abaixo para pedir vínculo.";
  }

  function mostrarMensagem(texto, tipo = "success") {
    if (!requestMessage) return;
    requestMessage.hidden = false;
    requestMessage.textContent = texto;
    requestMessage.className = `form-message form-message--${tipo}`;
  }

  function esconderMensagem() {
    if (!requestMessage) return;
    requestMessage.hidden = true;
    requestMessage.textContent = "";
    requestMessage.className = "form-message";
  }

  function abrirEdicaoNome() {
    if (!editNameBox || !editNameInput || !currentPatientProfile) return;

    editNameInput.value = currentPatientProfile.nome || "";
    editNameBox.hidden = false;
    editNameInput.focus();
    editNameInput.select();
  }

  function fecharEdicaoNome() {
    if (!editNameBox || !editNameInput) return;

    editNameBox.hidden = true;
    editNameInput.value = "";
  }

  function obterIniciais(nome) {
    if (!nome) return "PT";

    return nome
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((parte) => parte[0].toUpperCase())
      .join("");
  }

  function limparNome(valor) {
    const texto = (valor || "").trim();

    if (!texto) return "";

    if (texto.includes("@")) {
      const antesDoArroba = texto.split("@")[0].trim();
      return antesDoArroba || "";
    }

    return texto;
  }

  function obterPrimeiroNome(nomeCompleto) {
    const nomeLimpo = limparNome(nomeCompleto);
    if (!nomeLimpo) return "Paciente";
    return nomeLimpo.split(" ")[0];
  }

  async function pacienteTemVinculoAtivo(userId) {
    const { data, error } = await supabase
      .from("vinculos")
      .select("id")
      .eq("patient_user_id", userId)
      .eq("status", "ativo")
      .limit(1);

    if (error) {
      return false;
    }

    return Array.isArray(data) && data.length > 0;
  }

  async function redirecionarPorPerfil(userId, perfil) {
    if (perfil === "profissional") {
      window.location.href = "../../dashboard/profissional/index.html";
      return;
    }

    if (perfil === "paciente") {
      const temVinculo = await pacienteTemVinculoAtivo(userId);
      window.location.href = temVinculo
        ? "../../dashboard/paciente-com-vinculo/index.html"
        : "../../dashboard/paciente-sem-vinculo/index.html";
      return;
    }

    window.location.href = "../../auth/index.html?perfil=paciente";
  }

  function normalizarTexto(valor) {
    return (valor || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function obterTextoBotao(status) {
    if (status === "pendente") return "Solicitação enviada";
    if (status === "ativo") return "Vínculo ativo";
    if (status === "encerrado") return "Solicitar novamente";
    return "Pedir vínculo";
  }

  function botaoDesabilitado(status) {
    return status === "pendente" || status === "ativo";
  }

  function renderProfessionalCard(profissional) {
    const statusVinculo = vinculosMap.get(profissional.user_id) || null;
    const nomeBase = limparNome(profissional.nome || profissional.email || "");
    const nomeExibicao = nomeBase || "Profissional";
    const textoBotao = obterTextoBotao(statusVinculo);
    const disabled = botaoDesabilitado(statusVinculo);

    return `
      <article class="professional-card">
        <div class="professional-card__avatar">
          ${obterIniciais(nomeExibicao)}
        </div>

        <div class="professional-card__content">
          <strong>${nomeExibicao}</strong>
          <span>Psicólogo(a)</span>
          <p>${profissional.email || ""}</p>
        </div>

        <div class="professional-card__actions">
          <button
            class="btn-primary professional-card__button"
            type="button"
            data-professional-id="${profissional.user_id}"
            ${disabled ? "disabled" : ""}
          >
            ${textoBotao}
          </button>
        </div>
      </article>
    `;
  }

  function renderProfessionals() {
    const termo = normalizarTexto(searchProfessional.value);

    const filtrados = professionals.filter((profissional) => {
      const nome = normalizarTexto(profissional.nome || "");
      const email = normalizarTexto(profissional.email || "");
      return nome.includes(termo) || email.includes(termo);
    });

    if (filtrados.length === 0) {
      professionalsList.innerHTML = "";
      professionalsEmpty.hidden = false;
      return;
    }

    professionalsEmpty.hidden = true;
    professionalsList.innerHTML = filtrados.map(renderProfessionalCard).join("");
  }

  async function carregarPaciente() {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href = "../../auth/index.html?perfil=paciente";
      return false;
    }

    currentUser = session.user;

    const { data: perfil, error } = await supabase
      .from("perfis")
      .select("nome, email, perfil")
      .eq("user_id", currentUser.id)
      .single();

    if (error || !perfil) {
      window.location.href = "../../auth/index.html?perfil=paciente";
      return false;
    }

    if (perfil.perfil !== "paciente") {
      await redirecionarPorPerfil(currentUser.id, perfil.perfil);
      return false;
    }

    currentPatientProfile = perfil;
    aplicarNomePacienteNaTela(perfil.nome, perfil.email);
    await registrarAcessoPagina({
      pagina: "dashboard_paciente_sem_vinculo",
      perfil: "paciente",
      userId: currentUser.id,
      email: perfil.email || currentUser.email || null
    });

    return true;
  }

  async function atualizarNomePaciente() {
    if (!currentUser || !currentPatientProfile) {
      mostrarMensagem("Sessão inválida. Entre novamente.", "error");
      return;
    }

    const novoNome = editNameInput?.value.trim() || "";

    if (!novoNome) {
      mostrarMensagem("Informe um nome válido.", "error");
      return;
    }

    if (btnSaveName) {
      btnSaveName.disabled = true;
      btnSaveName.textContent = "Salvando...";
    }

    try {
      const { error } = await supabase
        .from("perfis")
        .update({ nome: novoNome })
        .eq("user_id", currentUser.id);

      if (error) {
        throw new Error("Não foi possível atualizar seu nome.");
      }

      currentPatientProfile = {
        ...currentPatientProfile,
        nome: novoNome
      };

      aplicarNomePacienteNaTela(novoNome, currentPatientProfile.email);
      fecharEdicaoNome();
      mostrarMensagem("Nome atualizado com sucesso.", "success");
    } catch (error) {
      mostrarMensagem(error.message || "Erro ao atualizar nome.", "error");
    } finally {
      if (btnSaveName) {
        btnSaveName.disabled = false;
        btnSaveName.textContent = "Salvar";
      }
    }
  }

  async function verificarSeJaTemVinculoAtivo() {
    const { data, error } = await supabase
      .from("vinculos")
      .select("id")
      .eq("patient_user_id", currentUser.id)
      .eq("status", "ativo")
      .limit(1);

    if (error) {
      throw new Error("Não foi possível verificar o vínculo atual.");
    }

    const temVinculoAtivo = Array.isArray(data) && data.length > 0;

    if (temVinculoAtivo) {
      window.location.href = "../paciente-com-vinculo/index.html";
      return true;
    }

    return false;
  }

  async function carregarVinculosDoPaciente() {
    const { data, error } = await supabase
      .from("vinculos")
      .select("id, professional_user_id, status")
      .eq("patient_user_id", currentUser.id);

    if (error) {
      throw new Error("Não foi possível carregar os vínculos do paciente.");
    }

    vinculosMap = new Map();

    (data || []).forEach((item) => {
      vinculosMap.set(item.professional_user_id, item.status);
    });
  }

  async function carregarProfissionais() {
    const { data, error } = await supabase
      .from("perfis")
      .select("user_id, nome, email")
      .eq("perfil", "profissional")
      .order("nome", { ascending: true });

    if (error) {
      throw new Error("Não foi possível carregar os profissionais disponíveis.");
    }

    professionals = data || [];
    renderProfessionals();
  }

  async function solicitarVinculo(professionalUserId) {
    const statusAtual = vinculosMap.get(professionalUserId) || null;

    if (statusAtual === "pendente" || statusAtual === "ativo") {
      return;
    }

    if (statusAtual === "encerrado") {
      const { error } = await supabase
        .from("vinculos")
        .update({ status: "pendente" })
        .eq("patient_user_id", currentUser.id)
        .eq("professional_user_id", professionalUserId);

      if (error) {
        throw error;
      }

      vinculosMap.set(professionalUserId, "pendente");
      return;
    }

    const { error } = await supabase
      .from("vinculos")
      .insert({
        professional_user_id: professionalUserId,
        patient_user_id: currentUser.id,
        status: "pendente"
      });

    if (error) {
      throw error;
    }

    vinculosMap.set(professionalUserId, "pendente");
  }

  searchProfessional.addEventListener("input", () => {
    renderProfessionals();
  });

  professionalsList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-professional-id]");
    if (!button) return;

    const professionalUserId = button.getAttribute("data-professional-id");
    if (!professionalUserId) return;

    esconderMensagem();

    try {
      await solicitarVinculo(professionalUserId);
      await registrarEvento({
        evento: "solicitacao_vinculo_criada",
        pagina: "dashboard_paciente_sem_vinculo",
        perfil: "paciente",
        userId: currentUser.id,
        email: currentPatientProfile?.email || currentUser.email || null,
        contexto: {
          professional_user_id: professionalUserId
        }
      });
      mostrarMensagem("Solicitação de vínculo enviada com sucesso.", "success");
      renderProfessionals();
    } catch (error) {
      console.error("Erro ao solicitar vínculo:", error);
      mostrarMensagem("Não foi possível enviar a solicitação de vínculo.", "error");
    }
  });

  if (btnEditName) {
    btnEditName.addEventListener("click", abrirEdicaoNome);
  }

  if (btnCancelName) {
    btnCancelName.addEventListener("click", fecharEdicaoNome);
  }

  if (btnSaveName) {
    btnSaveName.addEventListener("click", atualizarNomePaciente);
  }

  if (editNameInput) {
    editNameInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        atualizarNomePaciente();
      }

      if (event.key === "Escape") {
        fecharEdicaoNome();
      }
    });
  }

  if (btnBack) {
    btnBack.addEventListener("click", async () => {
      await registrarEvento({
        evento: "logout",
        pagina: "dashboard_paciente_sem_vinculo",
        perfil: "paciente",
        userId: currentUser?.id || null,
        email: currentPatientProfile?.email || currentUser?.email || null
      });
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.error("Erro ao sair:", error);
      }

      window.location.href = "/";
    });
  }

  async function iniciarDashboard() {
    try {
      const ok = await carregarPaciente();
      if (!ok) return;

      const jaTemVinculo = await verificarSeJaTemVinculoAtivo();
      if (jaTemVinculo) return;

      await carregarVinculosDoPaciente();
      await carregarProfissionais();
    } catch (error) {
      console.error("Erro ao iniciar dashboard do paciente sem vínculo:", error);
      mostrarMensagem(
        error.message || "Não foi possível carregar os profissionais disponíveis.",
        "error"
      );
      professionalsList.innerHTML = "";
      professionalsEmpty.hidden = false;
    }
  }

  iniciarDashboard();
});
