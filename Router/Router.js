// Router/Router.js
import { getToken } from "/src/api.js";

// Routes -> fichiers HTML
const routes = {
  "/": "/pages/home.html",
  "/galerie": "/pages/galerie.html",
  "/carte": "/pages/carte.html",
  "/allResa": "/pages/reservations/allResa.html",
  "/reserver": "/pages/reservations/reserver.html",
  "/account": "/pages/auth/account.html",
  "/signin": "/pages/auth/signin.html",
  "/signup": "/pages/auth/signup.html",
};

// Chemins qui nécessitent d’être connecté
const protectedPaths = new Set(["/account", "/allResa", "/reserver"]);

function requireAuth(pathname) {
  if (protectedPaths.has(pathname) && !getToken()) {
    history.replaceState({}, "", "/signin");
    loadPage("/signin");
    return false;
  }
  return true;
}

function highlightActive(pathname) {
  document.querySelectorAll("header a.nav-link").forEach((link) => {
    const active = link.getAttribute("href") === pathname;
    link.classList.toggle("active", active);
  });
}

function isInternalLink(a) {
  return (
    a.origin === window.location.origin &&
    !a.target &&
    !a.hasAttribute("download")
  );
}

async function initPage(pathname) {
  try {
    switch (pathname) {
      case "/galerie":
        await import("/js/galerie.js");
        break;
      case "/reserver":
        await import("/js/reservation.js");
        break;
      case "/signin":
        await import("/js/auth/signin.js");
        break;
      case "/signup":
        await import("/js/auth/signup.js");
        break;
      case "/account":
        await import("/js/auth/account.js");
        break;
      case "/carte":
        await import("/js/carte.js");
        break;
      default:
        // rien
        break;
    }
  } catch (e) {
    console.error("Init page error:", e);
  }
}

export async function loadPage(pathname) {
  const path = routes[pathname] || "/pages/404.html";

  // Auth guard
  if (!requireAuth(pathname)) return;

  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`HTTP ${res.status} on ${path}`);
    const html = await res.text();

    document.getElementById("main-page").innerHTML = html;
    highlightActive(pathname);

    // Initialiser le JS de la page injectée
    await initPage(pathname);

    // Signaler que la page est prête : script.js écoutera cet évènement
    window.dispatchEvent(new Event("spa:navigated"));
  } catch (e) {
    console.error(e);
    document.getElementById(
      "main-page"
    ).innerHTML = `<div class="container py-5"><div class="alert alert-danger">Erreur de chargement de la page.</div></div>`;
  }
}

function onLinkClick(e) {
  const a = e.target.closest("a[href]");
  if (!a || !isInternalLink(a)) return;

  const url = new URL(a.href);
  if (url.pathname === window.location.pathname) {
    e.preventDefault();
    return;
  }
  e.preventDefault();
  window.history.pushState({}, "", url.pathname);
  loadPage(url.pathname);
}

function onPopState() {
  loadPage(window.location.pathname);
}

// init SPA
window.addEventListener("popstate", onPopState);
document.addEventListener("click", onLinkClick);
loadPage(window.location.pathname);
