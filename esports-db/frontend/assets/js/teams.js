import { API_BASE } from "./api.js";

const fGame = document.getElementById("fGame");
const fCountry = document.getElementById("fCountry");
const fQ = document.getElementById("fQ");

const form = document.getElementById("filtersForm");
const btnReset = document.getElementById("btnReset");

const grid = document.getElementById("teamsGrid");
const empty = document.getElementById("emptyState");
const count = document.getElementById("teamsCount");

function safe(v){ return v ?? "—"; }

function firstLetter(name){
  return (name && String(name).trim()[0]) ? String(name).trim()[0].toUpperCase() : "T";
}

function renderTeamCard(team, extra) {
  const logo = team.logo_url
    ? `<img src="${team.logo_url}" alt="Логотип ${team.name}">`
    : firstLetter(team.name);

  const rosterCount = extra?.rosterCount ?? "—";
  const currentCount = extra?.currentCount ?? "—";

  const el = document.createElement("div");
  el.className = "card";
  el.innerHTML = `
    <div class="card__top">
      <div class="team">
        <div class="logo">${logo}</div>
        <div>
          <h3 class="name">${team.name}</h3>
          <div class="sub">${team.country ? team.country : "Страна не указана"}</div>
        </div>
      </div>
      <div class="pills">
        <span class="pill">Игроков: ${rosterCount}</span>
        <span class="pill">Турниров: ${currentCount}</span>
      </div>
    </div>

    <div class="meta">
      <div>ID: <strong>${team.id}</strong></div>
    </div>

    <div class="card__bottom">
      <a class="btn btn--ghost" href="./team.html?id=${team.id}">Открыть</a>
    </div>
  `;
  return el;
}

function buildQuery() {
  const p = new URLSearchParams();

  if (fGame.value) p.set("game", fGame.value);
  if (fCountry.value) p.set("country", fCountry.value);
  if (fQ.value.trim()) p.set("q", fQ.value.trim());

  return p.toString();
}

async function loadFilters() {
  // Игры
  const gRes = await fetch(`${API_BASE}/games/`);
  if (gRes.ok) {
    const games = await gRes.json();
    for (const g of games) {
      const opt = document.createElement("option");
      opt.value = g.id;
      opt.textContent = g.title;
      fGame.appendChild(opt);
    }
  }

  // Страны (собираем из списка команд)
  const tRes = await fetch(`${API_BASE}/teams/`);
  if (tRes.ok) {
    const teams = await tRes.json();
    const set = new Set();
    for (const t of teams) {
      if (t.country) set.add(t.country);
    }
    [...set].sort((a,b) => a.localeCompare(b)).forEach(c => {
      const opt = document.createElement("option");
      opt.value = c;
      opt.textContent = c;
      fCountry.appendChild(opt);
    });
  }
}

async function loadTeams() {
  const qs = buildQuery();
  const url = qs ? `${API_BASE}/teams/?${qs}` : `${API_BASE}/teams/`;

  const res = await fetch(url);
  const teams = res.ok ? await res.json() : [];

  grid.innerHTML = "";
  count.textContent = String(teams.length);
  empty.classList.toggle("hidden", teams.length !== 0);

  // Быстрые данные: roster count + current tournaments count
  // (делаем запросы параллельно, но аккуратно)
  const extras = new Map();

  await Promise.all(
    teams.map(async (t) => {
      try {
        const [rosterRes, curRes] = await Promise.all([
          fetch(`${API_BASE}/teams/${t.id}/roster/`),
          fetch(`${API_BASE}/teams/${t.id}/current_tournaments/`)
        ]);
        const roster = rosterRes.ok ? await rosterRes.json() : [];
        const cur = curRes.ok ? await curRes.json() : [];
        extras.set(t.id, { rosterCount: roster.length, currentCount: cur.length });
      } catch {
        extras.set(t.id, { rosterCount: "—", currentCount: "—" });
      }
    })
  );

  for (const t of teams) {
    grid.appendChild(renderTeamCard(t, extras.get(t.id)));
  }
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  await loadTeams();
});

btnReset.addEventListener("click", async () => {
  form.reset();
  await loadTeams();
});

await loadFilters();
await loadTeams();
