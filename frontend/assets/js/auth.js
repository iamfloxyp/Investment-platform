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
    firstName: form.querySelector('input[placeholder="First Name"]')?.value ?? "",
    lastName:  form.querySelector('input[placeholder="Last Name"]')?.value ?? "",
    email:     form.querySelector('input[type="email"]')?.value ?? ""
  };
  localStorage.setItem(LS_KEY_SIGNUP, JSON.stringify(data));
}
function loadDraft(form) {
  if (!form) return;
  try {
    const data = JSON.parse(localStorage.getItem(LS_KEY_SIGNUP) || "{}");
    if (data.firstName) form.querySelector('input[placeholder="First Name"]').value = data.firstName;
    if (data.lastName)  form.querySelector('input[placeholder="Last Name"]').value  = data.lastName;
    if (data.email)     form.querySelector('input[type="email"]').value            = data.email;
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

    const firstName = form.querySelector('input[placeholder="First Name"]').value.trim();
    const lastName  = form.querySelector('input[placeholder="Last Name"]').value.trim();
    const email     = form.querySelector('input[type="email"]').value.trim().toLowerCase();
    const password  = form.querySelector('input[type="password"]').value;

    // terms checkbox is optional to send, but enforce UI check
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
        credentials: "include", // so cookie is saved
        body: JSON.stringify({ firstName, lastName, email, password })
      });

      const data = await res.json();
      if (!res.ok) {
        showError(data?.message || "Sign up failed.");
        return;
      }

      // save light user info for UI (token is in httpOnly cookie already)
      localStorage.setItem("finbloom_user", JSON.stringify(data.user));
      clearDraft();

      // go to dashboard or login
      window.location.href = "./login.html"; // or "./dashboard.html"
    } catch (err) {
      console.error(err);
      showError("Network error. Please try again.");
    } finally {
      setLoading(submitBtn, false);
    }
  });
})();

// ====== LOGIN HANDLER (optional, for your login page later) ======
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