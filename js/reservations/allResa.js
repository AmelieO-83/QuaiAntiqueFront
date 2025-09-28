// /js/reservations/allResa.js
import { fetchMyBookings, cancelBooking, API_TOKEN } from "/src/api.js";

const $ = (s, c = document) => c.querySelector(s);
const tbody = $("#resaTable tbody");
const feedback = $("#resaFeedback");
const emptyBox = $("#resaEmpty");

function setFb(msg, ok = false) {
  feedback.className = `alert ${ok ? "alert-success" : "alert-danger"}`;
  feedback.textContent = msg;
  feedback.style.display = "";
}
function clearFb() {
  feedback.style.display = "none";
  feedback.textContent = "";
}

function fmtDate(d) {
  return d || "";
} // d au format YYYY-MM-DD (déjà)
function fmtHour(h) {
  return (h || "").slice(0, 5);
} // H:i:s -> H:i

function render(rows) {
  tbody.innerHTML = rows
    .map(
      (r, i) => `
    <tr data-id="${r.id}">
      <td>${i + 1}</td>
      <td>${fmtDate(r.orderDate)}</td>
      <td>${fmtHour(r.orderHour)}</td>
      <td>${r.guestNumber ?? ""}</td>
      <td>${r.allergy ? r.allergy : "<span class='text-muted'>—</span>"}</td>
      <td>${r.restaurantName || "#" + (r.restaurantId ?? "-")}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-danger js-cancel">Annuler</button>
      </td>
    </tr>
  `
    )
    .join("");

  emptyBox.style.display = rows.length ? "none" : "";
}

async function load() {
  clearFb();
  if (!API_TOKEN) {
    setFb("Vous devez être connecté·e pour voir vos réservations.");
    return;
  }
  try {
    const list = await fetchMyBookings(); // [{id, restaurantId, guestNumber, orderDate, orderHour, allergy}]
    render(Array.isArray(list) ? list : list["hydra:member"] || []);
  } catch (err) {
    console.error(err);
    setFb("Impossible de charger vos réservations.");
  }
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest(".js-cancel");
  if (!btn) return;
  const tr = btn.closest("tr");
  const id = tr?.getAttribute("data-id");
  if (!id) return;

  if (!confirm("Confirmer l'annulation de cette réservation ?")) return;

  btn.setAttribute("disabled", "disabled");
  try {
    await cancelBooking(id);
    tr.remove();
    if (!tbody.children.length) emptyBox.style.display = "";
    setFb("Réservation annulée ✅", true);
  } catch (err) {
    console.error(err);
    setFb("Échec de l’annulation.");
  } finally {
    btn.removeAttribute("disabled");
  }
});

// init
load();
