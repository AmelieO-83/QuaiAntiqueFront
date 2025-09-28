// js/script.js
// Gère l’affichage conditionnel de la navbar et quelques actions globales.

import { getToken, isAdmin, logout } from "/src/api.js";

/** Petite aide pour (dé)montrer des éléments */
function setVisible(nodeList, on) {
  nodeList.forEach((el) => {
    // "" = valeur par défaut du navigateur (respecte Bootstrap)
    el.style.display = on ? "" : "none";
  });
}

/** Applique la visibilité selon l’état d’auth et le rôle */
export async function applyAuthVisibility() {
  const connected = !!getToken();
  let admin = false;

  if (connected) {
    try {
      admin = await isAdmin();
    } catch {
      admin = false;
    }
  }

  const user = connected && !admin;

  setVisible(document.querySelectorAll('[data-show="connected"]'), connected);
  setVisible(
    document.querySelectorAll('[data-show="disconnected"]'),
    !connected
  );
  setVisible(document.querySelectorAll('[data-show="admin"]'), admin);
  setVisible(document.querySelectorAll('[data-show="user"]'), user);
}

/** Déconnexion (bouton présent dans le header) */
function wireSignout() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("#signout-btn");
    if (!btn) return;

    // 1) purge le token
    logout();

    // 2) met à jour l’affichage
    applyAuthVisibility();

    // 3) retourne à l’accueil (SPA)
    history.pushState({}, "", "/");
    window.dispatchEvent(new Event("spa:navigated"));
  });
}

/** Init global */
function initGlobalUI() {
  // Au premier chargement du site
  document.addEventListener("DOMContentLoaded", applyAuthVisibility);

  // Après chaque navigation SPA (le Router émet cet évènement)
  window.addEventListener("spa:navigated", applyAuthVisibility);

  wireSignout();
}

initGlobalUI();
