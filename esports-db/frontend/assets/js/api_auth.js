import { API_BASE } from "./api.js";
import { setToken, authHeaders, clearToken } from "./auth.js";

async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.detail || data?.non_field_errors?.[0] || "Ошибка запроса";
    throw new Error(msg);
  }
  return data;
}

export async function apiRegister({ username, email, password }) {
  const data = await postJSON(`${API_BASE}/auth/register/`, { username, email, password });
  if (data.token) setToken(data.token);
  return data;
}

export async function apiLogin({ username, password }) {
  const data = await postJSON(`${API_BASE}/auth/login/`, { username, password });
  if (data.token) setToken(data.token);
  return data; // {token, username, is_staff}
}

export async function apiLogout() {
  try {
    await fetch(`${API_BASE}/auth/logout/`, {
      method: "POST",
      headers: { ...authHeaders() },
    });
  } catch (_) {}
  clearToken();
}

export async function apiMe() {
  const res = await fetch(`${API_BASE}/auth/me/`, { headers: { ...authHeaders() } });
  if (res.status === 401) return null;
  return await res.json().catch(() => null);
}
