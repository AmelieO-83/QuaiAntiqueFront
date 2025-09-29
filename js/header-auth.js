// js/header-auth.js
// Affiche/masque les éléments du header selon connexion & rôles.
// Requiert localStorage.api_token (string) et localStorage.roles (JSON.stringify([...])).

const $$ = (sel) => Array.from(document.querySelectorAll(sel));

export function getToken() {
  return localStorage.getItem("api_token") || "";
}

export function getRoles() {
  // essaie localStorage puis sessionStorage, tolère plusieurs formats
  const raw = localStorage.getItem("roles") ?? sessionStorage.getItem("roles");
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    if (Array.isArray(v)) return v;
    if (v && Array.isArray(v.roles)) return v.roles;
  } catch (_) {}
  return [];
}

export function updateHeaderAuth() {
  const isConnected = !!getToken();
  const roles = getRoles();
  const isUser = roles.includes("ROLE_USER");
  const isAdmin = roles.includes("ROLE_ADMIN");

  $$('[data-show="connected"]').forEach(
    (el) => (el.style.display = isConnected ? "" : "none")
  );
  $$('[data-show="disconnected"]').forEach(
    (el) => (el.style.display = !isConnected ? "" : "none")
  );
  $$('[data-show="user"]').forEach(
    (el) => (el.style.display = isConnected && isUser ? "" : "none")
  );
  $$('[data-show="admin"]').forEach(
    (el) => (el.style.display = isConnected && isAdmin ? "" : "none")
  );
}

function attachSignout() {
  const btn = document.getElementById("signout-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    localStorage.removeItem("api_token");
    localStorage.removeItem("roles");
    updateHeaderAuth();
    window.dispatchEvent(new CustomEvent("app:signedout"));
  });
}

// Init
document.addEventListener("DOMContentLoaded", () => {
  updateHeaderAuth();
  attachSignout();
});

// Si d'autres modules modifient auth/roles, ils déclenchent cet event :
window.addEventListener("app:auth-updated", updateHeaderAuth);
