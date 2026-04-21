import supabase from "../../shared/supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  const professionalLine = document.getElementById("professionalLine");
  const patientsGrid = document.getElementById("patientsGrid");
  const patientsEmptyState = document.getElementById("patientsEmptyState");

  let currentUser = null;
  let currentProfile = null;
  let patients = [];

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function formatDateTime(value) {
    if (!value) return "-";

    return new Date(value).toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }

  async function validarProfissional() {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (!session?.user) {
      window.location.href = "../../auth/profissional-login/index.html";
      return false;
    }

    currentUser = session.user;

    const { data: perfil, error } = await supabase
      .from("perfis")
      .select("nome, email, perfil")
      .eq("user_id", currentUser.id)
      .single();

    if (error || !perfil || perfil.perfil !== "profissional") {
      await supabase.auth.signOut();
      window.location.href = "../../auth/profissional-login/index.html";
      return false;
    }

    currentProfile = perfil;
    return true;
  }

  function renderProfessionalName() {
    if (!professionalLine) return;

    const nome =
      currentProfile?.nome ||
      currentProfile?.email ||
      "Profissional";

    professionalLine.textContent = `PROFISSIONAL: ${nome}`;
  }

  async function carregarPacientes() {
    const { data: vinculos, error } = await supabase
      .from("vinculos")
      .select(
        "id, patient_user_id, patient_name, patient_alias, patient_email, created_at"
      )
      .eq("professional_user_id", currentUser.id)
      .eq("status", "ativo")
      .not("patient_user_id", "is", null)
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(
        `Não foi possível carregar os pacientes vinculados. ${error.message || ""}`.trim()
      );
    }

    patients = (vinculos || []).map((vinculo) => {
      const nomeReal =
        vinculo.patient_name ||
        vinculo.patient_email ||
        "Paciente";

      return {
        vinculo_id: vinculo.id,
        patient_user_id: vinculo.patient_user_id,
        alias: vinculo.patient_alias || nomeReal,
        nome_real: nomeReal,
        email: vinculo.patient_email || "",
        created_at: vinculo.created_at
      };
    });
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
          <article class="patient-card">
            <h4 class="patient-card__alias">${escapeHtml(patient.alias)}</h4>
            <p class="patient-card__name">${escapeHtml(patient.nome_real)}</p>
            <p class="patient-card__email">${escapeHtml(patient.email || "E-mail não informado")}</p>
            <div class="patient-card__meta">
              <span class="patient-meta-chip">Vínculo ativo</span>
              <span class="patient-meta-chip">Desde ${escapeHtml(formatDateTime(patient.created_at))}</span>
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function iniciar() {
    const ok = await validarProfissional();
    if (!ok) return;

    renderProfessionalName();
    await carregarPacientes();
    renderPatients();
  }

  iniciar().catch((error) => {
    console.error(error);
    window.alert(error.message || "Erro ao carregar a gestão de tarefas.");
  });
});

