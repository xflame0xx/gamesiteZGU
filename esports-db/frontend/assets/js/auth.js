const TOKEN_KEY = "esports_token";

export function setToken(token) {
  if (!token || typeof token !== "string") return;
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  const t = localStorage.getItem(TOKEN_KEY);

  // защита от мусора
  if (!t || t === "null" || t === "undefined") return null;

  return t;
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Token ${token}` } : {};
}