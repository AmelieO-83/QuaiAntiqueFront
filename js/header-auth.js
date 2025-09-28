// /js/header-auth.js
import { getToken, logout, isAdmin, getMeCached } from "/src/api.js";

function authed() {
  return !!getToken();
}

export async function refreshAuthUI() {
  const hasToken = authed();
  document
    .querySelectorAll('[data-show="connected"]')
    .forEach((el) => (el.style.display = hasToken ? "" : "none"));
  document
    .querySelectorAll('[data-show="disconnected"]')
    .forEach((el) => (el.style.display = hasToken ? "none" : ""));

  // admin
  let admin = false;
  if (hasToken) {
    try {
      admin = await isAdmin();
    } catch {
      admin = false;
    }
  }
  document
    .querySelectorAll('[data-show="admin"]')
    .forEach((el) => (el.style.display = admin ? "" : "none"));
}

function wireLogout() {
  const btn = document.getElementById("signout-btn");
  if (!btn) return;
  btn.addEventListener("click", (e) => {
    e.preventDefault();
    logout();
    refreshAuthUI();
    history.pushState({}, "", "/signin");
    dispatchEvent(new PopStateEvent("popstate"));
  });
}

// init + réactions
refreshAuthUI();
wireLogout();
window.addEventListener("storage", (e) => {
  if (e.key === "api_token") refreshAuthUI();
});
window.addEventListener("spa:navigated", refreshAuthUI);
