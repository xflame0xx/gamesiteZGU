import { apiRegister } from "./api_auth.js";

const form = document.getElementById("regForm");
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
    const email = (fd.get("email") || "").toString().trim();
    const password = (fd.get("password") || "").toString();

    if (!username || !password) {
      setMessage("Заполни username и пароль.", "err");
      return;
    }
    if (password.length < 8) {
      setMessage("Пароль должен быть минимум 8 символов.", "err");
      return;
    }

    setMessage("Регистрируем…");

    try {
      await apiRegister({ username, email, password });
      setMessage("Аккаунт создан. Переходим в кабинет…", "ok");
      window.location.href = "./cabinet.html";
    } catch (err) {
      setMessage(err.message || "Ошибка регистрации.", "err");
    }
  });
}
