import supabase from "../../shared/supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  const userName = document.getElementById("userName");
  const userRole = document.getElementById("userRole");
  const userAvatar = document.getElementById("userAvatar");
  const welcomeTitle = document.getElementById("welcomeTitle");
  const welcomeText = document.getElementById("welcomeText");

  const professionalCard = document.getElementById("professionalCard");
  const professionalEmpty = document.getElementById("professionalEmpty");
  const professionalAvatar = document.getElementById("professionalAvatar");
  const professionalName = document.getElementById("professionalName");
  const professionalRole = document.getElementById("professionalRole");
  const professionalEmail = document.getElementById("professionalEmail");
  const vinculoInfo = document.getElementById("vinculoInfo");

  const btnLogout = document.getElementById("btnLogout");

  let currentUser = null;

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

  function formatarData(dataIso) {
    return new Date(dataIso).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
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
      await supabase.auth.signOut();
      window.location.href = "../../auth/index.html?perfil=paciente";
      return false;
    }

    if (perfil.perfil !== "paciente") {
      await supabase.auth.signOut();
      window.location.href = "../../auth/index.html?perfil=paciente";
      return false;
    }

    const nomeBase = limparNome(perfil.nome || perfil.email || "");
    const nomeExibicao = nomeBase || "Paciente";
    const primeiroNome = obterPrimeiroNome(perfil.nome || perfil.email || "");

    userName.textContent = nomeExibicao;
    userRole.textContent = "Paciente vinculado";
    userAvatar.textContent = obterIniciais(nomeExibicao);

    welcomeTitle.textContent = `Olá, ${primeiroNome}`;
    welcomeText.textContent =
      "Aqui você acompanha seu profissional e, em breve, poderá visualizar suas tarefas de forma simples.";

    return true;
  }

  async function carregarProfissionalVinculado() {
    if (!currentUser) return;

    const { data: vinculo, error: vinculoError } = await supabase
      .from("vinculos")
      .select("professional_user_id, status, created_at")
      .eq("patient_user_id", currentUser.id)
      .eq("status", "ativo")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (vinculoError || !vinculo) {
      professionalCard.hidden = true;
      professionalEmpty.hidden = false;
      return;
    }

    const { data: profissional, error: profissionalError } = await supabase
      .from("perfis")
      .select("nome, email")
      .eq("user_id", vinculo.professional_user_id)
      .single();

    if (profissionalError || !profissional) {
      professionalCard.hidden = true;
      professionalEmpty.hidden = false;
      return;
    }

    const nomeBase = limparNome(profissional.nome || profissional.email || "");
    const nomeExibicao = nomeBase || "Profissional";

    professionalAvatar.textContent = obterIniciais(nomeExibicao);
    professionalName.textContent = nomeExibicao;
    professionalRole.textContent = "Psicólogo(a)";
    professionalEmail.textContent = profissional.email || "";
    vinculoInfo.textContent = `Vínculo ativo desde ${formatarData(vinculo.created_at)}`;

    professionalEmpty.hidden = true;
    professionalCard.hidden = false;
  }

  btnLogout.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.location.href = "../../auth/index.html?perfil=paciente";
  });

  async function iniciarDashboard() {
    const ok = await carregarPaciente();
    if (!ok) return;

    await carregarProfissionalVinculado();
  }

  iniciarDashboard();
});