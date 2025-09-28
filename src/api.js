// src/api.js
// ============================================================================
// Config
// ============================================================================
const DEFAULT_API_BASE =
  "https://main-bvxea6i-mvgwmzcr2brk2.fr-3.platformsh.site"; // prod
// Pour dev local : 'http://localhost:8080'

const STORAGE_KEYS = {
  base: "api_base",
  token: "api_token",
};

// Mémoire (avec fallback localStorage)
let API_BASE = localStorage.getItem(STORAGE_KEYS.base) || DEFAULT_API_BASE;
let API_TOKEN = localStorage.getItem(STORAGE_KEYS.token) || "";

// Export utilitaires simples
export function getApiBase() {
  return API_BASE;
}
export function setApiBase(url) {
  API_BASE = url || DEFAULT_API_BASE;
  localStorage.setItem(STORAGE_KEYS.base, API_BASE);
}
export function getToken() {
  return API_TOKEN;
}
export function setToken(token) {
  API_TOKEN = token || "";
  localStorage.setItem(STORAGE_KEYS.token, API_TOKEN);
}
export { API_BASE, API_TOKEN };

// ============================================================================
// HTTP helpers
// ============================================================================
function trimBase() {
  return API_BASE.replace(/\/+$/, "");
}
function authHeaders(extra = {}) {
  return {
    ...(API_TOKEN ? { "X-AUTH-TOKEN": API_TOKEN } : {}),
    ...extra,
  };
}
async function handleJson(res, urlDesc = "") {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} on ${urlDesc}: ${text}`);
  }
  return res.json();
}

// ============================================================================
// Auth — login / logout / register / me cache
// ============================================================================
export async function login({ email, password }) {
  const base = trimBase();
  const paths = ["/api/login", "/api/login_check"];
  const payloads = [
    { email, password },
    { username: email, password },
    { userIdentifier: email, password },
    { identifier: email, password },
  ];

  let lastErr = null;

  for (const path of paths) {
    const url = `${base}${path}`;
    for (const body of payloads) {
      try {
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          lastErr = new Error(
            `HTTP ${res.status} on POST ${path}: ${await res
              .text()
              .catch(() => "")}`
          );
          continue;
        }

        // Token depuis le JSON…
        let data = {};
        try {
          data = await res.json();
        } catch {
          data = {};
        }
        let token =
          data.token ||
          data.apiToken ||
          data.jwt ||
          data.access_token ||
          data["X-AUTH-TOKEN"] ||
          data.key ||
          null;

        // …ou depuis les headers
        if (!token) {
          const hdr =
            res.headers.get("X-AUTH-TOKEN") ||
            res.headers.get("Authorization") ||
            "";
          if (hdr?.toLowerCase().startsWith("bearer ")) token = hdr.slice(7);
          else if (hdr) token = hdr;
        }

        if (!token) {
          lastErr = new Error(
            `Login OK mais token introuvable (chemin ${path}).`
          );
          continue;
        }

        setToken(token);
        clearMeCache();
        return data;
      } catch (e) {
        lastErr = e;
      }
    }
  }
  throw lastErr || new Error("Login échoué (plusieurs formats testés).");
}

export function logout() {
  setToken("");
  clearMeCache();
}

export async function register({ email, password, firstName, lastName }) {
  const url = `${trimBase()}/api/registration`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ email, password, firstName, lastName }),
  });
  return handleJson(res, "POST /api/registration");
}

export async function fetchMe() {
  const url = `${trimBase()}/api/account/me`;
  const res = await fetch(url, { headers: authHeaders() });
  return handleJson(res, "GET /api/account/me");
}
export async function updateMe(partial) {
  const url = `${trimBase()}/api/account/edit`;
  const res = await fetch(url, {
    method: "PATCH",
    headers: authHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(partial),
  });
  return handleJson(res, "PATCH /api/account/edit");
}

// Petit cache /me pour les rôles
let __ME_CACHE = null;
export async function getMeCached(force = false) {
  if (!__ME_CACHE || force) {
    try {
      __ME_CACHE = await fetchMe();
    } catch {
      __ME_CACHE = null;
    }
  }
  return __ME_CACHE;
}
export function clearMeCache() {
  __ME_CACHE = null;
}
export async function isAdmin() {
  const me = await getMeCached();
  return (me?.roles || []).map(String).includes("ROLE_ADMIN");
}

// ============================================================================
// Restaurants (lecture publique)
// ============================================================================
export async function fetchRestaurants() {
  const res = await fetch(`${trimBase()}/api/restaurant`, {
    headers: { Accept: "application/json" },
  });
  return handleJson(res, "GET /api/restaurant");
}

// ============================================================================
// Galerie / Pictures
// ============================================================================
function normalizePicturesPayload(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data["hydra:member"])) return data["hydra:member"];
  return data || [];
}
export async function fetchPictures() {
  const res = await fetch(`${trimBase()}/api/picture`, {
    headers: authHeaders({ Accept: "application/json" }),
  });
  return normalizePicturesPayload(await handleJson(res, "GET /api/picture"));
}

function slugify(str) {
  return (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .substring(0, 80);
}

/** Convertit un File en base64 (exporté pour réutilisation ailleurs). */
export async function fileToBase64(file) {
  if (!file) return null;
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function uploadPicture({ title, file, restaurantId }) {
  const url = `${trimBase()}/api/picture`;
  const imageBase64 = await fileToBase64(file);

  const payload = {
    title: title || "",
    slug: slugify(title || file?.name || "image"),
    restaurantId: Number(restaurantId),
    imageBase64,
    filename: file?.name || null,
    mimeType: file?.type || null,
    size: file?.size ?? null,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: authHeaders({
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
    body: JSON.stringify(payload),
  });
  return handleJson(res, "POST /api/picture");
}

export async function deletePicture(id) {
  const res = await fetch(`${trimBase()}/api/picture/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    const t = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} on DELETE /api/picture/${id}: ${t}`);
  }
  return true;
}

// ============================================================================
// Bookings
// ============================================================================
export async function createBooking(data) {
  const res = await fetch(`${trimBase()}/api/booking`, {
    method: "POST",
    headers: authHeaders({
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
    body: JSON.stringify(data),
  });
  return handleJson(res, "POST /api/booking");
}
export async function fetchMyBookings() {
  const res = await fetch(`${trimBase()}/api/booking`, {
    headers: authHeaders({ Accept: "application/json" }),
  });
  return handleJson(res, "GET /api/booking");
}
export async function cancelBooking(id) {
  const res = await fetch(`${trimBase()}/api/booking/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok && res.status !== 204) {
    const t = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} on DELETE /api/booking/${id}: ${t}`);
  }
  return true;
}

// ============================================================================
// Catégories & Plats (Foods) — Admin requis côté back pour POST/PUT/DELETE
// ============================================================================
export async function fetchCategories() {
  const res = await fetch(`${trimBase()}/api/category`, {
    headers: { Accept: "application/json" },
  });
  return handleJson(res, "GET /api/category");
}

export async function fetchFoods() {
  const res = await fetch(`${trimBase()}/api/food`, {
    headers: { Accept: "application/json" },
  });
  return handleJson(res, "GET /api/food");
}

export async function createFood({
  title,
  description = "",
  price,
  categoryId,
}) {
  const payload = {
    title,
    description,
    price: Number(price),
    categoryIds: [Number(categoryId)],
  };
  const res = await fetch(`${trimBase()}/api/food`, {
    method: "POST",
    headers: authHeaders({
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
    body: JSON.stringify(payload),
  });
  return handleJson(res, "POST /api/food");
}

export async function deleteFood(id) {
  const res = await fetch(`${trimBase()}/api/food/${id}`, {
    method: "DELETE",
    headers: authHeaders({ Accept: "application/json" }),
  });
  if (!res.ok && res.status !== 204) {
    const t = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} on DELETE /api/food/${id}: ${t}`);
  }
  return true;
}

export async function updateFood(
  id,
  { title, description = "", price, categoryId }
) {
  const base = API_BASE.replace(/\/+$/, "");
  const payload = {
    ...(title != null ? { title } : {}),
    ...(description != null ? { description } : {}),
    ...(price != null ? { price: Number(price) } : {}),
    ...(categoryId != null ? { categoryIds: [Number(categoryId)] } : {}),
  };
  const res = await fetch(`${base}/api/food/${id}`, {
    method: "PUT",
    headers: authHeaders({
      "Content-Type": "application/json",
      Accept: "application/json",
    }),
    body: JSON.stringify(payload),
  });
  return handleJson(res, `PUT /api/food/${id}`);
}
