import { apiLogin } from "./api_auth.js";

const form = document.getElementById("loginForm");
const msg = document.getElementById("msg");

function setMessage(text, cls) {
  if (!msg) return;
  msg.className = "msg" + (cls ? " " + cls : "");
  msg.textContent = text;
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const fd = new FormData(form);
    const username = (fd.get("username") || "").toString().trim();
    const password = (fd.get("password") || "").toString();

    if (!username || !password) {
      setMessage("Заполни username и пароль.", "err");
      return;
    }

    setMessage("Входим…");

    try {
      const data = await apiLogin({ username, password });
      setMessage("Успешный вход.", "ok");

      // редирект по роли
      if (data.is_staff) {
        window.location.href = "./admin.html";
      } else {
        window.location.href = "./cabinet.html";
      }
    } catch (err) {
      setMessage(err.message || "Ошибка входа.", "err");
    }
  });
}
