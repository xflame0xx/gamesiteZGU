import {
  fetchTournaments,
  fetchCurrentTournaments,
  fetchUpcomingTournaments,
  fetchUpcomingMatches,
  fetchPopularGamesFromAPI,
  fetchPopularTeamsFromAPI,
} from "./api.js";

import {
  formatMoney,
  formatDateRange,
  formatDateTime,
  statusBadge,
  createSkeletonCards,
  createSkeletonList,
  createSkeletonMatches,
} from "./ui.js";

/**
 * Безопасный поиск элемента
 */
function $(id) {
  return document.getElementById(id);
}

/**
 * Безопасный escape
 */
function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

const els = {
  tournamentsList: $("tournamentsList"),
  matchesList: $("matchesList"),
  gamesList: $("gamesList"),
  teamsList: $("teamsList"),
  tournamentsMeta: $("tournamentsMeta"),
  statTournaments: $("statTournaments"),
  statMatches: $("statMatches"),
  statGames: $("statGames"),
  searchInput: $("searchInput"),
  btnRefresh: $("btnRefresh"),
  pills: Array.from(document.querySelectorAll(".pill")),
};

let state = {
  tournaments: [],
  matches: [],
  popularGames: [],
  popularTeams: [],
  tournamentFilter: "active", // active | upcoming | all
  search: "",
};

function applyFilters() {
  const q = (state.search || "").trim().toLowerCase();
  let filtered = [...(state.tournaments || [])];

  if (q) {
    filtered = filtered.filter((t) => {
      const hay = `${t.name} ${t.game_title} ${t.format} ${t.status}`.toLowerCase();
      return hay.includes(q);
    });
  }
  return filtered;
}

function renderTournaments(list) {
  if (!els.tournamentsList) return;

  if (!list || list.length === 0) {
    els.tournamentsList.innerHTML = `
      <div class="muted" style="padding:14px;">
        Ничего не найдено. Заполни данные через админку или измени фильтр/поиск.
      </div>
    `;
    if (els.tournamentsMeta) els.tournamentsMeta.textContent = "0 элементов";
    if (els.statTournaments) els.statTournaments.textContent = "0";
    return;
  }

  if (els.tournamentsMeta) els.tournamentsMeta.textContent = `Показано: ${list.length}`;
  if (els.statTournaments) els.statTournaments.textContent = String(list.length);

  els.tournamentsList.innerHTML = "";
  for (const t of list) {
    const b = statusBadge(t.status);
    const el = document.createElement("article");
    el.className = "card";
    el.innerHTML = `
      <div class="card__top">
        <div>
          <h3 class="card__title">${escapeHTML(t.name)}</h3>
          <div class="card__sub">${escapeHTML(t.game_title)} • ${escapeHTML(t.format || "—")}</div>
        </div>
        <div class="${b.cls}">${b.text}</div>
      </div>

      <div class="meta">
        <div class="meta__item"><span class="dot"></span> Даты: <strong>${escapeHTML(formatDateRange(t.start_date, t.end_date))}</strong></div>
        <div class="meta__item"><span class="dot"></span> Призовой: <strong>${escapeHTML(formatMoney(t.prize_pool))}</strong></div>
      </div>
    `;
    els.tournamentsList.appendChild(el);
  }
}

function renderMatches(list) {
  if (!els.matchesList) return;

  const safe = list || [];
  if (els.statMatches) els.statMatches.textContent = String(safe.length);

  if (safe.length === 0) {
    els.matchesList.innerHTML = `<div class="muted" style="padding:12px;">Ближайших матчей нет.</div>`;
    return;
  }

  els.matchesList.innerHTML = "";
  for (const m of safe) {
    const el = document.createElement("div");
    el.className = "match";
    el.innerHTML = `
      <div class="match__left">
        <div class="match__teams">${escapeHTML(m.team1_name)} <span class="muted">vs</span> ${escapeHTML(m.team2_name)}</div>
        <div class="match__info">
          <span>Турнир: <strong>${escapeHTML(m.tournament_name)}</strong></span>
          <span>Раунд: <strong>${escapeHTML(m.round)}</strong></span>
        </div>
      </div>
      <div class="match__right">
        <div class="time">${escapeHTML(formatDateTime(m.match_date))}</div>
        <div class="small">${escapeHTML(m.status)}</div>
      </div>
    `;
    els.matchesList.appendChild(el);
  }
}

function renderMiniList(container, items, mapper) {
  if (!container) return;

  const safe = items || [];
  if (safe.length === 0) {
    container.innerHTML = `<div class="muted" style="padding:12px;">Нет данных.</div>`;
    return;
  }

  container.innerHTML = "";
  for (const it of safe) {
    const el = document.createElement("div");
    el.className = "mini";
    el.innerHTML = mapper(it);
    container.appendChild(el);
  }
}

