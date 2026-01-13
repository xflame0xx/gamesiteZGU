import { authHeaders, getToken, clearToken } from "./auth.js";

export const API_BASE = "http://127.0.0.1:8000/api";

/**
 * Универсальный GET с таймаутом.
 * ВАЖНО: если токен протух/битый и сервер вернул 401 — очищаем токен и повторяем запрос без Authorization,
 * чтобы публичные данные показывались даже без входа.
 */
async function getJSON(url, { timeoutMs = 7000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  async function doFetch(withAuth) {
    const headers = {
      "Content-Type": "application/json",
      ...(withAuth ? authHeaders() : {}),
    };
    return fetch(url, { signal: controller.signal, headers });
  }

  try {
    // 1) пробуем с токеном, если он есть
    const hasToken = !!getToken();
    let res = await doFetch(hasToken);

    // 2) если токен есть, но 401 — чистим и повторяем без токена
    if (hasToken && res.status === 401) {
      clearToken();
      res = await doFetch(false);
    }

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function pick(obj, keys, fallback = null) {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  }
  return fallback;
}

function demoData() {
  const now = new Date();
  const plusHours = (h) => new Date(now.getTime() + h * 3600_000).toISOString();
  return {
    tournaments: [
      { id: 1, name: "Winter Cup 2026", game_title: "Dota 2", start_date: now.toISOString().slice(0, 10), end_date: "2026-02-10", prize_pool: 250000, format: "Группы + плей-офф", status: "running" },
      { id: 2, name: "CS2 Major Qualifier", game_title: "CS2", start_date: "2026-01-20", end_date: "2026-02-01", prize_pool: 150000, format: "Плей-офф", status: "registration" },
    ],
    matches: [
      { id: 101, tournament_name: "Winter Cup 2026", team1_name: "Nova", team2_name: "Hydra", match_date: plusHours(3), round: "Группа", status: "scheduled" },
      { id: 102, tournament_name: "CS2 Major Qualifier", team1_name: "Falcons", team2_name: "Apex", match_date: plusHours(8), round: "1/8", status: "scheduled" },
    ],
    popularTeams: [
      { name: "Nova", participations: 7, country: "RU" },
      { name: "Falcons", participations: 6, country: "US" },
    ],
  };
}

function normalizeTournament(t) {
  return {
    id: pick(t, ["id", "tournament_id"]),
    name: pick(t, ["name", "title"], "Без названия"),
    status: pick(t, ["status"], "registration"),
    format: pick(t, ["format"], "—"),
    prize_pool: Number(pick(t, ["prize_pool", "prizePool"], 0)),
    start_date: pick(t, ["start_date", "startDate"]),
    end_date: pick(t, ["end_date", "endDate"]),
    game_title:
      pick(t, ["game_title"]) ??
      pick(t, ["game_name"]) ??
      pick(t?.game, ["title", "name"], "—"),
  };
}

function normalizeMatch(m) {
  return {
    id: pick(m, ["id", "match_id"]),
    tournament_name: pick(m, ["tournament_name"]) ?? pick(m?.tournament, ["name"], "—"),
    team1_name: pick(m, ["team1_name"]) ?? pick(m?.team1, ["name"], "Team 1"),
    team2_name: pick(m, ["team2_name"]) ?? pick(m?.team2, ["name"], "Team 2"),
    match_date: pick(m, ["match_date", "matchDate"]),
    round: pick(m, ["round"], "—"),
    status: pick(m, ["status"], "scheduled"),
  };
}

/** Все турниры */
export async function fetchTournaments() {
  try {
    const data = await getJSON(`${API_BASE}/tournaments/`);
    const items = Array.isArray(data) ? data : (data.results ?? []);
    return items.map(normalizeTournament);
  } catch (_) {
    return demoData().tournaments.map(normalizeTournament);
  }
}

/** Текущие турниры */
export async function fetchCurrentTournaments() {
  try {
    const data = await getJSON(`${API_BASE}/tournaments/current/`);
    const items = Array.isArray(data) ? data : (data.results ?? []);
    return items.map(normalizeTournament);
  } catch (_) {
    return demoData().tournaments.map(normalizeTournament).filter(t => String(t.status).toLowerCase().includes("running"));
  }
}

/** Предстоящие турниры */
export async function fetchUpcomingTournaments() {
  try {
    const data = await getJSON(`${API_BASE}/tournaments/upcoming/`);
    const items = Array.isArray(data) ? data : (data.results ?? []);
    return items.map(normalizeTournament);
  } catch (_) {
    return demoData().tournaments.map(normalizeTournament).filter(t => String(t.status).toLowerCase().includes("registration"));
  }
}

/** Ближайшие матчи */
export async function fetchUpcomingMatches(limit = 10) {
  try {
    const data = await getJSON(`${API_BASE}/matches/upcoming/?limit=${encodeURIComponent(limit)}`);
    const items = Array.isArray(data) ? data : (data.results ?? []);
    return items.map(normalizeMatch).slice(0, limit);
  } catch (_) {
    return demoData().matches.map(normalizeMatch).slice(0, limit);
  }
}

/** Популярные игры */
export async function fetchPopularGamesFromAPI(limit = 10) {
  try {
    const data = await getJSON(`${API_BASE}/reports/tournaments-by-game/?limit=${encodeURIComponent(limit)}`);
    const items = Array.isArray(data) ? data : (data.results ?? []);
    return items.map(x => ({
      title: pick(x, ["title", "game", "game_title"], "—"),
      tournaments_count: Number(pick(x, ["tournaments_count", "tournaments", "count"], 0)),
    }));
  } catch (_) {
    return null; // пусть app.js посчитает из турниров
  }
}

/** Популярные команды */
export async function fetchPopularTeamsFromAPI(limit = 10) {
  try {
    const data = await getJSON(`${API_BASE}/reports/popular-teams/?limit=${encodeURIComponent(limit)}`);
    const items = Array.isArray(data) ? data : (data.results ?? []);
    return items.map(x => ({
      name: pick(x, ["name", "team"], "—"),
      participations: Number(pick(x, ["participations", "count"], 0)),
      country: pick(x, ["country"], ""),
    }));
  } catch (_) {
    return demoData().popularTeams.slice(0, limit);
  }
}