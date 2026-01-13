// assets/js/header_actions.js
import { getToken, clearToken, authHeaders } from "./auth.js";
import { API_BASE } from "./api.js";

export async function initHeaderActions(options = {}) {
  const {
    loginHref = "./login.html",
    registerHref = "./register.html",
    cabinetHref = "./cabinet.html",
    adminHref = "./admin.html",
    afterLogoutHref = "./index.html",
  } = options;

  const host = document.getElementById("headerActions");
  if (!host) return;

  const link = (href, text, className) => {
    const a = document.createElement("a");
    a.href = href;
    a.textContent = text;
    if (className) a.className = className;
    return a;
  };

  const button = (text, className) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = text;
    if (className) b.className = className;
    return b;
  };

  // Подстраиваемся под стили страницы:
  // - если есть .btn -> делаем кнопками
  // - иначе если есть .nav__link -> делаем nav-ссылками
  const hasBtn = !!document.querySelector(".btn");
  const hasNavLink = !!document.querySelector(".nav__link");

  const clsPrimary = hasBtn ? "btn btn--ghost" : (hasNavLink ? "nav__link" : "");
  const clsSecondary = hasBtn ? "btn" : (hasNavLink ? "nav__link" : "");
  const clsLogout = hasBtn ? "btn btn--ghost" : (hasNavLink ? "nav__link" : "");

  function renderGuest() {
    host.innerHTML = "";
    host.appendChild(link(loginHref, "Вход", clsPrimary));
    host.appendChild(link(registerHref, "Регистрация", clsSecondary));
  }

  function renderUser(isAdmin) {
    host.innerHTML = "";

    // ✅ ВАЖНО: админ видит ТОЛЬКО "Админ" (без кабинета)
    if (isAdmin) {
      host.appendChild(link(adminHref, "Админ", clsPrimary));
    } else {
      host.appendChild(link(cabinetHref, "Кабинет", clsPrimary));
    }

    const out = button("Выйти", clsLogout);
    out.addEventListener("click", async () => {
      try {
        await fetch(`${API_BASE}/auth/logout/`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
        });
      } catch (_) {}

      clearToken();
      window.location.href = afterLogoutHref;
    });

    host.appendChild(out);
  }

  const token = getToken();
  if (!token) {
    renderGuest();
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/auth/me/`, {
      headers: { ...authHeaders() },
    });

    if (res.status === 401) {
      clearToken();
      renderGuest();
      return;
    }

    // Если бэк отвалился/ошибка — просто считаем “обычный пользователь”
    if (!res.ok) {
      renderUser(false);
      return;
    }

    const me = await res.json();
    const isAdmin = !!(me?.is_staff || me?.is_superuser);
    renderUser(isAdmin);
  } catch (_) {
    renderUser(false);
  }
}
