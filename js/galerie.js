// /js/galerie.js
import {
  fetchPictures,
  uploadPicture,
  deletePicture,
  getApiBase,
  getToken,
} from "/src/api.js";

// ---------- Utils ----------
const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
const $ = (sel, ctx = document) => ctx.querySelector(sel);

// Fallbacks locaux si l’API ne donne pas d’URL d’image
const localImages = [
  "/images/chef.jpg",
  "/images/resto.jpg",
  "/images/scene.jpg",
  "/images/food.jpg",
  "/images/saumon.jpg",
  "/images/vins.jpg",
];

// ---------- Restaurants (select par NOM) ----------
async function populateRestaurants() {
  const base = getApiBase().replace(/\/+$/, "");
  const sel = document.getElementById("RestaurantSelect");
  if (!sel) return;

  try {
    const token = getToken();
    const res = await fetch(`${base}/api/restaurant`, {
      headers: {
        Accept: "application/json",
        ...(token ? { "X-AUTH-TOKEN": token } : {}), // 👈 ajoute le token si présent
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const list = Array.isArray(json) ? json : json["hydra:member"] || [];
    if (!list.length) {
      sel.innerHTML = `<option value="" disabled selected>— Aucun restaurant —</option>`;
      return;
    }
    sel.innerHTML =
      `<option value="" disabled>— Sélectionner —</option>` +
      list
        .map(
          (r) =>
            `<option value="${r.id}">${r.name ?? "Resto #" + r.id}</option>`
        )
        .join("");

    const first = sel.querySelector('option[value]:not([value=""])');
    if (first) first.selected = true;
  } catch (e) {
    console.warn("Restaurants indisponibles", e);
    sel.innerHTML = `<option value="" disabled selected>— Indisponible —</option>`;
  }
}

// ---------- URL d’image ----------
function pictureUrl(pic, index = 0) {
  if (pic.url) return pic.url;
  if (pic.path) {
    if (pic.path.startsWith("http")) return pic.path;
    return `${getApiBase().replace(/\/+$/, "")}${pic.path}`;
  }
  // Si plus tard tu exposes un endpoint fichier par slug :
  // if (pic.slug) return `${getApiBase().replace(/\/+$/, "")}/uploads/${pic.slug}.jpg`;

  // Fallback local
  return localImages[index % localImages.length];
}

// ---------- Rendu ----------
function renderPictures(list) {
  const grid = $(".row.row-cols-2");
  if (!grid) return;

  if (!Array.isArray(list) || list.length === 0) {
    grid.innerHTML = `
      <div class="col-12">
        <div class="alert alert-info">Aucune photo pour le moment.</div>
      </div>`;
    window.dispatchEvent(new Event("spa:navigated"));
    return;
  }

  grid.innerHTML = list
    .map((pic, i) => {
      const imgSrc = pictureUrl(pic, i);
      const title = pic.title ?? "Photo";
      const id = pic.id;

      return `
      <div class="col">
        <div class="image-card text-white position-relative">
          <img src="${imgSrc}" class="rounded w-100" alt="${title}" />
          <p class="titre-image">${title}</p>

          <!-- Boutons admin (masqués si non-admin) -->
          <div class="action-image-buttons" data-show="admin">
            <button type="button"
                    class="btn btn-outline-light btn-sm delete-btn"
                    data-id="${id}"
                    data-title="${title}"
                    data-img="${imgSrc}"
                    data-bs-toggle="modal"
                    data-bs-target="#DeletePhotoModal">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      </div>`;
    })
    .join("");

  // Demande au header d’évaluer les droits sur ces nouveaux éléments
  window.dispatchEvent(new Event("spa:navigated"));
}

// ---------- Chargement ----------
async function loadGallery() {
  try {
    const pics = await fetchPictures();
    const list = Array.isArray(pics) ? pics : pics?.["hydra:member"] || [];
    renderPictures(list);
    window.dispatchEvent(new Event("spa:navigated"));
  } catch (e) {
    console.error(e);
    const grid = $(".row.row-cols-2");
    if (grid) {
      grid.insertAdjacentHTML(
        "beforebegin",
        `<div class="alert alert-warning">Impossible de charger la galerie pour le moment.</div>`
      );
    }
  }
}

// ---------- Upload (formulaire “Ajouter une photo”) ----------
function wireUploadForm() {
  const form = $("#photoForm");
  if (!form) return;

  // UX : désactiver le bouton tant qu’aucun fichier
  const saveBtn = $("#SavePhotoBtn");
  const fileInput = form.querySelector('[name="image"]');
  saveBtn?.setAttribute("disabled", "disabled");
  fileInput?.addEventListener("change", () => {
    if (fileInput.files && fileInput.files[0])
      saveBtn.removeAttribute("disabled");
    else saveBtn.setAttribute("disabled", "disabled");
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = $("#SavePhotoBtn");
    btn?.setAttribute("disabled", "disabled");

    try {
      const title = form.querySelector('[name="title"]')?.value?.trim() || "";
      const file = form.querySelector('[name="image"]')?.files?.[0];
      const ridRaw = document.getElementById("RestaurantSelect")?.value || "";
      const restaurantId = ridRaw ? Number(ridRaw) : NaN;

      if (!file) throw new Error("Choisis une image.");
      if (!restaurantId || Number.isNaN(restaurantId)) {
        throw new Error("Renseigne un restaurant valide.");
      }

      await uploadPicture({ title, file, restaurantId });

      // Ferme la modale
      const modalEl = $("#EditionPhotoModal");
      const modal =
        bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.hide();

      form.reset();
      await loadGallery();
      window.dispatchEvent(new Event("spa:navigated"));
    } catch (err) {
      console.error(err);
      alert(err.message || "Échec de l’upload.");
    } finally {
      btn?.removeAttribute("disabled");
    }
  });

  // Repeupler la liste au moment où la modale s’ouvre
  const editionModal = document.getElementById("EditionPhotoModal");
  editionModal?.addEventListener("shown.bs.modal", populateRestaurants);
}

// ---------- Suppression ----------
function wireDeleteModal() {
  const deleteModal = $("#DeletePhotoModal");
  const delForm = $("#deleteForm");
  const idInput = $("#DeleteIdInput");
  const prevImg = $("#DeletePreviewImg");
  const prevTitle = $("#DeletePreviewTitle");

  // Ouverture : pré-remplir
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".delete-btn");
    if (!btn) return;
    const id = btn.getAttribute("data-id");
    const title = btn.getAttribute("data-title") || "";
    const img = btn.getAttribute("data-img") || "";

    idInput.value = id || "";
    prevImg.src = img || "";
    prevTitle.textContent = title || "";
  });

  // Confirmer suppression
  delForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = idInput.value;
    if (!id) return;

    const submitBtn = delForm.querySelector('[type="submit"]');
    submitBtn?.setAttribute("disabled", "disabled");

    try {
      await deletePicture(id);

      // Ferme la modale
      const modal =
        bootstrap.Modal.getInstance(deleteModal) ||
        new bootstrap.Modal(deleteModal);
      modal.hide();

      await loadGallery();
      window.dispatchEvent(new Event("spa:navigated"));
    } catch (err) {
      console.error(err);
      alert("Échec de la suppression.");
    } finally {
      submitBtn?.removeAttribute("disabled");
    }
  });
}

// ---------- Bootstrap ----------
populateRestaurants();
loadGallery();
wireUploadForm();
wireDeleteModal();
