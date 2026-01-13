import { getToken, clearToken } from "./auth.js";

export function mountHeaderAuth(containerSelector = ".header__actions") {
  const box = document.querySelector(containerSelector);
  if (!box) return;

  const token = getToken();

  if (!token) {
    box.innerHTML = `
      <a class="btn btn--ghost" href="./login.html">Вход</a>
      <a class="btn" href="./register.html">Регистрация</a>
    `;
    return;
  }

  box.innerHTML = `
    <a class="btn btn--ghost" href="./cabinet.html">Кабинет</a>
    <button class="btn" type="button" id="btnLogout">Выйти</button>
  `;

  const btn = document.getElementById("btnLogout");
  btn?.addEventListener("click", () => {
    clearToken();
    window.location.href = "./index.html";
  });
}