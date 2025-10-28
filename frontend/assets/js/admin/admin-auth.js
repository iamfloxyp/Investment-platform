// ===== ADMIN AUTH JS =====

// ✅ Base API path
const API_BASE = window.API_BASE || (
  window.location.hostname.includes("127.0.0.1") || window.location.hostname.includes("localhost")
    ? "http://127.0.0.1:4000"
    : "https://investment-platform-1-gjx8.onrender.com"
);

// ✅ Auth route prefix
const API = `${API_BASE}/api/auth`;

// ===== SESSION VALIDATION (Run on admin.html) =====
document.addEventListener("DOMContentLoaded", async () => {
  try {
    const meRes = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
    if (!meRes.ok) throw new Error("Not logged in");
    const me = await meRes.json();

    // ✅ If not admin, send back to login
    if (me.role !== "admin") {
      window.location.href = "admin-login.html";
      return;
    }

    // ✅ Display admin info
    const nameEl = document.getElementById("adminName");
    const emailEl = document.getElementById("adminEmail");
    if (nameEl)
      nameEl.textContent = `${me.firstName || ""} ${me.lastName || ""}`.trim() || "Admin";
    if (emailEl) emailEl.textContent = me.email || "-";

    // ✅ Load dashboard data (users, totals, etc.)
    loadUsers();
  } catch (err) {
    console.error("Auth check failed:", err.message);
    if (!window.location.href.includes("admin-login.html")) {
      window.location.href = "admin-login.html";
    }
  }
});

// ===== LOAD USERS =====
async function loadUsers() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/users`, { credentials: "include" });
    if (res.status === 403) {
      window.location.href = "admin-login.html";
      return;
    }
    if (!res.ok) throw new Error("Failed to load users");
    const users = await res.json();

    const totalUsersEl = document.getElementById("totalUsers");
    if (totalUsersEl) totalUsersEl.textContent = users.length;

    // Optional: log or display users in table
    console.log("Loaded users:", users);
  } catch (e) {
    console.error("Error loading users:", e);
  }
}

// ===== ADMIN LOGIN PAGE (Run on admin-login.html) =====
const form = document.getElementById("adminLoginForm");
if (form) {
  const errorEl = document.getElementById("loginError");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    if (!email || !password) {
      errorEl.textContent = "Please fill in both fields.";
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include", // send/receive cookie
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Login failed");

      // ✅ Must be admin
      if (data?.user?.role !== "admin") {
        errorEl.textContent = "Access denied — admin only.";
        return;
      }

      // ✅ Optional: keep a flag for later
      localStorage.setItem("currentAdmin", JSON.stringify(data.user));

      errorEl.style.color = "green";
      errorEl.textContent = "Login successful! Redirecting…";

      // ✅ Redirect after 0.8s
      setTimeout(() => (window.location.href = "admin.html"), 800);
    } catch (err) {
      console.error("Login error:", err.message);
      errorEl.textContent = err.message;
    }
  });
}