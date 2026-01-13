import { API_BASE } from "./api.js";

const elTournament = document.getElementById("fTournament");
const elTeam = document.getElementById("fTeam");
const elStatus = document.getElementById("fStatus");
const elFrom = document.getElementById("fFrom");
const elTo = document.getElementById("fTo");
const elQ = document.getElementById("fQ");

const form = document.getElementById("filtersForm");
const btnReset = document.getElementById("btnReset");

const grid = document.getElementById("matchesGrid");
const empty = document.getElementById("emptyState");
const count = document.getElementById("matchesCount");

function statusBadge(status = "") {
  const s = String(status).toLowerCase();
  if (s === "finished") return `<span class="badge badge--finished">Завершён</span>`;
  if (s === "live") return `<span class="badge badge--live">Идёт</span>`;
  if (s === "scheduled") return `<span class="badge badge--scheduled">Запланирован</span>`;
  return `<span class="badge">${status || "—"}</span>`;
}

function fmtDT(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString();
}

function safe(v){ return v ?? "—"; }

function renderMatches(matches) {
  grid.innerHTML = "";

  count.textContent = String(matches.length);
  empty.classList.toggle("hidden", matches.length !== 0);

  for (const m of matches) {
    const res = m.result || null;
    const score = res ? `${res.score_team1}:${res.score_team2}` : "—";
    const winner = res?.winner_name || "—";

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `
      <div class="card__top">
        <div>
          <h3 class="card__title">${safe(m.team1_name)} vs ${safe(m.team2_name)}</h3>
          <div class="card__sub">${safe(m.tournament_name)} · ${fmtDT(m.match_date)}</div>
        </div>
        ${statusBadge(m.status)}
      </div>

      <div class="meta">
        <div>Раунд: <strong>${safe(m.round)}</strong></div>
        <div>Победитель: <strong>${winner}</strong></div>
      </div>

      <div class="card__bottom">
        <div class="score">${score}</div>
        <a class="btn btn--ghost" href="./match.html?id=${m.id}">Открыть</a>
      </div>
    `;
    grid.appendChild(card);
  }
}

function buildQuery() {
  const p = new URLSearchParams();

  if (elTournament.value) p.set("tournament", elTournament.value);
  if (elTeam.value) p.set("team", elTeam.value);
  if (elStatus.value) p.set("status", elStatus.value);

  if (elFrom.value) p.set("date_from", elFrom.value);
  if (elTo.value) p.set("date_to", elTo.value);

  if (elQ.value.trim()) p.set("q", elQ.value.trim());

  return p.toString();
}

async function loadFilters() {
  // турниры
  const tRes = await fetch(`${API_BASE}/tournaments/`);
  if (tRes.ok) {
    const tournaments = await tRes.json();
    for (const t of tournaments) {
      const opt = document.createElement("option");
      opt.value = t.id;
      opt.textContent = `${t.name} (${t.game_title || ""})`;
      elTournament.appendChild(opt);
    }
  }

  // команды
  const teamRes = await fetch(`${API_BASE}/teams/`);
  if (teamRes.ok) {
    const teams = await teamRes.json();
    for (const team of teams) {
      const opt = document.createElement("option");
      opt.value = team.id;
      opt.textContent = team.name;
      elTeam.appendChild(opt);
    }
  }
}

async function loadMatches() {
  const qs = buildQuery();
  const url = qs ? `${API_BASE}/matches/?${qs}` : `${API_BASE}/matches/`;
  const res = await fetch(url);
  const data = res.ok ? await res.json() : [];
  renderMatches(Array.isArray(data) ? data : []);
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  await loadMatches();
});

btnReset.addEventListener("click", async () => {
  form.reset();
  // select reset делает value="" на первом option, ок
  await loadMatches();
});

await loadFilters();
await loadMatches();
