// /js/auth/signin.js
import { login, fetchMe } from "/src/api.js";

const mailInput = document.getElementById("EmailInput");
const passwordInput = document.getElementById("PasswordInput");
const btnSignin = document.getElementById("btnSignin");

function showInvalid(msg = "Le mail et le mot de passe ne correspondent pas.") {
  mailInput?.classList.add("is-invalid");
  passwordInput?.classList.add("is-invalid");
  const fb = mailInput?.parentElement?.querySelector(".invalid-feedback");
  if (fb) {
    fb.textContent = msg;
    fb.style.display = "";
  }
}
function clearInvalid() {
  mailInput?.classList.remove("is-invalid");
  passwordInput?.classList.remove("is-invalid");
  const fb = mailInput?.parentElement?.querySelector(".invalid-feedback");
  if (fb) fb.style.display = "none";
}
function redirect(path = "/account") {
  history.pushState({}, "", path);
  dispatchEvent(new PopStateEvent("popstate"));
}

async function checkCredentials() {
  clearInvalid();
  const email = mailInput?.value.trim() || "";
  const password = passwordInput?.value || "";
  btnSignin?.setAttribute("disabled", "disabled");
  try {
    if (!email || !password) {
      showInvalid("Veuillez renseigner email et mot de passe.");
      return;
    }
    await login({ email, password }); // -> stocke le token dans localStorage
    try {
      await fetchMe();
    } catch {}
    redirect("/account");
  } catch (e) {
    console.error(e);
    showInvalid();
  } finally {
    btnSignin?.removeAttribute("disabled");
  }
}

btnSignin?.addEventListener("click", (e) => {
  e.preventDefault();
  checkCredentials();
});
btnSignin?.closest("form")?.addEventListener("submit", (e) => {
  e.preventDefault();
  checkCredentials();
});
mailInput?.addEventListener("input", clearInvalid);
passwordInput?.addEventListener("input", clearInvalid);
