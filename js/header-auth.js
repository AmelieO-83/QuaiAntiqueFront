// js/header-auth.js
// Affiche/masque les éléments du header selon l'état de connexion et les rôles.
// Requiert que le login stocke: localStorage.api_token et localStorage.roles (JSON.stringify([...])).

const qsa = (sel) => Array.from(document.querySelectorAll(sel));

function getToken() {
  return localStorage.getItem("api_token") || "";
}
function getRoles() {
  try {
    return JSON.parse(localStorage.getItem("roles") || "[]");
  } catch {
    return [];
  }
}

export function updateHeaderAuth() {
  const isConnected = !!getToken();
  const roles = getRoles();
  const isUser = roles.includes("ROLE_USER");
  const isAdmin = roles.includes("ROLE_ADMIN");

  // connected / disconnected
  qsa('[data-show="connected"]').forEach((el) => {
    el.style.display = isConnected ? "" : "none";
  });
  qsa('[data-show="disconnected"]').forEach((el) => {
    el.style.display = !isConnected ? "" : "none";
  });

  // user
  qsa('[data-show="user"]').forEach((el) => {
    el.style.display = isConnected && isUser ? "" : "none";
  });

  // admin
  qsa('[data-show="admin"]').forEach((el) => {
    el.style.display = isConnected && isAdmin ? "" : "none";
  });
}

// Déconnexion (bouton id="signout-btn")
function attachSignout() {
  const btn = document.getElementById("signout-btn");
  if (!btn) return;
  btn.addEventListener("click", () => {
    // purge minimale
    localStorage.removeItem("api_token");
    localStorage.removeItem("roles");
    updateHeaderAuth();

    // Déclenche un event que le Router peut écouter pour rediriger
    window.dispatchEvent(new CustomEvent("app:signedout"));
  });
}

// Init à chaque chargement
document.addEventListener("DOMContentLoaded", () => {
  updateHeaderAuth();
  attachSignout();
});

// Si d'autres modules modifient les rôles/tokens, ils peuvent émettre cet event.
window.addEventListener("app:auth-updated", updateHeaderAuth);
