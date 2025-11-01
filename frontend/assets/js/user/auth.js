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

  // ✅ Helper to read cookies
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

      // ✅ Check referral code from BOTH cookie & URL
      const cookieRef = getCookie("refCode");
      const urlParams = new URLSearchParams(window.location.search);
      const urlRef = urlParams.get("ref");

      // Priority: URL referral > Cookie referral
      const refCode = urlRef || cookieRef || null; // ✅ renamed correctly

      // ✅ Optional cleanup of previous session
      await fetch(`${API_BASE}/api/auth/logout`, { credentials: "include" });

      // ✅ Prepare signup payload
      const body = {
        firstName,
        lastName,
        email,
        password,
        refCode, // 👈 matches backend
      };

      // ✅ Send signup request
      const res = await fetch(SIGNUP_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ cookies enabled
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data?.message || "Signup failed.");
        return;
      }

      // ✅ Clear referral cookie if signup succeeded
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
      // ✅ Clear any previous cookies
      await fetch(`${API_BASE}/api/auth/logout`, { credentials: "include" });

      // ✅ Send login request
      const loginRes = await fetch(LOGIN_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // ✅ include cookies
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

      // ✅ Store minimal info (optional)
      localStorage.setItem("userId", userData.id);

      // ✅ Redirect to dashboard
      window.location.href = "./dashboard.html";
    } catch (err) {
      console.error("Login error:", err);
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