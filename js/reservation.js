// /js/reservation.js
import { getApiBase, createBooking, API_TOKEN } from "/src/api.js";

const HOURS = {
  midi: ["12:00", "12:15", "12:30", "12:45", "13:00", "13:15"],
  soir: [
    "19:00",
    "19:15",
    "19:30",
    "19:45",
    "20:00",
    "20:15",
    "20:30",
    "20:45",
    "21:00",
  ],
};

function fillHours(service = "soir") {
  const sel = document.getElementById("selectHour");
  if (!sel) return;
  sel.innerHTML = (HOURS[service] || HOURS.soir)
    .map((h) => `<option value="${h}:00">${h}</option>`)
    .join("");
}

async function populateRestaurants() {
  const base = getApiBase().replace(/\/+$/, "");
  const sel = document.getElementById("RestaurantSelect");
  if (!sel) return;

  try {
    const res = await fetch(`${base}/api/restaurant`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json = await res.json();
    const list = Array.isArray(json) ? json : json["hydra:member"] || [];
    if (!list.length) {
      sel.innerHTML = `<option value="" disabled>— Aucun restaurant —</option>`;
      sel.selectedIndex = 0;
      return;
    }
    // Construit les options puis sélectionne la 1ère dispo
    const opts = list
      .map(
        (r) => `<option value="${r.id}">${r.name ?? "Resto #" + r.id}</option>`
      )
      .join("");
    const hasPlaceholder = sel.querySelector('option[value=""]');
    sel.innerHTML =
      (hasPlaceholder ? sel.querySelector('option[value=""]').outerHTML : "") +
      opts;
    // sélectionne la 1ère option valable
    const firstValid = sel.querySelector('option[value]:not([value=""])');
    if (firstValid) firstValid.selected = true;
    sel.dispatchEvent(new Event("change"));
  } catch (e) {
    console.warn("Restaurants indisponibles", e);
    sel.innerHTML = `<option value="" disabled selected>— Indisponible —</option>`;
  }
}

function wireForm() {
  const form =
    document.querySelector("form#bookingForm") ||
    document.querySelector("form");
  if (!form) return;

  // Radio service -> maj heures
  document
    .getElementById("midiRadio")
    ?.addEventListener("change", () => fillHours("midi"));
  document
    .getElementById("soirRadio")
    ?.addEventListener("change", () => fillHours("soir"));
  fillHours("soir");

  // Submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!API_TOKEN) {
      alert(
        "Réservation protégée : ajoute ton token.\nConsole → localStorage.setItem('api_token','TON_TOKEN'); location.reload();"
      );
      return;
    }
    const btn = form.querySelector('[type="submit"]');
    btn?.setAttribute("disabled", "disabled");
    try {
      const payload = {
        restaurantId: Number(form.restaurantId?.value || 0),
        guestNumber: Number(
          document.getElementById("NbConvivesInput")?.value || 0
        ),
        orderDate: document.getElementById("DateInput")?.value || "",
        orderHour: document.getElementById("selectHour")?.value || "",
        allergy:
          document.getElementById("AllergieInput")?.value?.trim() || null,
      };
      if (!payload.restaurantId) throw new Error("Choisis un restaurant.");
      if (!payload.guestNumber) throw new Error("Nombre de convives manquant.");
      if (!payload.orderDate) throw new Error("Date manquante.");
      if (!payload.orderHour) throw new Error("Heure manquante.");

      const out = await createBooking(payload);
      alert(`Réservation OK (id ${out.id ?? "?"})`);
      form.reset();
      fillHours("soir");
    } catch (err) {
      console.error(err);
      alert(`Échec: ${err.message || "Erreur"}`);
    } finally {
      btn?.removeAttribute("disabled");
    }
  });
}

// Go
populateRestaurants();
wireForm();
