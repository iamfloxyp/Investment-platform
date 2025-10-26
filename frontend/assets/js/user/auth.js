/// ====== CONFIG ======

// 🧠 Automatically switch API base depending on environment
const API_BASE = window.API_BASE;
// Endpoints
const SIGNUP_URL = `${API_BASE}/api/auth/register`;
const LOGIN_URL  = `${API_BASE}/api/auth/login`;
const ME_URL     = `${API_BASE}/api/auth/me`;

// ====== HELPERS ======
function qs(sel, root = document) {
  return root.querySelector(sel);
}
function qsa(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}
function setLoading(btn, isLoading, text = "Create Account") {
  if (!btn) return;
  btn.disabled = isLoading;
  btn.textContent = isLoading ? "Processing..." : text;
}
function showError(msg) {
  let el = qs(".form-error");
  if (!el) {
    el = document.createElement("p");
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

  const submitBtn = form.querySelector('button[type="submit"], .btn');

  // ✅ Helper to read referral cookie
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(";").shift();
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const firstName = qs("#firstName").value.trim();
    const lastName = qs("#lastName").value.trim();
    const email = qs("#email").value.trim().toLowerCase();
    const password = qs("#signup-password").value;
    const agree = qs("#terms");

    if (!agree?.checked) {
      showError("Please accept the Terms & Conditions.");
      return;
    }

    if (!firstName || !lastName || !email || !password) {
      showError("All fields are required.");
      return;
    }

    try {
      setLoading(submitBtn, true);

      // ✅ Get referral code from cookie (if any)
      const refCode = getCookie("refCode") || null;

      // ✅ Include referral code in signup payload
      const res = await fetch(SIGNUP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ cookies enabled
        body: JSON.stringify({ firstName, lastName, email, password, refCode }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data?.message || "Signup failed.");
        return;
      }

      // ✅ Optional cleanup — clear referral cookie after successful signup
      document.cookie = "refCode=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

      // ✅ Redirect to verify page
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

    const email = qs("#login-email").value.trim().toLowerCase();
    const password = qs("#login-password").value;

    if (!email || !password) {
      showError("Please enter email and password.");
      return;
    }

    try {
      setLoading(submitBtn, true, "Signing In...");

      const loginRes = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ cookies enabled
        body: JSON.stringify({ email, password }),
      });

      const loginData = await loginRes.json();
      if (!loginRes.ok) {
        showError(loginData?.message || "Login failed.");
        return;
      }

      // ✅ Check session immediately after login
      const userRes = await fetch(ME_URL, { credentials: "include" });
      const userData = await userRes.json();

      if (!userRes.ok || !userData?.id) {
        showError("Failed to fetch user session.");
        return;
      }

      // Save minimal info if needed
      localStorage.setItem("userId", userData.id);

      window.location.href = "./dashboard.html";
    } catch (err) {
      console.error(err);
      showError("Something went wrong. Try again.");
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
    toggle.textContent = type === "password" ? "👁️" : "🙈";
    toggle.setAttribute("aria-pressed", type === "text");
  });
});