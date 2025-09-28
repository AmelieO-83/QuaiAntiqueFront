// /js/auth/signup.js
import { register, login } from "/src/api.js";

// --- Sélecteurs existants (on garde tes IDs)
const inputNom = document.getElementById("NomInput");
const inputPreNom = document.getElementById("PrenomInput");
const inputMail = document.getElementById("EmailInput");
const inputPassword = document.getElementById("PasswordInput");
const inputValidationPassword = document.getElementById(
  "ValidatePasswordInput"
);
const btnValidation = document.getElementById("btn-validation-inscription");
const form = document.getElementById("signupForm");
const feedback = document.getElementById("signupFeedback");

// ---- Tes validateurs (inchangés) ----
function validateConfirmationPassword(inputPwd, inputConfirmPwd) {
  if (inputPwd.value == inputConfirmPwd.value) {
    inputConfirmPwd.classList.add("is-valid");
    inputConfirmPwd.classList.remove("is-invalid");
    return true;
  } else {
    inputConfirmPwd.classList.add("is-invalid");
    inputConfirmPwd.classList.remove("is-valid");
    return false;
  }
}
function validatePassword(input) {
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/;
  const passwordUser = input.value;
  if (passwordUser.match(passwordRegex)) {
    input.classList.add("is-valid");
    input.classList.remove("is-invalid");
    return true;
  } else {
    input.classList.remove("is-valid");
    input.classList.add("is-invalid");
    return false;
  }
}
function validateMail(input) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const mailUser = input.value;
  if (mailUser.match(emailRegex)) {
    input.classList.add("is-valid");
    input.classList.remove("is-invalid");
    return true;
  } else {
    input.classList.remove("is-valid");
    input.classList.add("is-invalid");
    return false;
  }
}
function validateRequired(input) {
  if (input.value != "") {
    input.classList.add("is-valid");
    input.classList.remove("is-invalid");
    return true;
  } else {
    input.classList.remove("is-valid");
    input.classList.add("is-invalid");
    return false;
  }
}

// ---- Helpers UI ----
function setFeedback(html, cls = "alert alert-danger") {
  if (!feedback) return;
  feedback.className = cls;
  feedback.innerHTML = html;
  feedback.style.display = "";
}
function hideFeedback() {
  if (!feedback) return;
  feedback.style.display = "none";
  feedback.innerHTML = "";
  feedback.className = "";
}

// ---- Validation globale (inchangée + disable bouton) ----
function validateForm() {
  const nomOk = validateRequired(inputNom);
  const prenomOk = validateRequired(inputPreNom);
  const mailOk = validateMail(inputMail);
  const passwordOk = validatePassword(inputPassword);
  const passwordConfirmOk = validateConfirmationPassword(
    inputPassword,
    inputValidationPassword
  );

  btnValidation.disabled = !(
    nomOk &&
    prenomOk &&
    mailOk &&
    passwordOk &&
    passwordConfirmOk
  );
}

// Écoutes existantes
[
  inputNom,
  inputPreNom,
  inputMail,
  inputPassword,
  inputValidationPassword,
].forEach((el) => el?.addEventListener("keyup", validateForm));

// ---- Soumission : inscription + auto-login + redirection ----
form?.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideFeedback();

  // revalide (au cas où)
  validateForm();
  if (btnValidation.disabled) return;

  const email = inputMail.value.trim();
  const password = inputPassword.value;
  const firstName = inputPreNom.value.trim();
  const lastName = inputNom.value.trim();

  btnValidation.setAttribute("disabled", "disabled");

  try {
    await register({ email, password, firstName, lastName }); // -> 201 attendu
    setFeedback(
      "Compte créé avec succès. Connexion en cours…",
      "alert alert-success"
    );

    // Auto-login puis redirige vers /account
    await login({ email, password });
    history.pushState({}, "", "/account");
    dispatchEvent(new PopStateEvent("popstate"));
  } catch (err) {
    console.error(err);
    setFeedback(
      "Échec de l’inscription. Vérifie les champs ou essaie un autre email."
    );
  } finally {
    btnValidation.removeAttribute("disabled");
  }
});

// init immédiate
validateForm();
