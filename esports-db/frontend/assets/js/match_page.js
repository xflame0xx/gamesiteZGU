import { API_BASE } from "./api.js";

const mTitle = document.getElementById("mTitle");
const mMeta = document.getElementById("mMeta");
const mBadge = document.getElementById("mBadge");

const mTournament = document.getElementById("mTournament");
const mRound = document.getElementById("mRound");
const mScore = document.getElementById("mScore");
const mWinner = document.getElementById("mWinner");

const toTournament = document.getElementById("toTournament");
const vodLink = document.getElementById("vodLink");
const msg = document.getElementById("msg");

function badge(status = "") {
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

function isUrl(x) {
  if (!x) return false;
  const s = String(x).trim();
  return /^https?:\/\/\S+$/i.test(s);
}

async function load() {
  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    msg.textContent = "Ошибка: нет id матча в URL (match.html?id=...).";
    return;
  }

  const r = await fetch(`${API_BASE}/matches/${id}/`);
  if (!r.ok) {
    msg.textContent = "Матч не найден. Проверь API/сервер.";
    return;
  }

  const m = await r.json();
  const res = m.result || null;

  mTitle.textContent = `${m.team1_name} vs ${m.team2_name}`;
  mMeta.textContent = `${fmtDT(m.match_date)} · ${m.tournament_name || "—"}`;
  mBadge.innerHTML = badge(m.status);

  mTournament.textContent = m.tournament_name || "—";
  mRound.textContent = m.round || "—";

  const score = res ? `${res.score_team1}:${res.score_team2}` : "—";
  mScore.textContent = score;
  mWinner.textContent = res?.winner_name || "—";

  // ссылка на турнир
  if (m.tournament) {
    toTournament.href = `./tournament.html?id=${m.tournament}`;
  } else {
    toTournament.classList.add("hidden");
  }

  // ссылка на запись: используем result.details, если это URL
  // (если хочешь отдельное поле vod_url — скажешь, добавим в модель)
  if (isUrl(res?.details)) {
    vodLink.href = String(res.details).trim();
    vodLink.classList.remove("hidden");
  } else {
    vodLink.classList.add("hidden");
  }

  msg.textContent = "";
}

load();
