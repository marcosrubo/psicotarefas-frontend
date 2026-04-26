import supabase from "../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const professionalEmail = document.getElementById("professionalEmail");
  const professionalName = document.getElementById("professionalName");
  const professionalCouncil = document.getElementById("professionalCouncil");
  const professionalPhone = document.getElementById("professionalPhone");
  const profileForm = document.getElementById("profileForm");
  const screenMessage = document.getElementById("screenMessage");
  const formMessage = document.getElementById("formMessage");
  const btnSaveProfile = document.getElementById("btnSaveProfile");
  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");

  let currentUser = null;
  let currentProfile = null;
  let registroFieldName = "registro_conselho";
  let telefoneFieldName = "telefone";

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

  function normalizarTelefone(value) {
    return String(value || "").replace(/\D/g, "");
  }

  function formatarTelefone(value) {
    const digits = normalizarTelefone(value).slice(0, 13);

    if (!digits) return "";
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
      .select("*")
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

    if ("numero_registro" in perfil && !("registro_conselho" in perfil)) {
      registroFieldName = "numero_registro";
    }

    if ("phone" in perfil && !("telefone" in perfil)) {
      telefoneFieldName = "phone";
    }

    await registrarAcessoPagina({
      pagina: "meus_dados_profissional",
      perfil: "profissional",
      userId: currentUser.id,
      email: perfil.email || currentUser.email || ""
    });

    return true;
  }

  function preencherFormulario() {
    if (!currentProfile) return;

    if (professionalEmail) {
      professionalEmail.value = currentProfile.email || currentUser?.email || "";
    }

    if (professionalName) {
      professionalName.value = currentProfile.nome || "";
    }

    if (professionalCouncil) {
      professionalCouncil.value =
        currentProfile[registroFieldName] ||
        currentProfile.registro_conselho ||
        currentProfile.numero_registro ||
        "";
    }

    if (professionalPhone) {
      professionalPhone.value = formatarTelefone(
        currentProfile[telefoneFieldName] ||
        currentProfile.telefone ||
        currentProfile.phone ||
        ""
      );
    }
  }

  async function sairDoSistema() {
    await registrarEvento({
      evento: "logout",
      pagina: "meus_dados_profissional",
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

  async function salvarPerfil(event) {
    event.preventDefault();

    if (!currentUser || !currentProfile) {
      setFormMessage("Sessão inválida. Entre novamente.", "error");
      return;
    }

    const nome = professionalName?.value.trim() || "";
    const registro = professionalCouncil?.value.trim() || null;
    const telefoneFormatado = professionalPhone?.value.trim() || "";
    const telefone = telefoneFormatado ? formatarTelefone(telefoneFormatado) : null;

    if (!nome) {
      setFormMessage("O nome é obrigatório.", "error");
      return;
    }

    if (btnSaveProfile) {
      btnSaveProfile.disabled = true;
      btnSaveProfile.textContent = "Gravando...";
    }

    setFormMessage();

    const payloadCompleto = {
      nome,
      [registroFieldName]: registro,
      [telefoneFieldName]: telefone
    };

    try {
      const { error } = await supabase
        .from("perfis")
        .update(payloadCompleto)
        .eq("user_id", currentUser.id);

      if (error) {
        throw error;
      }

      currentProfile.nome = nome;
      currentProfile[registroFieldName] = registro;
      currentProfile[telefoneFieldName] = telefone;

      await registrarEvento({
        userId: currentUser.id,
        email: currentProfile.email || currentUser.email || "",
        perfil: "profissional",
        evento: "perfil_profissional_atualizado",
        pagina: "meus_dados_profissional"
      });

      setFormMessage("Dados atualizados com sucesso.", "success");
    } catch (error) {
      const message = error?.message || "";
      const faltamColunas =
        /column .* does not exist|schema cache/i.test(message);

      if (!faltamColunas) {
        setFormMessage("Não foi possível atualizar os dados.", "error");
        console.error("Erro ao atualizar dados do profissional:", error);
        if (btnSaveProfile) {
          btnSaveProfile.disabled = false;
          btnSaveProfile.textContent = "Gravar";
        }
        return;
      }

      try {
        const { error: fallbackError } = await supabase
          .from("perfis")
          .update({ nome })
          .eq("user_id", currentUser.id);

        if (fallbackError) {
          throw fallbackError;
        }

        currentProfile.nome = nome;
        setFormMessage(
          "Nome salvo. Registro Conselho e Telefone dependem da criação dessas colunas na tabela perfis.",
          "success"
        );
      } catch (fallbackSaveError) {
        console.error("Erro no fallback de atualização do perfil:", fallbackSaveError);
        setFormMessage("Não foi possível atualizar os dados.", "error");
      }
    } finally {
      if (btnSaveProfile) {
        btnSaveProfile.disabled = false;
        btnSaveProfile.textContent = "Gravar";
      }
    }
  }

  if (professionalPhone) {
    professionalPhone.addEventListener("input", () => {
      professionalPhone.value = formatarTelefone(professionalPhone.value);
    });
  }

  if (profileForm) {
    profileForm.addEventListener("submit", salvarPerfil);
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

    const ok = await validarProfissional();
    if (!ok) return;

    preencherFormulario();
  }

  iniciar().catch((error) => {
    console.error("Erro na tela meus-dados:", error);
    setScreenMessage(error.message || "Não foi possível carregar os dados do profissional.");
  });
});
