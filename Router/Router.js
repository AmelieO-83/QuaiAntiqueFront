// Router/Router.js
// Mini SPA router basé sur History API : charge des fragments HTML dans #main-page
// Gère les routes protégées (connecté / admin).

import { updateHeaderAuth } from "/js/header-auth.js";

const routes = {
  "/": "/pages/home.html",
  "/galerie": "/pages/galerie.html",
  "/carte": "/pages/carte.html",
  "/allResa": "/pages/reservations/allResa.html",
  "/reserver": "/pages/reservations/reserver.html",
  "/account": "/pages/auth/account.html",
  "/signin": "/pages/auth/signin.html",
  "/signup": "/pages/auth/signup.html",
  "/stats": "/pages/stats.html",
  "/404": "/pages/404.html",
};

// Chemins protégés
const protectedPaths = new Set(["/account", "/allResa", "/reserver"]);
const adminOnlyPaths = new Set(["/stats"]);

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

function normalizePath(path) {
  if (!path) return "/";
  // enlève éventuel trailing slash (sauf racine)
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

async function loadFragment(url) {
  const res = await fetch(url, { headers: { Accept: "text/html" } });
  if (!res.ok) throw new Error(`${res.status} on ${url}`);
  return res.text();
}

function setActiveNav(path) {
  const links = document.querySelectorAll("nav a.nav-link");
  links.forEach((a) => {
    const href = a.getAttribute("href");
    if (!href) return;
    a.classList.toggle("active", normalizePath(href) === path);
  });
}

async function render(path) {
  const target = document.getElementById("main-page");
  if (!target) return;

  const fragmentUrl = routes[path] || routes["/404"];
  try {
    const html = await loadFragment(fragmentUrl);
    target.innerHTML = html;
    window.scrollTo({ top: 0, behavior: "instant" });

    // ré-attacher éventuellement des comportements header
    updateHeaderAuth();

    // Ré-intercepter les liens nouvellement insérés
    attachLinkInterception();
  } catch (e) {
    target.innerHTML = `<section class="container py-4"><h1>Oups</h1><p>Impossible de charger la page.</p></section>`;
    console.error(e);
  }

  setActiveNav(path);
}

export async function navigate(path, { replace = false } = {}) {
  path = normalizePath(path);

  // Guards
  const token = getToken();
  const roles = getRoles();

  if (protectedPaths.has(path) && !token) {
    path = "/signin";
  } else if (adminOnlyPaths.has(path) && !roles.includes("ROLE_ADMIN")) {
    path = "/";
  }

  if (replace) {
    history.replaceState({ path }, "", path);
  } else {
    history.pushState({ path }, "", path);
  }
  await render(path);
}

function attachLinkInterception() {
  // Intercepte tous les <a> internes (href commençant par "/")
  document.querySelectorAll('a[href^="/"]').forEach((a) => {
    // Evite de doubler les listeners
    if (a.dataset.routerBound === "1") return;
    a.dataset.routerBound = "1";

    a.addEventListener("click", (e) => {
      // ignore si modifieur (cmd/ctrl) ou target=_blank
      if (e.metaKey || e.ctrlKey || a.target === "_blank") return;
      e.preventDefault();
      const href = a.getAttribute("href");
      if (href) navigate(href);
    });
  });
}

window.addEventListener("popstate", (ev) => {
  const path = normalizePath(ev.state?.path || location.pathname);
  render(path);
});

// Quand on se déconnecte (émis par header-auth)
window.addEventListener("app:signedout", () => {
  navigate("/", { replace: true });
});

// Démarrage
document.addEventListener("DOMContentLoaded", () => {
  attachLinkInterception();
  const initialPath = normalizePath(location.pathname);
  // Si la route n'existe pas, aller 404
  if (!routes[initialPath]) {
    navigate("/404", { replace: true });
  } else {
    navigate(initialPath, { replace: true });
  }
});
