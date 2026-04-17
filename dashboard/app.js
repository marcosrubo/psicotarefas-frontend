// ================================
// Detectar perfil pela URL
// ================================
const params = new URLSearchParams(window.location.search);

const perfil = params.get("perfil") || "profissional"; 
const estado = params.get("estado") || "vinculado"; 

// ================================
// Referências da tela
// ================================
const userName = document.getElementById("userName");
const userRole = document.getElementById("userRole");
const userAvatar = document.getElementById("userAvatar");

const welcomeCard = document.getElementById("welcomeCard");
const welcomeLabel = document.getElementById("welcomeLabel");
const welcomeTitle = document.getElementById("welcomeTitle");
const welcomeText = document.getElementById("welcomeText");
const welcomeIcon = document.getElementById("welcomeIcon");

const statsGrid = document.getElementById("statsGrid");
const quickActions = document.getElementById("quickActions");
const mainList = document.getElementById("mainList");
const secondaryList = document.getElementById("secondaryList");
const highlightBox = document.getElementById("highlightBox");

const brandBadge = document.getElementById("brandBadge");

// ================================
// Helpers
// ================================
function createStat(label, value, hint) {
  return `
    <div class="stat-card">
      <p class="stat-card__label">${label}</p>
      <p class="stat-card__value">${value}</p>
      <p class="stat-card__hint">${hint}</p>
    </div>
  `;
}

function createAction(icon, title, desc, tipo = "") {
  return `
    <div class="quick-action ${tipo}">
      <div class="quick-action__icon">${icon}</div>
      <div class="quick-action__content">
        <strong>${title}</strong>
        <span>${desc}</span>
      </div>
    </div>
  `;
}

function createItem(title, badge, desc, badgeClass = "badge-primary") {
  return `
    <div class="list-item">
      <div class="list-item__top">
        <p class="list-item__title">${title}</p>
        <span class="list-item__badge ${badgeClass}">${badge}</span>
      </div>
      <p class="list-item__description">${desc}</p>
    </div>
  `;
}

function createHighlight(title, desc) {
  return `
    <div class="highlight-box__card">
      <strong>${title}</strong>
      <p>${desc}</p>
    </div>
  `;
}

// ================================
// PERFIL PROFISSIONAL
// ================================
function renderProfissional() {
  brandBadge.textContent = "PROFISSIONAL";

  userName.textContent = "Dr. João";
  userRole.textContent = "Psicólogo";
  userAvatar.textContent = "DR";

  welcomeLabel.textContent = "Painel profissional";
  welcomeTitle.textContent = "Gerencie seus atendimentos";
  welcomeText.textContent =
    "Aqui você acompanha pacientes, atividades e sua agenda.";
  welcomeIcon.textContent = "📊";

  statsGrid.innerHTML = `
    ${createStat("Pacientes ativos", "24", "Em acompanhamento")}
    ${createStat("Sessões hoje", "6", "Agenda cheia")}
    ${createStat("Atividades enviadas", "12", "Este mês")}
    ${createStat("Pendências", "3", "Revisões necessárias")}
  `;

  quickActions.innerHTML = `
    ${createAction("👤", "Novo paciente", "Cadastrar paciente")}
    ${createAction("🧠", "Nova atividade", "Criar atividade")}
    ${createAction("📅", "Agenda", "Ver agenda")}
    ${createAction("📄", "Relatórios", "Acompanhar evolução")}
  `;

  mainList.innerHTML = `
    ${createItem("Paciente Maria", "Hoje", "Sessão às 14h")}
    ${createItem("Paciente João", "Amanhã", "Sessão às 10h")}
  `;

  secondaryList.innerHTML = `
    ${createItem("Atividade enviada", "Novo", "Para paciente Ana")}
    ${createItem("Sessão concluída", "OK", "Paciente Carlos")}
  `;

  highlightBox.innerHTML = `
    ${createHighlight("Plano Profissional", "Você está no plano básico")}
    ${createHighlight("Uso", "24 pacientes cadastrados")}
  `;
}

// ================================
// PACIENTE VINCULADO
// ================================
function renderPacienteVinculado() {
  brandBadge.textContent = "PACIENTE";

  userName.textContent = "Maria";
  userRole.textContent = "Paciente";
  userAvatar.textContent = "MA";

  welcomeCard.classList.add("welcome-card--patient");

  welcomeLabel.textContent = "Seu espaço";
  welcomeTitle.textContent = "Bem-vinda 🌿";
  welcomeText.textContent =
    "Aqui você acompanha suas atividades e evolução.";
  welcomeIcon.textContent = "💚";

  statsGrid.innerHTML = `
    ${createStat("Atividades", "5", "Para você")}
    ${createStat("Concluídas", "3", "Bom progresso")}
    ${createStat("Próxima sessão", "Hoje", "às 15h")}
    ${createStat("Mensagens", "2", "Não lidas")}
  `;

  quickActions.innerHTML = `
    ${createAction("🧠", "Minhas atividades", "Ver tarefas", "quick-action--patient")}
    ${createAction("💬", "Falar com psicólogo", "Enviar mensagem", "quick-action--patient")}
    ${createAction("📅", "Agenda", "Ver consultas", "quick-action--patient")}
  `;

  mainList.innerHTML = `
    ${createItem("Atividade emocional", "Novo", "Reflexão guiada", "badge-green")}
    ${createItem("Exercício diário", "Hoje", "Registro emocional", "badge-green")}
  `;

  secondaryList.innerHTML = `
    ${createItem("Mensagem recebida", "Novo", "Seu psicólogo respondeu", "badge-green")}
  `;

  highlightBox.classList.add("highlight-box--patient");
  highlightBox.innerHTML = `
    ${createHighlight("Seu acompanhamento", "Você está em progresso contínuo 💚")}
  `;
}

// ================================
// PACIENTE SEM VÍNCULO
// ================================
function renderPacienteOrfao() {
  brandBadge.textContent = "PACIENTE";

  userName.textContent = "Visitante";
  userRole.textContent = "Sem vínculo";
  userAvatar.textContent = "PV";

  welcomeCard.classList.add("welcome-card--orphan");

  welcomeLabel.textContent = "Bem-vindo";
  welcomeTitle.textContent = "Vamos começar?";
  welcomeText.textContent =
    "Você ainda não está vinculado a um psicólogo.";
  welcomeIcon.textContent = "🌱";

  statsGrid.innerHTML = `
    ${createStat("Perfil", "Criado", "Falta vincular")}
    ${createStat("Atividades", "0", "Nenhuma ainda")}
    ${createStat("Sessões", "-", "Sem agenda")}
    ${createStat("Mensagens", "0", "Sem mensagens")}
  `;

  quickActions.innerHTML = `
    ${createAction("🔎", "Buscar psicólogo", "Encontrar profissional", "quick-action--orphan")}
    ${createAction("📨", "Solicitar vínculo", "Enviar pedido", "quick-action--orphan")}
  `;

  mainList.innerHTML = `
    ${createItem("Comece agora", "Dica", "Busque um profissional", "badge-orange")}
  `;

  secondaryList.innerHTML = `
    ${createItem("Dica", "Importante", "Vincule-se para usar o sistema", "badge-orange")}
  `;

  highlightBox.classList.add("highlight-box--orphan");
  highlightBox.innerHTML = `
    ${createHighlight("Próximo passo", "Escolher um psicólogo")}
  `;
}

// ================================
// Inicialização
// ================================
if (perfil === "profissional") {
  renderProfissional();
} else {
  if (estado === "sem_vinculo") {
    renderPacienteOrfao();
  } else {
    renderPacienteVinculado();
  }
}

