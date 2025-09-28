// js/carte.js
import {
  fetchCategories,
  fetchFoods,
  createFood,
  deleteFood,
  getMeCached,
} from "/src/api.js";

// ---------- helpers DOM ----------
const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
const euro = (n) => `${Number(n).toFixed(0)}€`;

// Catégories “fixes” (IDs côté back)
const CAT_IDS = { entrees: 1, plats: 2, desserts: 3 };
let currentCatKey = "entrees";

// État
let CATEGORIES = [];
let FOODS = [];
let IS_ADMIN = false;

// ---------- Récupération données ----------
async function loadData() {
  // on peut charger en parallèle
  const [cats, foods, me] = await Promise.all([
    fetchCategories(),
    fetchFoods(),
    getMeCached().catch(() => null),
  ]);

  // Normalisation “hydra” éventuelle
  CATEGORIES = Array.isArray(cats) ? cats : cats?.["hydra:member"] || [];
  FOODS = Array.isArray(foods) ? foods : foods?.["hydra:member"] || [];
  IS_ADMIN = !!(me && (me.roles || []).includes("ROLE_ADMIN"));
}

// ---------- Rendu ----------
function render() {
  const root = $("#CarteContent");
  if (!root) return;

  // Tab active visuelle
  $$("#CarteTabs button").forEach((b) =>
    b.classList.toggle("active", b.dataset.cat === currentCatKey)
  );

  const catId = CAT_IDS[currentCatKey];

  const list = FOODS.filter((f) => (f.categoryIds || []).includes(catId)).sort(
    (a, b) => (a.title || "").localeCompare(b.title || "")
  );

  if (!list.length) {
    root.innerHTML =
      '<div class="alert alert-warning">Aucun plat dans cette catégorie pour le moment.</div>';
    window.dispatchEvent(new Event("spa:navigated"));
    return;
  }

  root.innerHTML = list
    .map(
      (f) => `
<div class="row align-items-start py-3 border-bottom">
  <div class="col-10">
    <div class="fw-semibold">${f.title || ""}</div>
    ${
      f.description
        ? `<div class="text-body-secondary small">${f.description}</div>`
        : ""
    }
  </div>
  <div class="col-2 text-end">${euro(f.price)}</div>

  ${
    IS_ADMIN
      ? `
  <div class="col-12 mt-2" data-show="admin" style="display:inline-block">
    <button class="btn btn-sm btn-outline-danger me-2 js-del" data-id="${f.id}" data-title="${f.title}">
      Supprimer
    </button>
    <!-- (optionnel) bouton modifier
    <button class="btn btn-sm btn-outline-secondary js-edit" data-id="${f.id}">Modifier</button>
    -->
  </div>`
      : ""
  }
</div>`
    )
    .join("");

  // signal pour afficher correctement data-show="admin"
  window.dispatchEvent(new Event("spa:navigated"));
}

// ---------- Tabs ----------
function wireTabs() {
  $$("#CarteTabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const key = btn.dataset.cat;
      if (!key || !CAT_IDS[key]) return;
      currentCatKey = key;
      render();
    });
  });
}

// ---------- Modale ajout ----------
function fillCategorySelect() {
  const sel = $("#FoodCategory");
  if (!sel) return;
  sel.innerHTML = `
    <option value="${CAT_IDS.entrees}">Entrées</option>
    <option value="${CAT_IDS.plats}">Plats</option>
    <option value="${CAT_IDS.desserts}">Desserts</option>
  `;
}

function wireCreateForm() {
  const form = $("#foodForm");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = $("#FoodName")?.value?.trim();
    const description = $("#FoodDesc")?.value?.trim() || "";
    const price = Number($("#FoodPrice")?.value || 0);
    const categoryId = Number($("#FoodCategory")?.value);

    if (!name || !price || !categoryId) return;

    const submit = form.querySelector('[type="submit"]');
    submit?.setAttribute("disabled", "disabled");

    try {
      await createFood({ title: name, description, price, categoryId });
      // Ferme la modale
      const modalEl = $("#FoodModal");
      const modal =
        bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modal.hide();

      // recharge & rerender
      await loadData();
      render();
    } catch (err) {
      console.error(err);
      alert("Impossible de créer le plat.");
    } finally {
      submit?.removeAttribute("disabled");
      form.reset();
    }
  });
}

// ---------- Suppression ----------
function wireDelete() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest(".js-del");
    if (!btn) return;

    const id = btn.dataset.id;
    const title = btn.dataset.title || "ce plat";

    // Remplir la modale
    $("#DeleteFoodId").value = id;
    $("#DeleteFoodTitle").textContent = title;

    const modalEl = $("#DeleteFoodModal");
    const modal =
      bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
    modal.show();
  });

  $("#deleteFoodForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const id = $("#DeleteFoodId").value;
    if (!id) return;

    const submit = $("#deleteFoodForm [type=submit]");
    submit?.setAttribute("disabled", "disabled");
    try {
      await deleteFood(id);
      const modalEl = $("#DeleteFoodModal");
      (
        bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl)
      ).hide();

      await loadData();
      render();
    } catch (err) {
      console.error(err);
      alert("Suppression impossible.");
    } finally {
      submit?.removeAttribute("disabled");
    }
  });
}

// ---------- Bootstrap page ----------
(async function initCarte() {
  try {
    fillCategorySelect();
    wireTabs();
    wireCreateForm();
    wireDelete();

    await loadData();
    render();
  } catch (err) {
    console.error(err);
    const root = $("#CarteContent");
    root &&
      (root.innerHTML =
        '<div class="alert alert-warning">Impossible de charger la carte.</div>');
  }
})();
