// ====== CONFIG ======
const API_BASE = "http://localhost:4000"; // backend server
const SIGNUP_URL = `${API_BASE}/api/auth/register`;
const LOGIN_URL  = `${API_BASE}/api/auth/login`;

// ====== HELPERS ======
function qs(sel, root = document) { return root.querySelector(sel); }
function qsa(sel, root = document) { return [...root.querySelectorAll(sel)]; }
function setLoading(btn, isLoading, text = "Create Account") {
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = isLoading ? "Creating..." : text;
}

// Persist form values so user doesn't lose them on error
const LS_KEY_SIGNUP = "finbloom_signup_draft";
function saveDraft(form) {
  if (!form) return;
  const data = {
    firstName: form.querySelector('#firstName')?.value ?? "",
    lastName:  form.querySelector('#lastName')?.value ?? "",
    email:     form.querySelector('#email')?.value ?? ""
  };
  localStorage.setItem(LS_KEY_SIGNUP, JSON.stringify(data));
}
function loadDraft(form) {
  if (!form) return;
  try {
    const data = JSON.parse(localStorage.getItem(LS_KEY_SIGNUP) || "{}");
    if (data.firstName) form.querySelector('#firstName').value = data.firstName;
    if (data.lastName)  form.querySelector('#lastName').value  = data.lastName;
    if (data.email)     form.querySelector('#email').value     = data.email;
  } catch (_) {}
}
function clearDraft() {
  localStorage.removeItem(LS_KEY_SIGNUP);
}

function showError(msg) {
  let el = qs(".form-error");
  if (!el) {
    el = document.createElement("div");
    el.className = "form-error";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 6000);
}

// ====== SIGNUP HANDLER ======
(function attachSignup() {
  const form = qs(".signup-form");
  if (!form) return;

  // try to restore previous values
  loadDraft(form);

  const submitBtn = form.querySelector('button[type="submit"], .btn');

  form.addEventListener("input", () => saveDraft(form));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstName = form.querySelector('#firstName').value.trim();
    const lastName  = form.querySelector('#lastName').value.trim();
    const email     = form.querySelector('#email').value.trim().toLowerCase();
    const password  = form.querySelector('#signup-password').value;

    const agree = form.querySelector('#terms');
    if (agree && !agree.checked) {
      showError("Please accept the Terms & Conditions.");
      return;
    }

    if (!firstName || !lastName || !email || !password) {
      showError("All fields are required.");
      return;
    }

    try {
      setLoading(submitBtn, true);
      const res = await fetch(SIGNUP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ firstName, lastName, email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        showError(data?.message || "Sign up failed.");
        return;
      }

      // Save user info locally
      localStorage.setItem("finbloom_user", JSON.stringify(data.user));
      clearDraft();

      // ✅ Redirect to verify.html with email as query param
      window.location.href = `./verify.html?email=${encodeURIComponent(email)}`;
    } catch (err) {
      console.error(err);
      showError("Network error. Please try again.");
    } finally {
      setLoading(submitBtn, false);
    }
  });
})();

// ====== LOGIN HANDLER ======
(function attachLogin() {
  const form = qs(".login-form");
  if (!form) return;

  const submitBtn = form.querySelector('button[type="submit"], .btn');

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email    = form.querySelector('input[type="email"]').value.trim().toLowerCase();
    const password = form.querySelector('input[type="password"]').value;

    if (!email || !password) {
      showError("Email and password are required.");
      return;
    }

    try {
      setLoading(submitBtn, true, "Signing In...");
      const res = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data?.message || "Login failed.");
        return;
      }
      localStorage.setItem("finbloom_user", JSON.stringify(data.user));
      window.location.href = "./dashboard.html";
    } catch (err) {
      console.error(err);
      showError("Network error.");
    } finally {
      setLoading(submitBtn, false, "Sign In");
    }
  });
})();

// ====== PASSWORD TOGGLE ======
document.querySelectorAll(".password-field").forEach((field) => {
  const input = field.querySelector("input");
  const toggle = field.querySelector(".toggle-pass");

  toggle.addEventListener("click", () => {
    const type = input.getAttribute("type") === "password" ? "text" : "password";
    input.setAttribute("type", type);

    // Change icon
    toggle.textContent = type === "password" ? "👁️" : "🙈";

    // Accessibility
    toggle.setAttribute("aria-pressed", type === "text");
  });
});