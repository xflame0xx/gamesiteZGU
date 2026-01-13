import { API_BASE } from "./api.js";

const tName = document.getElementById("tName");
const tMeta = document.getElementById("tMeta");
const tBadge = document.getElementById("tBadge");
const tKpi = document.getElementById("tKpi");

const teamsCount = document.getElementById("teamsCount");
const teamsList = document.getElementById("teamsList");
const standingsBox = document.getElementById("standingsBox");
const matchesBox = document.getElementById("matchesBox");

function getList(payload) {
  // DRF может вернуть:
  // 1) массив [...]
  // 2) объект { results: [...] }
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.results)) return payload.results;
  return [];
}

function normStatus(s = "") {
  return String(s).trim().toLowerCase();
}

function badgeTournament(status) {
  const s = normStatus(status);
  if (s.includes("рег")) return `<span class="badge badge--reg">Регистрация</span>`;
  if (s.includes("ид")) return `<span class="badge badge--live">Идёт</span>`;
  if (s.includes("зав")) return `<span class="badge badge--fin">Завершён</span>`;
  return `<span class="badge">${status || "—"}</span>`;
}

function badgeMatch(status) {
  const s = normStatus(status);
  // подстрой под свои значения (scheduled/finished/live)
  if (s.includes("sched") || s.includes("plan") || s.includes("назнач")) return `<span class="pill pill--reg">scheduled</span>`;
  if (s.includes("finish") || s.includes("done") || s.includes("зав")) return `<span class="pill pill--fin">finished</span>`;
  if (s.includes("live") || s.includes("ongo") || s.includes("ид")) return `<span class="pill pill--live">live</span>`;
  return `<span class="pill">${status || "—"}</span>`;
}

function fmtDateShort(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleDateString("ru-RU");
}

function fmtDateTime(d) {
  if (!d) return "—";
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return "—";
  return dt.toLocaleString("ru-RU", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function money(v) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString("ru-RU");
}

/* ---------- RENDER ---------- */

function renderTeams(roster) {
  teamsList.innerHTML = "";
  teamsCount.textContent = `${roster.length} команд`;

  if (!roster.length) {
    teamsList.innerHTML = `<div class="muted">Участники не добавлены.</div>`;
    return;
  }

  for (const r of roster) {
    const playersCount = (r.players?.length ?? 0);

    const el = document.createElement("div");
    el.className = "list-item";
    el.innerHTML = `
      <div>
        <div class="list-item__title">${r.team_name ?? "—"}</div>
        <div class="list-item__sub">${playersCount} игроков</div>
      </div>
      <div class="pill">team</div>
    `;
    teamsList.appendChild(el);
  }
}

function renderStandings(standings) {
  if (!standings.length) {
    standingsBox.innerHTML = `<div class="muted">Итоговые места ещё не опубликованы.</div>`;
    return;
  }

  standingsBox.innerHTML = `
    <div class="standings">
      <div class="standings__head">
        <div>Место</div>
        <div>Команда</div>
      </div>
      <div class="standings__body">
        ${standings
          .slice()
          .sort((a, b) => (a.place ?? 9999) - (b.place ?? 9999))
          .map(s => `
            <div class="srow">
              <div class="place">${s.place ?? "—"}</div>
              <div class="team">${s.team_name ?? "—"}</div>
            </div>
          `).join("")}
      </div>
    </div>
  `;
}

function renderMatches(matches) {
  if (!matches.length) {
    matchesBox.innerHTML = `<div class="muted">Матчи не найдены.</div>`;
    return;
  }

  // сортируем по дате
  const sorted = matches.slice().sort((a, b) => {
    const da = new Date(a.match_date).getTime();
    const db = new Date(b.match_date).getTime();
    return (Number.isNaN(da) ? 0 : da) - (Number.isNaN(db) ? 0 : db);
  });

  matchesBox.innerHTML = `
    <div class="m-table" role="table" aria-label="Матчи турнира">
      <div class="m-row m-row--head" role="row">
        <div class="m-cell m-date" role="columnheader">Дата</div>
        <div class="m-cell m-match" role="columnheader">Матч</div>
        <div class="m-cell m-round" role="columnheader">Раунд</div>
        <div class="m-cell m-status" role="columnheader">Статус</div>
        <div class="m-cell m-score" role="columnheader">Счёт</div>
        <div class="m-cell m-win" role="columnheader">Победитель</div>
      </div>

      ${sorted.map(m => {
        const res = m.result || null;
        const score = res ? `${res.score_team1 ?? "—"}:${res.score_team2 ?? "—"}` : "—";
        const win = res?.winner_name || "—";
        const matchTitle = `${m.team1_name ?? "—"} vs ${m.team2_name ?? "—"}`;

        return `
          <div class="m-row" role="row">
            <div class="m-cell m-date">${fmtDateTime(m.match_date)}</div>
            <div class="m-cell m-match">${matchTitle}</div>
            <div class="m-cell m-round">${m.round || "—"}</div>
            <div class="m-cell m-status">${badgeMatch(m.status)}</div>
            <div class="m-cell m-score"><span class="score">${score}</span></div>
            <div class="m-cell m-win"><span class="winner">${win}</span></div>
          </div>
        `;
      }).join("")}
    </div>
  `;
}

/* ---------- LOAD ---------- */

async function load() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    tName.textContent = "Ошибка: нет id турнира";
    return;
  }

  // 1) турнир
  const tRes = await fetch(`${API_BASE}/tournaments/${id}/`);
  if (!tRes.ok) throw new Error("tournament not found");
  const t = await tRes.json();

  tName.textContent = t.name ?? "—";
  tMeta.textContent = `${t.game_title ?? "—"} · ${fmtDateShort(t.start_date)} → ${fmtDateShort(t.end_date)}`;
  tBadge.innerHTML = badgeTournament(t.status);

  tKpi.innerHTML = `
    <div class="kpi"><span class="kpi__label">Призовой фонд</span><span class="kpi__val">${money(t.prize_pool)}</span></div>
    <div class="kpi"><span class="kpi__label">Формат</span><span class="kpi__val">${t.format ?? "—"}</span></div>
    <div class="kpi"><span class="kpi__label">ID</span><span class="kpi__val">${t.id ?? "—"}</span></div>
  `;

  // 2) участники
  const rosterRes = await fetch(`${API_BASE}/tournament-teams/roster_by_tournament/?tournament_id=${id}`);
  const rosterPayload = rosterRes.ok ? await rosterRes.json() : [];
  const roster = getList(rosterPayload) || rosterPayload; // roster endpoint чаще отдаёт массив напрямую
  renderTeams(Array.isArray(roster) ? roster : []);

  // 3) места
  const stRes = await fetch(`${API_BASE}/standings/by_tournament/?tournament_id=${id}`);
  const stPayload = stRes.ok ? await stRes.json() : [];
  renderStandings(getList(stPayload));

  // 4) матчи
  // Если у тебя DRF фильтр не включен — вернёт все матчи. Тогда лучше сделать отдельный action на бэке.
  const mRes = await fetch(`${API_BASE}/matches/?tournament=${id}`);
  const mPayload = mRes.ok ? await mRes.json() : [];
  renderMatches(getList(mPayload));
}

load().catch((e) => {
  console.error(e);
  tName.textContent = "Не удалось загрузить турнир. Проверь API/сервер.";
});
