import { API_BASE } from "./api.js";


const elGrid = document.getElementById("tournamentsGrid");

const elGame = document.getElementById("filterGame");
const elStatus = document.getElementById("filterStatus");
const elFrom = document.getElementById("filterFrom");
const elTo = document.getElementById("filterTo");
const elQ = document.getElementById("filterQ");

const btnApply = document.getElementById("apply");
const btnReset = document.getElementById("reset");

// Храним данные, чтобы фильтровать на клиенте
let ALL_TOURNAMENTS = [];
let ALL_GAMES = [];

function fmtDate(iso) {
  if (!iso) return "—";
  // iso может быть "2026-01-14" или "2026-01-14T00:00:00Z"
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso).slice(0, 10);
  return d.toLocaleDateString("ru-RU");
}

function normalizeStatus(s) {
  // backend может отдавать: registration/ongoing/finished
  // или по-русски: "регистрация"/"идёт"/"завершён"
  const v = (s || "").toString().trim().toLowerCase();
  if (["registration", "регистрация"].includes(v)) return "registration";
  if (["ongoing", "идёт", "идет"].includes(v)) return "ongoing";
  if (["finished", "завершён", "завершен"].includes(v)) return "finished";
  return v || "";
}

function statusLabel(status) {
  const v = normalizeStatus(status);
  if (v === "registration") return "Регистрация";
  if (v === "ongoing") return "Идёт";
  if (v === "finished") return "Завершён";
  return status || "—";
}

function renderEmpty(text) {
  elGrid.innerHTML = `
    <div style="opacity:.75; padding: 14px;">
    ${text}
    </div>
  `;
}

function renderTournaments(list) {
  if (!Array.isArray(list) || list.length === 0) {
    renderEmpty("Турниры не найдены по выбранным фильтрам.");
    return;
  }

  elGrid.innerHTML = list
    .map((t) => {
      const st = normalizeStatus(t.status);
      return `
        <article class="card">
          <div class="status ${st}">${statusLabel(t.status)}</div>
          <h3>${t.name ?? "Без названия"}</h3>
          <p><b>Игра:</b> ${t.game_title ?? t.game ?? "—"}</p>
          <p><b>Даты:</b> ${fmtDate(t.start_date)} — ${fmtDate(t.end_date)}</p>
          <p><b>Призовой фонд:</b> ${t.prize_pool ?? "—"}</p>
          <p><b>Формат:</b> ${t.format ?? "—"}</p>

          <p style="margin-top:10px;">
            <a href="./tournament.html?id=${t.id}" style="
              display:inline-block;
              padding:10px 14px;
              border-radius:12px;
              border:1px solid rgba(255,255,255,.15);
              background: rgba(255,255,255,.08);
              color:#fff;
              text-decoration:none;
            ">Открыть</a>
          </p>
        </article>
      `;
    })
    .join("");
}

function applyFilters() {
  const gameId = (elGame.value || "").trim();         // id игры
  const status = (elStatus.value || "").trim();       // registration/ongoing/finished
  const from = elFrom.value ? new Date(elFrom.value) : null;
  const to = elTo.value ? new Date(elTo.value) : null;
  const q = (elQ.value || "").trim().toLowerCase();

  const filtered = ALL_TOURNAMENTS.filter((t) => {
    // game filter
    if (gameId) {
      // t.game может быть числом или строкой
      if (String(t.game) !== String(gameId)) return false;
    }

    // status filter
    if (status) {
      if (normalizeStatus(t.status) !== normalizeStatus(status)) return false;
    }

    // date filter: ориентируемся по start_date
    const start = t.start_date ? new Date(String(t.start_date).slice(0, 10)) : null;
    if (from && start && start < from) return false;
    if (to && start && start > to) return false;

    // search by name
    if (q) {
      const name = (t.name || "").toLowerCase();
      if (!name.includes(q)) return false;
    }

    return true;
  });

  renderTournaments(filtered);
}

function resetFilters() {
  elGame.value = "";
  elStatus.value = "";
  elFrom.value = "";
  elTo.value = "";
  elQ.value = "";
  renderTournaments(ALL_TOURNAMENTS);
}

async function safeFetchJson(url) {
  const res = await fetch(url, { headers: { "Accept": "application/json" } });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} for ${url}\n${text.slice(0, 300)}`);
  }
  return res.json();
}

async function loadGames() {
  // Ожидаем /api/games/
  const data = await safeFetchJson(`${API_BASE}/games/`);
  ALL_GAMES = Array.isArray(data) ? data : data.results || [];

  // Заполняем select
  elGame.innerHTML = `<option value="">Все</option>` + ALL_GAMES
    .map((g) => `<option value="${g.id}">${g.title}</option>`)
    .join("");
}

async function loadTournaments() {
  // Ожидаем /api/tournaments/
  const data = await safeFetchJson(`${API_BASE}/tournaments/`);
  ALL_TOURNAMENTS = Array.isArray(data) ? data : data.results || [];
  renderTournaments(ALL_TOURNAMENTS);
}

function wireEvents() {
  // Кнопки
  btnApply?.addEventListener("click", applyFilters);
  btnReset?.addEventListener("click", resetFilters);

  // Enter в поле поиска — тоже применяет
  elQ?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      applyFilters();
    }
  });

  // Автоприменение при смене селектов/дат (по желанию — удобно)
  elGame?.addEventListener("change", applyFilters);
  elStatus?.addEventListener("change", applyFilters);
  elFrom?.addEventListener("change", applyFilters);
  elTo?.addEventListener("change", applyFilters);
}

async function init() {
  try {
    wireEvents();
    renderEmpty("Загрузка турниров…");

    await loadGames();
    await loadTournaments();
  } catch (err) {
    console.error(err);
    renderEmpty("Ошибка загрузки данных. Проверь API и консоль.");
  }
}

init();
