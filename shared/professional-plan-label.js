import supabase from "./supabase.js";

const PLAN_LABELS = {
  gratuito: "Gratuito",
  standard: "Standard",
  pro: "PRO"
};

function normalizarPlanoProfissional(plano) {
  const planoNormalizado = String(plano || "").trim().toLowerCase();
  return Object.prototype.hasOwnProperty.call(PLAN_LABELS, planoNormalizado)
    ? planoNormalizado
    : "gratuito";
}

function obterRotuloPlanoProfissional(plano) {
  return PLAN_LABELS[normalizarPlanoProfissional(plano)];
}

function obterLinksDePlanos() {
  return Array.from(
    document.querySelectorAll('a.support-link[aria-label="Abrir planos do PsicoTarefas"]')
  );
}

function obterElementoRotulo(link) {
  const marcado = link.querySelector("[data-plan-label]");

  if (marcado) {
    return marcado;
  }

  const spans = Array.from(link.querySelectorAll("span")).filter(
    (span) => !span.classList.contains("support-link__icon")
  );

  return spans[spans.length - 1] || null;
}

function aplicarRotuloPlano(plano) {
  const rotulo = obterRotuloPlanoProfissional(plano);

  obterLinksDePlanos().forEach((link) => {
    const rotuloElemento = obterElementoRotulo(link);
    if (!rotuloElemento) return;

    rotuloElemento.textContent = rotulo;
    rotuloElemento.dataset.planLabel = "true";
    link.setAttribute("title", `Plano atual: ${rotulo}`);
  });
}

async function obterPerfilAtual(userId) {
  const { data, error } = await supabase
    .from("perfis")
    .select("perfil, plano_profissional")
    .eq("user_id", userId)
    .single();

  if (error) {
    throw error;
  }

  return data || null;
}

async function obterPlanoDoProfissionalVinculado(patientUserId) {
  const { data: vinculo, error: vinculoError } = await supabase
    .from("vinculos")
    .select("professional_user_id, created_at")
    .eq("patient_user_id", patientUserId)
    .eq("status", "ativo")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (vinculoError || !vinculo?.professional_user_id) {
    return "gratuito";
  }

  const { data: profissional, error: profissionalError } = await supabase
    .from("perfis")
    .select("plano_profissional")
    .eq("user_id", vinculo.professional_user_id)
    .single();

  if (profissionalError) {
    return "gratuito";
  }

  return profissional?.plano_profissional || "gratuito";
}

async function obterPlanoAtual() {
  const {
    data: { session },
    error: sessionError
  } = await supabase.auth.getSession();

  if (sessionError || !session?.user?.id) {
    return null;
  }

  const perfil = await obterPerfilAtual(session.user.id);

  if (!perfil) {
    return "gratuito";
  }

  if (perfil.perfil === "profissional") {
    return perfil.plano_profissional || "gratuito";
  }

  if (perfil.perfil === "paciente") {
    return obterPlanoDoProfissionalVinculado(session.user.id);
  }

  return "gratuito";
}

document.addEventListener("DOMContentLoaded", async () => {
  if (!obterLinksDePlanos().length) return;

  try {
    const plano = await obterPlanoAtual();

    if (plano) {
      aplicarRotuloPlano(plano);
    }
  } catch (error) {
    console.error("Erro ao carregar o rótulo do plano:", error);
  }
});
