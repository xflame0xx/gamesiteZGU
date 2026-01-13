import { API_BASE } from "./api.js";
import { getToken, clearToken, authHeaders } from "./auth.js";
import { apiMe, apiLogout } from "./api_auth.js";

const msg = document.getElementById("msg");
const crudBox = document.getElementById("crudBox");
const logoutBtn = document.getElementById("logout");

function setMessage(text, type) {
  if (!msg) return;
  msg.className = "muted" + (type ? ` ${type}` : "");
  msg.textContent = text;
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

if (!getToken()) {
  window.location.href = "./login.html";
}

logoutBtn?.addEventListener("click", async () => {
  await apiLogout();
  window.location.href = "./login.html";
});

const RESOURCES = {
  games: { title: "Игры", url: `${API_BASE}/games/`, fields: ["title", "genre"] },
  tournaments: { title: "Турниры", url: `${API_BASE}/tournaments/`, fields: ["name", "game", "start_date", "end_date", "prize_pool", "format", "status"] },
  teams: { title: "Команды", url: `${API_BASE}/teams/`, fields: ["name", "logo_url", "country", "is_approved"] },
  players: { title: "Игроки", url: `${API_BASE}/players/`, fields: ["nickname", "real_name", "team", "role"] },
  matches: { title: "Матчи", url: `${API_BASE}/matches/`, fields: ["tournament", "team1", "team2", "match_date", "round", "status"] },
};

let currentTab = "games";

async function fetchJSON(url) {
  const res = await fetch(url, { headers: { ...authHeaders() } });
  if (res.status === 401) return { _unauth: true };
  if (res.status === 403) return { _forbidden: true };
  const data = await res.json().catch(() => null);
  if (!res.ok) return { _error: true, data };
  return data;
}

async function postJSON(url, payload, method = "POST") {
  const res = await fetch(url, {
    method,
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.detail || "Ошибка сохранения";
    throw new Error(msg);
  }
  return data;
}

async function del(url) {
  const res = await fetch(url, { method: "DELETE", headers: { ...authHeaders() } });
  if (res.status === 401) throw new Error("Не авторизован");
  if (res.status === 403) throw new Error("Нет прав");
  if (!res.ok) throw new Error("Ошибка удаления");
  return true;
}

function renderForm(resourceKey, item = null) {
  const r = RESOURCES[resourceKey];
  const isEdit = !!item;

  const fieldsHTML = r.fields.map((f) => {
    const val = item ? item[f] : "";
    return `
      <label style="display:block; margin:10px 0;">
        <div class="muted" style="margin-bottom:6px;">${esc(f)}</div>
        <input class="search__input" name="${esc(f)}" value="${esc(val)}" />
      </label>
    `;
  }).join("");

  return `
    <div class="panel" style="margin-top:14px;">
      <div class="panel__head">
        <h3 class="panel__title">${isEdit ? "Редактирование" : "Создание"}: ${esc(r.title)}</h3>
      </div>
      <form id="crudForm">
        ${fieldsHTML}
        <div style="display:flex; gap:10px; margin-top:12px;">
          <button class="btn" type="submit">${isEdit ? "Сохранить" : "Создать"}</button>
          <button class="btn btn--ghost" type="button" id="cancelBtn">Отмена</button>
        </div>
      </form>
    </div>
  `;
}

function renderTable(resourceKey, items) {
  const r = RESOURCES[resourceKey];

  const head = `
    <tr>
      <th style="text-align:left; padding:8px;">id</th>
      ${r.fields.map(f => `<th style="text-align:left; padding:8px;">${esc(f)}</th>`).join("")}
      <th style="text-align:left; padding:8px;">Действия</th>
    </tr>
  `;

  const rows = (items || []).map((it) => `
    <tr>
      <td style="padding:8px; border-top:1px solid rgba(255,255,255,.12);">${esc(it.id)}</td>
      ${r.fields.map(f => `<td style="padding:8px; border-top:1px solid rgba(255,255,255,.12);">${esc(it[f])}</td>`).join("")}
      <td style="padding:8px; border-top:1px solid rgba(255,255,255,.12);">
        <button class="btn btn--ghost" data-edit="${esc(it.id)}" type="button">Edit</button>
        <button class="btn btn--ghost" data-del="${esc(it.id)}" type="button">Delete</button>
      </td>
    </tr>
  `).join("");

  return `
    <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
      <h3 style="margin:0;">${esc(r.title)}</h3>
      <button class="btn" id="createBtn" type="button">+ Создать</button>
    </div>

    <div style="overflow:auto; margin-top:12px;">
      <table style="width:100%; border-collapse:collapse;">
        <thead>${head}</thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

async function loadTab(resourceKey) {
  currentTab = resourceKey;
  const r = RESOURCES[resourceKey];

  setMessage("Загрузка…");

  const me = await apiMe();
  if (!me) { clearToken(); window.location.href = "./login.html"; return; }
  if (!me.is_staff) {
    setMessage("Доступ запрещён: нужен staff/superuser.", "err");
    return;
  }

  const data = await fetchJSON(r.url);

  if (data._unauth) { clearToken(); window.location.href = "./login.html"; return; }
  if (data._forbidden) { setMessage("Нет прав (403).", "err"); return; }

  const items = Array.isArray(data) ? data : (data.results ?? []);
  setMessage(`OK: ${r.title} (${items.length})`, "ok");

  crudBox.innerHTML = renderTable(resourceKey, items);

  // handlers
  document.getElementById("createBtn")?.addEventListener("click", () => {
    crudBox.insertAdjacentHTML("beforeend", renderForm(resourceKey, null));
    wireForm(resourceKey, null);
  });

  crudBox.querySelectorAll("[data-edit]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-edit");
      const item = items.find(x => String(x.id) === String(id));
      crudBox.insertAdjacentHTML("beforeend", renderForm(resourceKey, item));
      wireForm(resourceKey, item);
    });
  });

  crudBox.querySelectorAll("[data-del]").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del");
      if (!confirm(`Удалить id=${id}?`)) return;
      try {
        await del(`${r.url}${id}/`);
        await loadTab(resourceKey);
      } catch (e) {
        setMessage(e.message || "Ошибка удаления", "err");
      }
    });
  });
}

function wireForm(resourceKey, item) {
  const r = RESOURCES[resourceKey];
  const form = document.getElementById("crudForm");
  const cancel = document.getElementById("cancelBtn");

  cancel?.addEventListener("click", () => {
    form?.closest(".panel")?.remove();
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fd = new FormData(form);
    const payload = {};
    r.fields.forEach((f) => {
      payload[f] = fd.get(f);
    });

    try {
      if (item?.id) {
        await postJSON(`${r.url}${item.id}/`, payload, "PATCH");
      } else {
        await postJSON(r.url, payload, "POST");
      }
      await loadTab(resourceKey);
    } catch (err) {
      setMessage(err.message || "Ошибка сохранения", "err");
    }
  });
}

// tabs
document.querySelectorAll("[data-tab]").forEach((b) => {
  b.addEventListener("click", () => loadTab(b.dataset.tab));
});

// default
loadTab("games").catch(() => setMessage("Ошибка загрузки админки.", "err"));
