import supabase from "../../shared/supabase.js";

document.addEventListener("DOMContentLoaded", () => {
  const professionalLine = document.getElementById("professionalLine");
  const statThemes = document.getElementById("statThemes");
  const statTasks = document.getElementById("statTasks");
  const statPdfs = document.getElementById("statPdfs");

  const btnToggleThemeForm = document.getElementById("btnToggleThemeForm");
  const btnToggleLibraryTaskForm = document.getElementById("btnToggleLibraryTaskForm");
  const btnCloseThemeForm = document.getElementById("btnCloseThemeForm");
  const btnCloseLibraryTaskForm = document.getElementById("btnCloseLibraryTaskForm");

  const themeFormPanel = document.getElementById("themeFormPanel");
  const libraryTaskFormPanel = document.getElementById("libraryTaskFormPanel");

  const themesList = document.getElementById("themesList");
  const libraryList = document.getElementById("libraryList");
  const libraryPanelTitle = document.getElementById("libraryPanelTitle");
  const libraryPanelSubtitle = document.getElementById("libraryPanelSubtitle");
  const libraryTaskTheme = document.getElementById("libraryTaskTheme");

  let currentUser = null;
  let currentProfile = null;
  let selectedThemeId = "ansiedade";

  const mockThemes = [
    {
      id: "ansiedade",
      nome: "Ansiedade",
      descricao: "Atividades de observação, regulação e compreensão de sinais ansiosos.",
      total: 4
    },
    {
      id: "medo",
      nome: "Medo",
      descricao: "Tarefas de reconhecimento de gatilhos, proteção e segurança emocional.",
      total: 3
    },
    {
      id: "depressao",
      nome: "Depressão",
      descricao: "Atividades voltadas a rotina, auto-observação e pequenos movimentos possíveis.",
      total: 5
    },
    {
      id: "autoestima",
      nome: "Autoestima",
      descricao: "Materiais para percepção de valor pessoal, autocompaixão e identidade.",
      total: 2
    }
  ];

  const mockLibraryTasks = [
    {
      id: "ans-1",
      temaId: "ansiedade",
      titulo: "Atividade 1 - Percebendo os sinais da ansiedade",
      descricao:
        "PDF introdutório para observar corpo, pensamentos e momentos em que a ansiedade se intensifica.",
      status: "Publicada",
      pdfNome: "ansiedade-sinais.pdf",
      autor: "Marcella Passarin"
    },
    {
      id: "ans-2",
      temaId: "ansiedade",
      titulo: "Atividade 2 - Gatilhos do dia a dia",
      descricao:
        "Tarefa com foco em gatilhos cotidianos, contexto e devolutiva para a próxima sessão.",
      status: "Publicada",
      pdfNome: "ansiedade-gatilhos.pdf",
      autor: "Marcella Passarin"
    },
    {
      id: "med-1",
      temaId: "medo",
      titulo: "Atividade 1 - Medos específicos e respostas do corpo",
      descricao:
        "Material estruturado para observar situações de medo e diferenciar ameaça real de antecipação.",
      status: "Oculta",
      pdfNome: "medo-corpo.pdf",
      autor: "Marcella Passarin"
    },
    {
      id: "dep-1",
      temaId: "depressao",
      titulo: "Atividade 1 - Pequenas ações possíveis",
      descricao:
        "PDF com proposta de auto-observação e identificação de pequenas ações viáveis ao longo da semana.",
      status: "Publicada",
      pdfNome: "depressao-acoes.pdf",
      autor: "Marcella Passarin"
    },
    {
      id: "aut-1",
      temaId: "autoestima",
      titulo: "Atividade 1 - O que em mim merece ser visto",
      descricao:
        "Tarefa reflexiva para mapear qualidades, narrativas internas e espaços de validação pessoal.",
      status: "Arquivada",
      pdfNome: "autoestima-validacao.pdf",
      autor: "Marcella Passarin"
    }
  ];

  function esperar(ms) {
    return new Promise((resolve) => window.setTimeout(resolve, ms));
  }

  async function obterUsuarioAutenticado() {
    for (let tentativa = 0; tentativa < 2; tentativa += 1) {
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

      if (tentativa === 0) {
        await esperar(180);
      }
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
      await supabase.auth.signOut();
      window.location.href = "../../auth/profissional-login/index.html";
      return false;
    }

    currentProfile = perfil;
    return true;
  }

  function renderProfessionalName() {
    if (!professionalLine) return;
    const nome = currentProfile?.nome || currentProfile?.email || "Profissional";
    professionalLine.textContent = `PROFISSIONAL: ${nome}`;
  }

  function renderStats() {
    if (statThemes) statThemes.textContent = String(mockThemes.length);
    if (statTasks) statTasks.textContent = String(mockLibraryTasks.length);
    if (statPdfs) statPdfs.textContent = String(mockLibraryTasks.length);
  }

  function renderThemeOptions() {
    if (!libraryTaskTheme) return;

    libraryTaskTheme.innerHTML = mockThemes
      .map(
        (theme) => `<option value="${theme.id}" ${theme.id === selectedThemeId ? "selected" : ""}>${theme.nome}</option>`
      )
      .join("");
  }

  function renderThemes() {
    if (!themesList) return;

    themesList.innerHTML = mockThemes
      .map((theme) => {
        const activeClass = theme.id === selectedThemeId ? "is-active" : "";
        return `
          <article class="theme-card ${activeClass}" data-theme-id="${theme.id}">
            <div class="theme-card__top">
              <h4>${theme.nome}</h4>
              <span class="meta-chip">${theme.total} tarefa(s)</span>
            </div>
            <p>${theme.descricao}</p>
            <div class="theme-meta">
              <span class="meta-chip meta-chip--muted">Tema público</span>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderLibraryList() {
    if (!libraryList) return;

    const selectedTheme = mockThemes.find((theme) => theme.id === selectedThemeId);
    const filteredTasks = mockLibraryTasks.filter((task) => task.temaId === selectedThemeId);

    if (libraryPanelTitle && selectedTheme) {
      libraryPanelTitle.textContent = `Tarefas do tema: ${selectedTheme.nome}`;
    }

    if (libraryPanelSubtitle) {
      libraryPanelSubtitle.textContent =
        "Visualize atividades públicas em PDF organizadas por tema e prepare o próximo passo do fluxo.";
    }

    libraryList.innerHTML = filteredTasks
      .map(
        (task) => `
          <article class="library-card">
            <div class="library-card__top">
              <h4>${task.titulo}</h4>
              <span class="meta-chip">${task.status}</span>
            </div>
            <p>${task.descricao}</p>
            <div class="library-meta">
              <span class="meta-chip meta-chip--muted">${task.pdfNome}</span>
              <span class="meta-chip meta-chip--muted">Autor: ${task.autor}</span>
            </div>
          </article>
        `
      )
      .join("");
  }

  function openThemeForm() {
    if (themeFormPanel) themeFormPanel.hidden = false;
  }

  function closeThemeForm() {
    if (themeFormPanel) themeFormPanel.hidden = true;
  }

  function openLibraryTaskForm() {
    if (libraryTaskFormPanel) libraryTaskFormPanel.hidden = false;
  }

  function closeLibraryTaskForm() {
    if (libraryTaskFormPanel) libraryTaskFormPanel.hidden = true;
  }

  function renderAll() {
    renderProfessionalName();
    renderStats();
    renderThemeOptions();
    renderThemes();
    renderLibraryList();
  }

  if (btnToggleThemeForm) {
    btnToggleThemeForm.addEventListener("click", openThemeForm);
  }

  if (btnToggleLibraryTaskForm) {
    btnToggleLibraryTaskForm.addEventListener("click", openLibraryTaskForm);
  }

  if (btnCloseThemeForm) {
    btnCloseThemeForm.addEventListener("click", closeThemeForm);
  }

  if (btnCloseLibraryTaskForm) {
    btnCloseLibraryTaskForm.addEventListener("click", closeLibraryTaskForm);
  }

  if (themesList) {
    themesList.addEventListener("click", (event) => {
      const card = event.target.closest("[data-theme-id]");
      if (!card) return;
      selectedThemeId = card.getAttribute("data-theme-id");
      renderAll();
    });
  }

  validarProfissional()
    .then((ok) => {
      if (!ok) return;
      renderAll();
    })
    .catch((error) => {
      console.error(error);
      alert(error.message || "Não foi possível carregar o Banco de Tarefas.");
    });
});
