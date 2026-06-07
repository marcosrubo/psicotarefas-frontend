import supabase from "./supabase.js";

const ADMIN_API_BASE_URL = isProdAmbiente()
  ? "https://psicotarefas-backend.onrender.com"
  : "https://psicotarefas-backend-dev.onrender.com";

function isProdAmbiente() {
  return window.location.hostname === "www.psicotarefas.com.br";
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
