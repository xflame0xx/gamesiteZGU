export const API_BASE = "http://127.0.0.1:8000/api";

/**
 * Универсальный GET с таймаутом и fallback на demo.
 */
async function getJSON(url, { timeoutMs = 7000 } = {}) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

/**
 * Нормализаторы: разные API могут отдавать разные поля.
 */
function pick(obj, keys, fallback = null) {
  for (const k of keys) if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
  return fallback;
}

/**
 * Демо-данные (если API не отвечает).
 */
function demoData() {
  const now = new Date();
  const plusHours = (h) => new Date(now.getTime() + h * 3600_000).toISOString();
  return {
    tournaments: [
      { id: 1, name: "Winter Cup 2026", game_title: "Dota 2", start_date: now.toISOString().slice(0,10), end_date: "2026-02-10", prize_pool: 250000, format: "Группы + плей-офф", status: "идёт" },
      { id: 2, name: "CS2 Major Qualifier", game_title: "CS2", start_date: "2026-01-20", end_date: "2026-02-01", prize_pool: 150000, format: "Плей-офф", status: "регистрация" },
      { id: 3, name: "Valorant Clash", game_title: "Valorant", start_date: "2026-02-05", end_date: "2026-02-12", prize_pool: 100000, format: "Группы", status: "регистрация" },
    ],
    matches: [
      { id: 101, tournament_name: "Winter Cup 2026", team1_name: "Nova", team2_name: "Hydra", match_date: plusHours(3), round: "Группа", status: "запланирован" },
      { id: 102, tournament_name: "CS2 Major Qualifier", team1_name: "Falcons", team2_name: "Apex", match_date: plusHours(8), round: "1/8", status: "запланирован" },
      { id: 103, tournament_name: "Winter Cup 2026", team1_name: "Zenith", team2_name: "Orion", match_date: plusHours(20), round: "Группа", status: "запланирован" },
    ],
    popularGames: [
      { title: "Dota 2", tournaments_count: 8 },
      { title: "CS2", tournaments_count: 6 },
      { title: "Valorant", tournaments_count: 4 },
    ],
    popularTeams: [
      { name: "Nova", participations: 7, country: "RU" },
      { name: "Falcons", participations: 6, country: "US" },
      { name: "Zenith", participations: 5, country: "DE" },
    ],
  };
}

/**
 * Приведение турнира к виду, который UI умеет рисовать.
 */
function normalizeTournament(t) {
  return {
    id: pick(t, ["id", "tournament_id"]),
    name: pick(t, ["name", "title"], "Без названия"),
    status: pick(t, ["status"], "регистрация"),
    format: pick(t, ["format"], "—"),
    prize_pool: Number(pick(t, ["prize_pool", "prizePool"], 0)),
    start_date: pick(t, ["start_date", "startDate"]),
    end_date: pick(t, ["end_date", "endDate"]),
    // игра может приходить как game_title, или game.name, или game (строка)
    game_title:
      pick(t, ["game_title"]) ??
      pick(t, ["game"]) ??
      pick(t, ["game_name"]) ??
      pick(t?.game, ["title", "name"], "—"),
  };
}

function normalizeMatch(m) {
  return {
    id: pick(m, ["id", "match_id"]),
    tournament_name:
      pick(m, ["tournament_name"]) ??
      pick(m?.tournament, ["name"], "—"),
    team1_name:
      pick(m, ["team1_name"]) ??
      pick(m?.team1, ["name"], "Team 1"),
    team2_name:
      pick(m, ["team2_name"]) ??
      pick(m?.team2, ["name"], "Team 2"),
    match_date: pick(m, ["match_date", "matchDate"]),
    round: pick(m, ["round"], "—"),
    status: pick(m, ["status"], "запланирован"),
  };
}

/**
 * Попытка получить турниры через API.
 * Варианты: /tournaments или /tournament
 */
export async function fetchTournaments() {
  const candidates = [
    `${API_BASE}/tournaments/`,
    `${API_BASE}/tournament/`,
  ];
  for (const url of candidates) {
    try {
      const data = await getJSON(url);
      const items = Array.isArray(data) ? data : (data.results ?? []);
      return items.map(normalizeTournament);
    } catch (_) {}
  }
  return demoData().tournaments.map(normalizeTournament);
}

/**
 * Ближайшие матчи.
 * Варианты: /matches/ или view /upcoming-matches/
 */
export async function fetchUpcomingMatches(limit = 10) {
  const candidates = [
    `${API_BASE}/matches/?status=запланирован`,
    `${API_BASE}/matches/`,
    `${API_BASE}/upcoming-matches/`,
  ];
  for (const url of candidates) {
    try {
      const data = await getJSON(url);
      const items = Array.isArray(data) ? data : (data.results ?? []);
      return items.map(normalizeMatch).slice(0, limit);
    } catch (_) {}
  }
  return demoData().matches.map(normalizeMatch).slice(0, limit);
}

/**
 * Популярные игры: если есть отдельный endpoint — используем.
 * Иначе считаем по турнирам на фронте.
 */
export async function fetchPopularGamesFromAPI() {
  const candidates = [
    `${API_BASE}/reports/tournaments-by-game/`,
    `${API_BASE}/analytics/tournaments-by-game/`,
    `${API_BASE}/games-popular/`,
  ];
  for (const url of candidates) {
    try {
      const data = await getJSON(url);
      const items = Array.isArray(data) ? data : (data.results ?? []);
      // ожидаем {title, tournaments_count} либо похоже
      return items.map(x => ({
        title: pick(x, ["title", "game", "game_title"], "—"),
        tournaments_count: Number(pick(x, ["tournaments_count", "count"], 0)),
      }));
    } catch (_) {}
  }
  return null; // пусть UI посчитает сам
}

/**
 * Популярные команды: если нет API — считаем по участию в турнирах (если endpoint есть),
 * иначе демо.
 */
export async function fetchPopularTeamsFromAPI() {
  const candidates = [
    `${API_BASE}/reports/popular-teams/`,
    `${API_BASE}/analytics/popular-teams/`,
    `${API_BASE}/teams-popular/`,
  ];
  for (const url of candidates) {
    try {
      const data = await getJSON(url);
      const items = Array.isArray(data) ? data : (data.results ?? []);
      return items.map(x => ({
        name: pick(x, ["name", "team"], "—"),
        participations: Number(pick(x, ["participations", "count"], 0)),
        country: pick(x, ["country"], ""),
      }));
    } catch (_) {}
  }
  return demoData().popularTeams;
}

