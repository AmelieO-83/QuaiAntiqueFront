// /js/auth/editPassword.js
import { updateMe, API_TOKEN } from "/src/api.js";

const $ = (s, c = document) => c.querySelector(s);
const feedback = $("#pwdFeedback");
const form = $("#pwdForm");
const pwd = $("#NewPasswordInput");
const conf = $("#ConfirmPasswordInput");
const btn = $("#SavePwdBtn");

function setFb(msg, ok = false) {
  feedback.className = `alert ${ok ? "alert-success" : "alert-danger"}`;
  feedback.textContent = msg;
  feedback.style.display = "";
}
function clearFb() {
  feedback.style.display = "none";
}

function strongEnough(v) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{8,}$/.test(v);
}

async function save(e) {
  e.preventDefault();
  clearFb();

  if (!API_TOKEN) {
    setFb("Vous devez être connecté·e pour changer votre mot de passe.");
    return;
  }
  const v = pwd.value || "";
  const c = conf.value || "";
  if (!strongEnough(v)) {
    setFb("Mot de passe trop faible.");
    return;
  }
  if (v !== c) {
    setFb("La confirmation ne correspond pas.");
    return;
  }

  btn.setAttribute("disabled", "disabled");
  try {
    await updateMe({ password: v });
    setFb("Mot de passe mis à jour ✅", true);
    form.reset();
  } catch (err) {
    console.error(err);
    setFb("Échec de la mise à jour.");
  } finally {
    btn.removeAttribute("disabled");
  }
}

form?.addEventListener("submit", save);
