import supabase from "../../../shared/supabase.js";
import { registrarAcessoPagina, registrarEvento } from "../../../shared/activity-log.js";

document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const patientId = (params.get("patient") || "").trim();
  const patientAliasFromUrl = (params.get("alias") || "Paciente").trim();
  const patientName = document.getElementById("patientName");
  const sessionDate = document.getElementById("sessionDate");
  const btnDictate = document.getElementById("btnDictate");
  const dictateButtonLabel = document.getElementById("dictateButtonLabel");
  const dictationStatus = document.getElementById("dictationStatus");
  const transcriptText = document.getElementById("transcriptText");
  const btnClearTranscript = document.getElementById("btnClearTranscript");
  const btnCopyTranscript = document.getElementById("btnCopyTranscript");
  const screenMessage = document.getElementById("screenMessage");
  const btnBottomMenu = document.getElementById("btnBottomMenu");
  const bottomMenuPanel = document.getElementById("bottomMenuPanel");
  const btnMenuLogout = document.getElementById("btnMenuLogout");

  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition || null;

  let currentUser = null;
  let currentProfile = null;
  let currentPatient = null;
  let recognition = null;
  let isRecording = false;
  let finalSegments = [];

  function todayIso() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function showScreenMessage(message, type = "error") {
    if (!screenMessage) return;
    screenMessage.hidden = false;
    screenMessage.textContent = message;
    screenMessage.className = `screen-message screen-message--${type}`;
  }

  function hideScreenMessage() {
    if (!screenMessage) return;
    screenMessage.hidden = true;
    screenMessage.textContent = "";
    screenMessage.className = "screen-message screen-message--error";
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

  async function sairDoSistema() {
    await registrarEvento({
      evento: "logout",
      pagina: "resumo_sessao_resumindo",
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
      pagina: "resumo_sessao_resumindo",
      perfil: "profissional",
      userId: currentUser.id,
      email: currentProfile.email || currentUser.email || "",
      contexto: {
        paciente_id: patientId || null
      }
    });

    return true;
  }

  async function validarPacienteSelecionado() {
    if (!patientId) {
      throw new Error("Paciente não informado para o resumo da sessão.");
    }

    const { data, error } = await supabase.rpc("listar_pacientes_vinculados_profissional");

    if (error) {
      throw new Error(`Falha ao validar paciente vinculado: ${error.message}`);
    }

    const patient = (data || []).find((item) => item.patient_user_id === patientId);

    if (!patient) {
      throw new Error("Este paciente não foi encontrado entre os seus vínculos ativos.");
    }

    const nomeCompleto =
      patient.patient_name?.trim() ||
      patient.patient_email?.trim() ||
      patientAliasFromUrl ||
      "Paciente";

    currentPatient = {
      vinculo_id: patient.vinculo_id,
      patient_user_id: patient.patient_user_id,
      alias: patient.patient_alias || nomeCompleto,
      nome_real: nomeCompleto,
      email: patient.patient_email || ""
    };

    if (patientName) {
      patientName.textContent = currentPatient.alias;
    }
  }

  function updateDictationText(interim = "") {
    const baseText = finalSegments.join(" ").trim();
    const interimText = interim.trim();
    const fullText = [baseText, interimText].filter(Boolean).join(" ");
    transcriptText.value = fullText;
  }

  function configureSpeechRecognition() {
    if (!btnDictate || !dictationStatus) return;

    if (!SpeechRecognition) {
      btnDictate.disabled = true;
      dictationStatus.textContent =
        "Este navegador não oferece ditado por voz nesta tela. Use Chrome/Edge no Android ou um navegador compatível.";
      return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onstart = () => {
      isRecording = true;
      btnDictate.classList.add("is-recording");
      dictateButtonLabel.textContent = "Parar ditado";
      dictationStatus.textContent = "Ouvindo... fale o resumo da sessão.";
    };

    recognition.onresult = (event) => {
      let interim = "";

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const transcript = event.results[index][0]?.transcript || "";

        if (event.results[index].isFinal) {
          const finalText = transcript.trim();
          if (finalText) {
            finalSegments.push(finalText);
          }
        } else {
          interim += transcript;
        }
      }

      updateDictationText(interim);
    };

    recognition.onerror = (event) => {
      const errorName = event.error || "erro desconhecido";
      dictationStatus.textContent = `Não foi possível continuar o ditado (${errorName}).`;
      stopDictation({ silent: true });
    };

    recognition.onend = () => {
      if (!isRecording) return;

      isRecording = false;
      btnDictate.classList.remove("is-recording");
      dictateButtonLabel.textContent = "Ditar resumo da sessão";
      dictationStatus.textContent = "Ditado encerrado. Revise o texto transcrito antes de usar.";

      registrarEvento({
        evento: "resumo_sessao_ditado_encerrado",
        pagina: "resumo_sessao_resumindo",
        perfil: "profissional",
        userId: currentUser?.id || null,
        email: currentProfile?.email || currentUser?.email || null,
        contexto: {
          paciente_id: currentPatient?.patient_user_id || patientId || null,
          vinculo_id: currentPatient?.vinculo_id || null,
          data_sessao: sessionDate?.value || null
        }
      });
    };
  }

  function startDictation() {
    if (!recognition || !transcriptText) return;

    hideScreenMessage();
    const currentText = transcriptText.value.trim();
    finalSegments = currentText ? [currentText] : [];

    try {
      recognition.start();
      registrarEvento({
        evento: "resumo_sessao_ditado_iniciado",
        pagina: "resumo_sessao_resumindo",
        perfil: "profissional",
        userId: currentUser?.id || null,
        email: currentProfile?.email || currentUser?.email || null,
        contexto: {
          paciente_id: currentPatient?.patient_user_id || patientId || null,
          vinculo_id: currentPatient?.vinculo_id || null,
          data_sessao: sessionDate?.value || null
        }
      });
    } catch (error) {
      console.error("Erro ao iniciar ditado:", error);
      showScreenMessage("Não foi possível iniciar o ditado. Verifique a permissão do microfone.");
    }
  }

  function stopDictation({ silent = false } = {}) {
    if (!recognition) return;

    try {
      recognition.stop();
    } catch (error) {
      if (!silent) {
        console.error("Erro ao parar ditado:", error);
      }
    }

    isRecording = false;
    btnDictate?.classList.remove("is-recording");
    if (dictateButtonLabel) {
      dictateButtonLabel.textContent = "Ditar resumo da sessão";
    }
  }

  if (btnDictate) {
    btnDictate.addEventListener("click", () => {
      if (isRecording) {
        stopDictation();
        if (dictationStatus) {
          dictationStatus.textContent = "Ditado encerrado. Revise o texto transcrito antes de usar.";
        }
        return;
      }

      startDictation();
    });
  }

  if (btnClearTranscript) {
    btnClearTranscript.addEventListener("click", () => {
      finalSegments = [];
      if (transcriptText) {
        transcriptText.value = "";
      }
      hideScreenMessage();
      if (dictationStatus) {
        dictationStatus.textContent = "Texto limpo. Toque no botão para ditar novamente.";
      }
    });
  }

  if (btnCopyTranscript) {
    btnCopyTranscript.addEventListener("click", async () => {
      const value = transcriptText?.value.trim() || "";

      if (!value) {
        showScreenMessage("Ainda não há texto transcrito para copiar.");
        return;
      }

      const header = [
        `Data da sessão: ${sessionDate?.value || ""}`,
        `Paciente: ${currentPatient?.alias || patientAliasFromUrl || "Paciente"}`,
        ""
      ].join("\n");

      try {
        await navigator.clipboard.writeText(`${header}${value}`);
        showScreenMessage("Texto copiado para a área de transferência.", "success");
      } catch (error) {
        console.error("Erro ao copiar texto:", error);
        transcriptText.focus();
        transcriptText.select();
        showScreenMessage("Não consegui copiar automaticamente. O texto foi selecionado para copiar manualmente.");
      }
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
      if (isRecording) {
        stopDictation();
      }
    }
  });

  async function iniciar() {
    hideScreenMessage();

    if (patientName) {
      patientName.textContent = patientAliasFromUrl || "Paciente";
    }

    if (sessionDate) {
      sessionDate.value = todayIso();
    }

    const ok = await validarProfissional();
    if (!ok) return;

    await validarPacienteSelecionado();
    configureSpeechRecognition();
  }

  iniciar().catch((error) => {
    console.error("Erro na tela resumindo:", error);
    showScreenMessage(error.message || "Erro ao preparar o resumo da sessão.");
    if (btnDictate) {
      btnDictate.disabled = true;
    }
  });
});
