// Router/Router.js — mini SPA avec guards (auth/admin)
import { updateHeaderAuth, getToken, getRoles } from "/js/header-auth.js";

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

const protectedPaths = new Set(["/account", "/allResa", "/reserver"]);
const adminOnlyPaths = new Set(["/stats"]);

function normalizePath(path) {
  if (!path) return "/";
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

async function loadFragment(url) {
  const res = await fetch(url, { headers: { Accept: "text/html" } });
  if (!res.ok) throw new Error(`${res.status} on ${url}`);
  return res.text();
}

function setActiveNav(path) {
  document.querySelectorAll("nav a.nav-link").forEach((a) => {
    const href = a.getAttribute("href") || "";
    a.classList.toggle("active", normalizePath(href) === path);
  });
}

async function render(path) {
  const target = document.getElementById("main-page");
  if (!target) return;

  try {
    const html = await loadFragment(routes[path] || routes["/404"]);
    target.innerHTML = html;
    window.scrollTo({ top: 0, behavior: "instant" });
    updateHeaderAuth();
    attachLinkInterception(); // pour les nouveaux liens injectés
  } catch (e) {
    console.error(e);
    target.innerHTML = `<section class="container py-4"><h1>Oups</h1><p>Impossible de charger la page.</p></section>`;
  }

  setActiveNav(path);
}

export async function navigate(path, { replace = false } = {}) {
  path = normalizePath(path);

  const token = getToken();
  const roles = getRoles();
  console.debug("[guard]", { path, authed: !!token, roles });

  if (protectedPaths.has(path) && !token) {
    path = "/signin";
  } else if (adminOnlyPaths.has(path) && !roles.includes("ROLE_ADMIN")) {
    console.warn("Admin guard → redirect /", roles);
    path = "/";
  }

  if (replace) history.replaceState({ path }, "", path);
  else history.pushState({ path }, "", path);

  await render(path);
}

function attachLinkInterception() {
  document.querySelectorAll('a[href^="/"]').forEach((a) => {
    if (a.dataset.routerBound === "1") return;
    a.dataset.routerBound = "1";
    a.addEventListener("click", (e) => {
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

window.addEventListener("app:signedout", () => {
  navigate("/", { replace: true });
});

document.addEventListener("DOMContentLoaded", () => {
  attachLinkInterception();
  const initial = normalizePath(location.pathname);
  if (!routes[initial]) navigate("/404", { replace: true });
  else navigate(initial, { replace: true });
});
