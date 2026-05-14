import supabase from "./supabase.js";

const TASKS_API_BASE_URL = isLocalBackend()
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

async function requestTasksApi(path, { method = "GET", query = {}, body } = {}) {
  const url = new URL(path, TASKS_API_BASE_URL);

  Object.entries(query).forEach(([key, value]) => {
    if (value !== null && value !== undefined && String(value).trim()) {
      url.searchParams.set(key, String(value));
    }
  });

  const headers = await getAuthHeaders();

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(payload?.error || "Não foi possível acessar as tarefas.");
  }

  return payload || {};
}

export async function listarTarefasDoProfissional({ patientUserId } = {}) {
  const payload = await requestTasksApi("/api/tasks/professional", {
    query: { patient_user_id: patientUserId }
  });

  return payload.tasks || [];
}

export async function listarTarefasDoPaciente() {
  const payload = await requestTasksApi("/api/tasks/patient");

  return payload.tasks || [];
}

export async function obterTarefa(taskId) {
  const payload = await requestTasksApi(`/api/tasks/${encodeURIComponent(taskId)}`);

  return payload.task || null;
}

export async function criarTarefa(payload) {
  const response = await requestTasksApi("/api/tasks", {
    method: "POST",
    body: payload
  });

  return response.task || null;
}

export async function atualizarTarefa(taskId, payload) {
  const response = await requestTasksApi(`/api/tasks/${encodeURIComponent(taskId)}`, {
    method: "PATCH",
    body: payload
  });

  return response.task || null;
}
