import supabase from "./supabase.js";

const ADMIN_API_BASE_URL = isLocalBackend()
  ? "http://localhost:3000"
  : "https://psicotarefas-backend.onrender.com";

function isLocalBackend() {
  return ["localhost", "127.0.0.1"].includes(window.location.hostname);
}

async function getAuthHeaders() {
  const {
    data: { session }
  } = await supabase.auth.getSession();

  const token = session?.access_token;

  if (!token) {
    throw new Error("Sessão expirada. Entre novamente para continuar.");
  }

  return {
    Authorization: `Bearer ${token}`
  };
}

async function requestAdminApi(path) {
  const url = new URL(path, ADMIN_API_BASE_URL);
  const response = await fetch(url.toString(), {
    headers: await getAuthHeaders()
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || "Não foi possível acessar o painel administrativo.");
  }

  return payload || {};
}

export async function carregarAdminV2Dataset() {
  return requestAdminApi("/api/admin-v2/dataset");
}
