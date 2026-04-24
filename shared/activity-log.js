import supabase from "./supabase.js";

const ANON_SESSION_STORAGE_KEY = "psicotarefas_anon_session_id";

function gerarIdSessaoAnonima() {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function obterSessaoAnonima() {
  try {
    const existente = window.localStorage.getItem(ANON_SESSION_STORAGE_KEY);

    if (existente) {
      return existente;
    }

    const novoId = gerarIdSessaoAnonima();
    window.localStorage.setItem(ANON_SESSION_STORAGE_KEY, novoId);
    return novoId;
  } catch (error) {
    return "anon-storage-unavailable";
  }
}

async function inferirUsuarioAutenticado() {
  try {
    const {
      data: { session },
      error
    } = await supabase.auth.getSession();

    if (error) return null;
    return session?.user || null;
  } catch (error) {
    return null;
  }
}

export async function registrarEvento({
  evento,
  pagina = window.location.pathname,
  perfil = "publico",
  contexto = {},
  userId = null,
  email = null,
  dedupeKey = ""
}) {
  if (!evento) return false;

  const storageKey = dedupeKey ? `psicotarefas_log_${dedupeKey}` : "";

  if (storageKey && window.sessionStorage.getItem(storageKey) === "1") {
    return false;
  }

  let resolvedUserId = userId;
  let resolvedEmail = email;

  if (!resolvedUserId && !resolvedEmail) {
    const user = await inferirUsuarioAutenticado();
    if (user) {
      resolvedUserId = user.id || null;
      resolvedEmail = user.email || null;
    }
  }

  const payload = {
    user_id: resolvedUserId,
    email: resolvedEmail,
    perfil,
    evento,
    pagina,
    contexto,
    anon_session_id: obterSessaoAnonima(),
    user_agent: navigator.userAgent || null
  };

  const { error } = await supabase.from("logs_eventos").insert(payload);

  if (error) {
    console.warn("Não foi possível registrar log de atividade:", error.message);
    return false;
  }

  if (storageKey) {
    window.sessionStorage.setItem(storageKey, "1");
  }

  return true;
}

export async function registrarAcessoPagina({
  pagina = window.location.pathname,
  perfil = "publico",
  contexto = {},
  userId = null,
  email = null
}) {
  return registrarEvento({
    evento: "acesso_pagina",
    pagina,
    perfil,
    contexto,
    userId,
    email,
    dedupeKey: `page:${pagina}`
  });
}
