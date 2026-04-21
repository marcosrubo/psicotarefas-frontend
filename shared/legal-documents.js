const DOCUMENTOS_FIXOS = {
  termos_de_uso: {
    titulo: "Termos de Uso do PsicoTarefas",
    resumo:
      "Define as regras gerais de utilização da plataforma, seus limites, responsabilidades e condições de acesso."
  },
  politica_de_privacidade: {
    titulo: "Política de Privacidade do PsicoTarefas",
    resumo:
      "Explica como dados pessoais e dados sensíveis são tratados no contexto da plataforma."
  },
  termo_do_profissional: {
    titulo: "Termo do Profissional do PsicoTarefas",
    resumo:
      "Estabelece responsabilidades específicas do profissional quanto ao uso da plataforma e ao conteúdo inserido."
  },
  termo_do_paciente: {
    titulo: "Termo do Paciente do PsicoTarefas",
    resumo:
      "Apresenta as condições específicas de uso da plataforma pelo paciente, inclusive quanto a dados sensíveis."
  }
};

const DOCUMENTOS_POR_PERFIL = {
  profissional: [
    "termos_de_uso",
    "politica_de_privacidade",
    "termo_do_profissional"
  ],
  paciente: [
    "termos_de_uso",
    "politica_de_privacidade",
    "termo_do_paciente"
  ]
};

const STORAGE_KEY = "psicotarefas_pending_accepts";

function normalizarEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function obterStorage() {
  try {
    const bruto = window.localStorage.getItem(STORAGE_KEY);
    return bruto ? JSON.parse(bruto) : {};
  } catch (error) {
    console.error("Erro ao ler aceites pendentes:", error);
    return {};
  }
}

function salvarStorage(valor) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(valor));
}

function montarChave(perfil, email) {
  return `${perfil}:${normalizarEmail(email)}`;
}

export function obterDocumentosObrigatorios(perfil) {
  return DOCUMENTOS_POR_PERFIL[perfil] || [];
}

export async function carregarDocumentosPublicados(supabase, perfil) {
  const documentosEsperados = obterDocumentosObrigatorios(perfil);

  const { data, error } = await supabase
    .from("documentos_publicados")
    .select("documento, versao, titulo, conteudo, obrigatorio, perfil_alvo, publicado_em")
    .eq("ativo", true)
    .in("documento", documentosEsperados)
    .order("publicado_em", { ascending: false });

  const documentosMap = new Map();

  if (!error) {
    (data || []).forEach((item) => {
      if (!documentosMap.has(item.documento)) {
        documentosMap.set(item.documento, item);
      }
    });
  } else {
    console.warn(
      "Não foi possível carregar documentos publicados do banco. Usando fallback local.",
      error
    );
  }

  return documentosEsperados.map((documento) => {
    const publicado = documentosMap.get(documento) || {};
    const fallback = DOCUMENTOS_FIXOS[documento] || {};

    return {
      documento,
      titulo: publicado.titulo || fallback.titulo || documento,
      versao: publicado.versao || "0.1.0",
      conteudo: publicado.conteudo || "",
      resumo: fallback.resumo || "",
      obrigatorio: publicado.obrigatorio !== false
    };
  });
}

export function guardarAceitesPendentes({ perfil, email, documentos }) {
  if (!perfil || !email || !Array.isArray(documentos) || !documentos.length) return;

  const storage = obterStorage();
  storage[montarChave(perfil, email)] = {
    perfil,
    email: normalizarEmail(email),
    documentos,
    salvoEm: new Date().toISOString()
  };
  salvarStorage(storage);
}

export function limparAceitesPendentes({ perfil, email }) {
  if (!perfil || !email) return;

  const storage = obterStorage();
  delete storage[montarChave(perfil, email)];
  salvarStorage(storage);
}

export function obterAceitesPendentes({ perfil, email }) {
  if (!perfil || !email) return null;
  const storage = obterStorage();
  return storage[montarChave(perfil, email)] || null;
}

export async function registrarAceitesDocumentos(supabase, { userId, documentos }) {
  if (!userId || !Array.isArray(documentos) || !documentos.length) return;

  const tipos = documentos.map((item) => item.documento);
  const { data: existentes, error: erroExistentes } = await supabase
    .from("aceites_documentos")
    .select("documento, versao")
    .eq("user_id", userId)
    .in("documento", tipos);

  if (erroExistentes) {
    throw new Error("Não foi possível verificar os aceites já registrados.");
  }

  const existentesSet = new Set(
    (existentes || []).map((item) => `${item.documento}:${item.versao}`)
  );

  const faltantes = documentos.filter(
    (item) => !existentesSet.has(`${item.documento}:${item.versao}`)
  );

  if (!faltantes.length) {
    return;
  }

  const payload = faltantes.map((item) => ({
    user_id: userId,
    documento: item.documento,
    versao: item.versao,
    user_agent: window.navigator.userAgent || null,
    ip: null
  }));

  const { error } = await supabase.from("aceites_documentos").insert(payload);

  if (error) {
    throw new Error("Não foi possível registrar os aceites dos documentos.");
  }
}

export async function processarAceitesPendentesNoLogin(supabase, { perfil, email, userId }) {
  const pendente = obterAceitesPendentes({ perfil, email });
  if (!pendente?.documentos?.length) return;

  await registrarAceitesDocumentos(supabase, {
    userId,
    documentos: pendente.documentos
  });

  limparAceitesPendentes({ perfil, email });
}
