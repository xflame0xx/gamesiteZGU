import {
  fetchTournaments,
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

const els = {
  tournamentsList: document.getElementById("tournamentsList"),
  matchesList: document.getElementById("matchesList"),
  gamesList: document.getElementById("gamesList"),
  teamsList: document.getElementById("teamsList"),
  tournamentsMeta: document.getElementById("tournamentsMeta"),
  statTournaments: document.getElementById("statTournaments"),
  statMatches: document.getElementById("statMatches"),
  statGames: document.getElementById("statGames"),
  searchInput: document.getElementById("searchInput"),
  btnRefresh: document.getElementById("btnRefresh"),
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

function normalizeStatusForFilter(status) {
  const s = (status || "").toLowerCase();
  if (s.includes("ид")) return "active";
  if (s.includes("зав")) return "finished";
  // регистрация/предстоящий
  return "upcoming";
}

function applyFilters() {
  const q = state.search.trim().toLowerCase();

  let filtered = [...state.tournaments];

  if (state.tournamentFilter !== "all") {
    filtered = filtered.filter(t => normalizeStatusForFilter(t.status) === state.tournamentFilter);
  }

  if (q) {
    filtered = filtered.filter(t => {
      const hay = `${t.name} ${t.game_title} ${t.format} ${t.status}`.toLowerCase();
      return hay.includes(q);
    });
  }

  return filtered;
}

function renderTournaments(list) {
  if (!list.length) {
    els.tournamentsList.innerHTML = `
      <div class="muted" style="padding:14px;">
        Ничего не найдено. Заполни данные через админку или измени фильтр/поиск.
      </div>
    `;
    els.tournamentsMeta.textContent = "0 элементов";
    els.statTournaments.textContent = "0";
    return;
  }

  els.tournamentsMeta.textContent = `Показано: ${list.length}`;
  els.statTournaments.textContent = String(list.length);

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
  els.statMatches.textContent = String(list.length);
  if (!list.length) {
    els.matchesList.innerHTML = `<div class="muted" style="padding:12px;">Ближайших матчей нет.</div>`;
    return;
  }
  els.matchesList.innerHTML = "";
  for (const m of list) {
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
  if (!items.length) {
    container.innerHTML = `<div class="muted" style="padding:12px;">Нет данных.</div>`;
    return;
  }
  container.innerHTML = "";
  for (const it of items) {
    const el = document.createElement("div");
    el.className = "mini";
    el.innerHTML = mapper(it);
    container.appendChild(el);
  }
}

function computePopularGamesFromTournaments(tournaments, topN = 6) {
  const map = new Map();
  for (const t of tournaments) {
    const key = t.game_title || "—";
    map.set(key, (map.get(key) || 0) + 1);
  }
  return [...map.entries()]
    .map(([title, tournaments_count]) => ({ title, tournaments_count }))
    .sort((a,b) => b.tournaments_count - a.tournaments_count)
    .slice(0, topN);
}

function computePopularTeamsFallback(matches, topN = 6) {
  // Если нет отдельного endpoint — грубая оценка по упоминаниям в ближайших матчах
  const map = new Map();
  for (const m of matches) {
    map.set(m.team1_name, (map.get(m.team1_name) || 0) + 1);
    map.set(m.team2_name, (map.get(m.team2_name) || 0) + 1);
  }
  return [...map.entries()]
    .map(([name, participations]) => ({ name, participations, country: "" }))
    .sort((a,b) => b.participations - a.participations)
    .slice(0, topN);
}

function escapeHTML(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function loadAll() {
  // skeletons
  createSkeletonCards(els.tournamentsList, 6);
  createSkeletonMatches(els.matchesList, 6);
  createSkeletonList(els.gamesList, 6);
  createSkeletonList(els.teamsList, 6);

  els.tournamentsMeta.textContent = "Загрузка…";
  els.statTournaments.textContent = "—";
  els.statMatches.textContent = "—";
  els.statGames.textContent = "—";

  try {
    const [tournaments, matches, gamesMaybe, teams] = await Promise.all([
      fetchTournaments(),
      fetchUpcomingMatches(10),
      fetchPopularGamesFromAPI(),
      fetchPopularTeamsFromAPI(),
    ]);

    state.tournaments = tournaments;
    state.matches = matches;

    // popular games: если API не дал — считаем по турнирам
    const popularGames = gamesMaybe && gamesMaybe.length
      ? gamesMaybe
      : computePopularGamesFromTournaments(tournaments, 6);
    state.popularGames = popularGames;

    // popular teams: если API пустой — fallback по матчам
    const popularTeams = (teams && teams.length) ? teams : computePopularTeamsFallback(matches, 6);
    state.popularTeams = popularTeams;

    // render
    renderMatches(state.matches);

    const filtered = applyFilters();
    renderTournaments(filtered);

    renderMiniList(els.gamesList, state.popularGames, (g) => `
      <div class="mini__left">
        <div class="mini__title">${escapeHTML(g.title)}</div>
        <div class="mini__sub">Турниров: ${escapeHTML(String(g.tournaments_count))}</div>
      </div>
      <div class="mini__right">${escapeHTML(String(g.tournaments_count))}</div>
    `);

    els.statGames.textContent = String(state.popularGames.length);

    renderMiniList(els.teamsList, state.popularTeams.slice(0, 6), (t) => `
      <div class="mini__left">
        <div class="mini__title">${escapeHTML(t.name)}</div>
        <div class="mini__sub">${t.country ? escapeHTML(t.country) + " • " : ""}участий: ${escapeHTML(String(t.participations ?? 0))}</div>
      </div>
      <div class="mini__right">${escapeHTML(String(t.participations ?? 0))}</div>
    `);

  } catch (e) {
    // на практике сюда редко попадём, т.к. api.js уже делает fallback
    els.tournamentsMeta.textContent = "Ошибка загрузки";
    els.tournamentsList.innerHTML = `<div class="muted" style="padding:14px;">Не удалось загрузить данные.</div>`;
    els.matchesList.innerHTML = `<div class="muted" style="padding:12px;">Не удалось загрузить матчи.</div>`;
  }
}

function setActivePill(next) {
  state.tournamentFilter = next;
  for (const p of els.pills) {
    const isActive = p.dataset.status === next;
    p.classList.toggle("pill--active", isActive);
    p.setAttribute("aria-pressed", String(isActive));
  }
  renderTournaments(applyFilters());
}


function wireEvents() {
  els.pills.forEach(p => {
    p.addEventListener("click", () => setActivePill(p.dataset.status));
  });

  els.searchInput.addEventListener("input", (e) => {
    state.search = e.target.value || "";
    renderTournaments(applyFilters());
  });

  els.btnRefresh.addEventListener("click", () => loadAll());
}

wireEvents();
loadAll();