function computePopularGamesFromTournaments(tournaments, topN = 6) {
  const map = new Map();
  for (const t of tournaments || []) {
    const key = t.game_title || "—";
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .map(([title, tournaments_count]) => ({ title, tournaments_count }))
    .sort((a, b) => b.tournaments_count - a.tournaments_count)
    .slice(0, topN);
}

function computePopularTeamsFallback(matches, topN = 6) {
  const map = new Map();
  for (const m of matches || []) {
    if (m.team1_name) map.set(m.team1_name, (map.get(m.team1_name) || 0) + 1);
    if (m.team2_name) map.set(m.team2_name, (map.get(m.team2_name) || 0) + 1);
  }
  return [...map.entries()]
    .map(([name, participations]) => ({ name, participations, country: "" }))
    .sort((a, b) => b.participations - a.participations)
    .slice(0, topN);
}

async function loadTournamentsByPill() {
  if (state.tournamentFilter === "active") return await fetchCurrentTournaments();
  if (state.tournamentFilter === "upcoming") return await fetchUpcomingTournaments();
  return await fetchTournaments();
}

async function loadAll() {
  // skeletons (только если контейнеры существуют)
  if (els.tournamentsList) createSkeletonCards(els.tournamentsList, 6);
  if (els.matchesList) createSkeletonMatches(els.matchesList, 6);
  if (els.gamesList) createSkeletonList(els.gamesList, 6);
  if (els.teamsList) createSkeletonList(els.teamsList, 6);

  if (els.tournamentsMeta) els.tournamentsMeta.textContent = "Загрузка…";
  if (els.statTournaments) els.statTournaments.textContent = "—";
  if (els.statMatches) els.statMatches.textContent = "—";
  if (els.statGames) els.statGames.textContent = "—";

  try {
    const [tournaments, matches, gamesMaybe, teams] = await Promise.all([
      loadTournamentsByPill(),
      fetchUpcomingMatches(10),
      fetchPopularGamesFromAPI(6),
      fetchPopularTeamsFromAPI(6),
    ]);

    state.tournaments = tournaments || [];
    state.matches = matches || [];

    const popularGames =
      gamesMaybe && gamesMaybe.length ? gamesMaybe : computePopularGamesFromTournaments(state.tournaments, 6);
    state.popularGames = popularGames;

    const popularTeams =
      teams && teams.length ? teams : computePopularTeamsFallback(state.matches, 6);
    state.popularTeams = popularTeams;

    renderMatches(state.matches);
    renderTournaments(applyFilters());

    renderMiniList(els.gamesList, state.popularGames, (g) => `
      <div class="mini__left">
        <div class="mini__title">${escapeHTML(g.title)}</div>
        <div class="mini__sub">Турниров: ${escapeHTML(String(g.tournaments_count))}</div>
      </div>
      <div class="mini__right">${escapeHTML(String(g.tournaments_count))}</div>
    `);

    if (els.statGames) els.statGames.textContent = String(state.popularGames.length);

    renderMiniList(els.teamsList, state.popularTeams.slice(0, 6), (t) => `
      <div class="mini__left">
        <div class="mini__title">${escapeHTML(t.name)}</div>
        <div class="mini__sub">${t.country ? escapeHTML(t.country) + " • " : ""}участий: ${escapeHTML(String(t.participations ?? 0))}</div>
      </div>
      <div class="mini__right">${escapeHTML(String(t.participations ?? 0))}</div>
    `);
  } catch (_) {
    if (els.tournamentsMeta) els.tournamentsMeta.textContent = "Ошибка загрузки";
    if (els.tournamentsList) els.tournamentsList.innerHTML = `<div class="muted" style="padding:14px;">Не удалось загрузить данные.</div>`;
    if (els.matchesList) els.matchesList.innerHTML = `<div class="muted" style="padding:12px;">Не удалось загрузить матчи.</div>`;
  }
}

function setActivePill(next) {
  state.tournamentFilter = next;

  for (const p of els.pills) {
    const isActive = p.dataset.status === next;
    p.classList.toggle("pill--active", isActive);
    p.setAttribute("aria-pressed", String(isActive));
  }

  loadAll();
}

function wireEvents() {
  // pills
  if (els.pills && els.pills.length) {
    els.pills.forEach((p) => {
      p.addEventListener("click", () => setActivePill(p.dataset.status));
    });
  }

  // search
  if (els.searchInput) {
    els.searchInput.addEventListener("input", (e) => {
      state.search = e.target.value || "";
      renderTournaments(applyFilters());
    });
  }

  // refresh button
  if (els.btnRefresh) {
    els.btnRefresh.addEventListener("click", () => loadAll());
  }
}

// ВАЖНО: модульный скрипт обычно запускается после парсинга, но на всякий случай:
wireEvents();
loadAll();
