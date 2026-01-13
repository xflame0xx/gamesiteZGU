import { API_BASE } from "./api.js";

const teamLogo = document.getElementById("teamLogo");
const teamName = document.getElementById("teamName");
const teamMeta = document.getElementById("teamMeta");

const kPlayers = document.getElementById("kPlayers");
const kCurrent = document.getElementById("kCurrent");
const kHistory = document.getElementById("kHistory");

const rosterBox = document.getElementById("roster");
const rosterEmpty = document.getElementById("rosterEmpty");

const currentBox = document.getElementById("currentTournaments");
const currentEmpty = document.getElementById("currentEmpty");

const historyBox = document.getElementById("history");
const recentBox = document.getElementById("recentMatches");
const msg = document.getElementById("msg");

function safe(v){ return v ?? "—"; }
function fmtDate(d){ return d ? String(d).slice(0,10) : "—"; }
function fmtDT(iso){ return iso ? new Date(iso).toLocaleString() : "—"; }

function firstLetter(name){
  return (name && String(name).trim()[0]) ? String(name).trim()[0].toUpperCase() : "T";
}

function setLogo(team){
  if (team.logo_url) {
    teamLogo.innerHTML = `<img src="${team.logo_url}" alt="Логотип ${team.name}">`;
  } else {
    teamLogo.textContent = firstLetter(team.name);
  }
}

function renderRoster(players){
  rosterBox.innerHTML = "";
  rosterEmpty.classList.toggle("hidden", players.length !== 0);

  for (const p of players) {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div>
        <div class="item__title">${p.nickname}</div>
        <div class="item__sub">${p.real_name ? p.real_name : "—"} · ${p.role ? p.role : "—"}</div>
      </div>
      <div class="item__sub">ID: ${p.id}</div>
    `;
    rosterBox.appendChild(el);
  }
}

function renderCurrent(tournaments){
  currentBox.innerHTML = "";
  currentEmpty.classList.toggle("hidden", tournaments.length !== 0);

  for (const t of tournaments) {
    const el = document.createElement("div");
    el.className = "item";
    el.innerHTML = `
      <div>
        <div class="item__title">${t.name}</div>
        <div class="item__sub">${safe(t.game_title)} · ${fmtDate(t.start_date)} → ${fmtDate(t.end_date)} · ${safe(t.status)}</div>
      </div>
      <a class="btn btn--ghost" href="./tournament.html?id=${t.id}">Открыть</a>
    `;
    currentBox.appendChild(el);
  }
}

function renderHistory(payload){
  const list = payload?.history || [];
  kHistory.textContent = String(list.length);

  if (!list.length) {
    historyBox.innerHTML = `<div class="empty">История участия пока отсутствует.</div>`;
    return;
  }

  historyBox.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Турнир</th>
          <th>Игра</th>
          <th>Даты</th>
          <th>Место</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(x => `
          <tr>
            <td><a href="./tournament.html?id=${x.tournament_id}">${x.tournament_name}</a></td>
            <td>${safe(x.game_title)}</td>
            <td>${fmtDate(x.start_date)} → ${fmtDate(x.end_date)}</td>
            <td>${safe(x.place)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderRecent(payload){
  const list = payload?.matches || [];

  if (!list.length) {
    recentBox.innerHTML = `<div class="empty">Матчей пока нет.</div>`;
    return;
  }

  recentBox.innerHTML = `
    <table>
      <thead>
        <tr>
          <th>Дата</th>
          <th>Матч</th>
          <th>Турнир</th>
          <th>Раунд</th>
          <th>Статус</th>
          <th>Счёт</th>
          <th>Победитель</th>
        </tr>
      </thead>
      <tbody>
        ${list.map(m => `
          <tr>
            <td>${fmtDT(m.match_date)}</td>
            <td><a href="./match.html?id=${m.id}">${m.team1_name} vs ${m.team2_name}</a></td>
            <td>${m.tournament_id ? `<a href="./tournament.html?id=${m.tournament_id}">${safe(m.tournament_name)}</a>` : "—"}</td>
            <td>${safe(m.round)}</td>
            <td>${safe(m.status)}</td>
            <td>${safe(m.score)}</td>
            <td>${safe(m.winner_name)}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function load() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    msg.textContent = "Ошибка: нет id команды (team.html?id=...).";
    return;
  }

  const teamRes = await fetch(`${API_BASE}/teams/${id}/`);
  if (!teamRes.ok) {
    msg.textContent = "Команда не найдена. Проверь API/сервер.";
    return;
  }
  const team = await teamRes.json();

  setLogo(team);
  teamName.textContent = team.name;
  teamMeta.textContent = team.country ? `Страна: ${team.country}` : "Страна не указана";

  // roster, current, history, recent
  const [rosterRes, curRes, histRes, recRes] = await Promise.all([
    fetch(`${API_BASE}/teams/${id}/roster/`),
    fetch(`${API_BASE}/teams/${id}/current_tournaments/`),
    fetch(`${API_BASE}/teams/${id}/history/`),
    fetch(`${API_BASE}/teams/${id}/recent_matches/?limit=12`)
  ]);

  const roster = rosterRes.ok ? await rosterRes.json() : [];
  const current = curRes.ok ? await curRes.json() : [];
  const history = histRes.ok ? await histRes.json() : { history: [] };
  const recent = recRes.ok ? await recRes.json() : { matches: [] };

  kPlayers.textContent = String(roster.length);
  kCurrent.textContent = String(current.length);

  renderRoster(roster);
  renderCurrent(current);
  renderHistory(history);
  renderRecent(recent);

  msg.textContent = "";
}

load().catch(() => {
  msg.textContent = "Ошибка загрузки. Проверь бэкенд и API_BASE.";
});
