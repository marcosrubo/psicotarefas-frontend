const DOCUMENTOS_FIXOS = {
  termos_de_uso: {
    titulo: "Termos de Uso do PsicoTarefas",
    resumo:
      "Define as regras gerais de utilização da plataforma, seus limites, responsabilidades e condições de acesso.",
    conteudo:
      "Termos de Uso do PsicoTarefas\n\n" +
      "O PsicoTarefas é uma plataforma destinada à organização de vínculos entre profissionais e pacientes, ao acompanhamento de tarefas e ao registro de interações relacionadas ao processo terapêutico.\n\n" +
      "Ao utilizar a plataforma, o usuário declara que fornecerá informações verdadeiras, manterá suas credenciais em sigilo e utilizará o sistema apenas para fins lícitos e compatíveis com sua finalidade.\n\n" +
      "A plataforma não substitui atendimento de urgência ou emergência, nem assume a responsabilidade por decisões clínicas tomadas pelos usuários. Em situações emergenciais, o atendimento adequado deve ser buscado imediatamente fora do sistema.\n\n" +
      "O uso da plataforma também está sujeito à Política de Privacidade e aos termos específicos de profissional ou paciente, conforme o perfil do usuário."
  },
  politica_de_privacidade: {
    titulo: "Política de Privacidade do PsicoTarefas",
    resumo:
      "Explica como dados pessoais e dados sensíveis são tratados no contexto da plataforma.",
    conteudo:
      "Política de Privacidade do PsicoTarefas\n\n" +
      "O PsicoTarefas pode tratar dados cadastrais, dados de contato, informações de vínculo, tarefas e interações registradas pelos usuários. Parte dessas informações pode conter dados pessoais sensíveis, inclusive dados relativos à saúde.\n\n" +
      "Os dados são utilizados para viabilizar o funcionamento da plataforma, autenticação, criação de vínculos, organização de tarefas, registro de interações, segurança da informação e atendimento de obrigações legais.\n\n" +
      "O responsável pela plataforma é RUBO CONSULTORIA EMPRESARIAL LTDA, CNPJ 37.411.375/0001-54, com endereço na Rua José Manoel de Souza, 75, Londrina-PR. O contato principal é marcos@rubo.com.br e o canal complementar é WhatsApp (43) 9.9952-5060.\n\n" +
      "Os titulares podem exercer direitos previstos na LGPD pelos canais informados. O tratamento dos dados deve observar a legislação aplicável e as medidas de segurança razoáveis adotadas pela plataforma."
  },
  termo_do_profissional: {
    titulo: "Termo do Profissional do PsicoTarefas",
    resumo:
      "Estabelece responsabilidades específicas do profissional quanto ao uso da plataforma e ao conteúdo inserido.",
    conteudo:
      "Termo do Profissional do PsicoTarefas\n\n" +
      "O profissional declara que utilizará o PsicoTarefas dentro dos limites de sua habilitação e observando normas éticas, legais e regulatórias aplicáveis à sua atuação.\n\n" +
      "O profissional é responsável pelo conteúdo que inserir na plataforma, incluindo cadastro de pacientes, criação de tarefas, descrições, orientações e interações. Também deve adotar cautela no tratamento de dados pessoais e dados sensíveis.\n\n" +
      "A plataforma é ferramenta de apoio organizacional e não substitui o julgamento técnico do profissional. O uso indevido da conta, o compartilhamento de credenciais ou a inserção de conteúdo ilícito são proibidos."
  },
  termo_do_paciente: {
    titulo: "Termo do Paciente do PsicoTarefas",
    resumo:
      "Apresenta as condições específicas de uso da plataforma pelo paciente, inclusive quanto a dados sensíveis.",
    conteudo:
      "Termo do Paciente do PsicoTarefas\n\n" +
      "O paciente declara que utilizará a plataforma de forma pessoal e intransferível, mantendo o sigilo de suas credenciais e fornecendo informações verdadeiras e atualizadas.\n\n" +
      "O paciente reconhece que o sistema pode conter dados sensíveis relacionados à sua saúde e que as informações registradas em tarefas e interações poderão ser visualizadas no contexto do vínculo com o profissional.\n\n" +
      "O PsicoTarefas não substitui atendimento clínico, psicológico, médico ou emergencial. Situações urgentes devem ser tratadas fora da plataforma."
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
      conteudo: publicado.conteudo || fallback.conteudo || "",
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
