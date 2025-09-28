// /js/auth/account.js
import { fetchMe, updateMe, logout, API_TOKEN } from "/src/api.js";

const $ = (s, c = document) => c.querySelector(s);

// Éléments de la page
const feedback = $("#accountFeedback");
const form = $("#accountForm");
const firstNameInput = $("#FirstNameInput");
const lastNameInput = $("#LastNameInput");
const allergyInput = $("#AllergyInput");
const guestInput = $("#GuestNumberInput");
const logoutBtn = $("#LogoutBtn");

// Helpers feedback
function setFeedback(msg, ok = false) {
  if (!feedback) return;
  feedback.className = `alert ${ok ? "alert-success" : "alert-danger"}`;
  feedback.textContent = msg;
  feedback.style.display = "";
}
function clearFeedback() {
  if (!feedback) return;
  feedback.style.display = "none";
  feedback.textContent = "";
  feedback.className = "alert";
}

// Charge le profil et pré-remplit le formulaire
async function loadMe() {
  clearFeedback();

  if (!API_TOKEN) {
    // pas connecté → redirection vers /signin
    history.pushState({}, "", "/signin");
    dispatchEvent(new PopStateEvent("popstate"));
    return;
  }

  try {
    const me = await fetchMe();
    // Remplissage sans valeurs par défaut
    firstNameInput.value = me.firstName ?? "";
    lastNameInput.value = me.lastName ?? "";
    allergyInput.value = me.allergy ?? "";
    guestInput.value = me.guestNumber ?? "";
  } catch (e) {
    console.error(e);
    setFeedback("Impossible de charger votre profil.");
  }
}

// Soumission : PATCH /api/account/edit
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  clearFeedback();

  const payload = {
    firstName: firstNameInput.value.trim() || null,
    lastName: lastNameInput.value.trim() || null,
    allergy: allergyInput.value.trim() || null,
    guestNumber: guestInput.value ? Number(guestInput.value) : null,
  };

  // On supprime les clés nulles pour ne pas écraser côté back
  Object.keys(payload).forEach((k) => payload[k] === null && delete payload[k]);

  const btn = form.querySelector('[type="submit"]');
  btn?.setAttribute("disabled", "disabled");

  try {
    const out = await updateMe(payload);
    setFeedback("Profil mis à jour ✅", true);

    // Recalage avec les valeurs retournées par l'API
    firstNameInput.value = out.firstName ?? "";
    lastNameInput.value = out.lastName ?? "";
    allergyInput.value = out.allergy ?? "";
    guestInput.value = out.guestNumber ?? "";
  } catch (e) {
    console.error(e);
    setFeedback("Échec de la mise à jour du profil.");
  } finally {
    btn?.removeAttribute("disabled");
  }
});

// Déconnexion
logoutBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  logout();
  history.pushState({}, "", "/signin");
  dispatchEvent(new PopStateEvent("popstate"));
});

// Init
loadMe();
