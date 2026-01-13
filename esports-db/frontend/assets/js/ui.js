export function formatMoney(value) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("ru-RU").format(n) + " ₽ ";
}

export function formatDateRange(start, end) {
  if (!start && !end) return "—";
  const s = start ? new Date(start) : null;
  const e = end ? new Date(end) : null;

  const fmt = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", year: "numeric" });
  if (s && e) return `${fmt.format(s)} — ${fmt.format(e)}`;
  if (s) return fmt.format(s);
  return fmt.format(e);
}

export function formatDateTime(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("ru-RU", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  return fmt.format(d);
}

export function statusBadge(statusRaw) {
  const s = (statusRaw || "").toLowerCase();
  if (s.includes("ид") || s.includes("active")) return { text: "Идёт", cls: "badge badge--active" };
  if (s.includes("зав") || s.includes("finish")) return { text: "Завершён", cls: "badge badge--finished" };
  return { text: "Предстоящий", cls: "badge badge--upcoming" };
}

export function createSkeletonCards(container, count = 6) {
  container.innerHTML = "";
  for (let i=0; i<count; i++){
    const el = document.createElement("div");
    el.className = "card skeleton";
    el.innerHTML = `
      <div class="card__top">
        <div style="flex:1">
          <div style="height:14px;width:80%;background:rgba(255,255,255,.08);border-radius:10px;"></div>
          <div style="height:12px;width:55%;background:rgba(255,255,255,.06);border-radius:10px;margin-top:10px;"></div>
        </div>
        <div style="height:28px;width:88px;background:rgba(255,255,255,.08);border-radius:999px;"></div>
      </div>
      <div style="height:12px;width:90%;background:rgba(255,255,255,.06);border-radius:10px;"></div>
      <div style="height:12px;width:65%;background:rgba(255,255,255,.06);border-radius:10px;"></div>
    `;
    container.appendChild(el);
  }
}

export function createSkeletonList(container, count = 6) {
  container.innerHTML = "";
  for (let i=0; i<count; i++){
    const el = document.createElement("div");
    el.className = "mini skeleton";
    el.innerHTML = `
      <div style="flex:1">
        <div style="height:14px;width:60%;background:rgba(255,255,255,.08);border-radius:10px;"></div>
        <div style="height:12px;width:40%;background:rgba(255,255,255,.06);border-radius:10px;margin-top:10px;"></div>
      </div>
      <div style="height:18px;width:44px;background:rgba(255,255,255,.08);border-radius:10px;"></div>
    `;
    container.appendChild(el);
  }
}

export function createSkeletonMatches(container, count = 6) {
  container.innerHTML = "";
  for (let i=0; i<count; i++){
    const el = document.createElement("div");
    el.className = "match skeleton";
    el.innerHTML = `
      <div class="match__left">
        <div style="height:14px;width:80%;background:rgba(255,255,255,.08);border-radius:10px;"></div>
        <div style="height:12px;width:65%;background:rgba(255,255,255,.06);border-radius:10px;margin-top:10px;"></div>
      </div>
      <div class="match__right">
        <div style="height:28px;width:90px;background:rgba(255,255,255,.08);border-radius:999px;"></div>
        <div style="height:10px;width:70px;background:rgba(255,255,255,.06);border-radius:10px;"></div>
      </div>
    `;
    container.appendChild(el);
  }
}
