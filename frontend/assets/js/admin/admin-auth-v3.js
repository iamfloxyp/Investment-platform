// ===== ADMIN AUTH JS =====


// Auth route prefix
const API = `${API_BASE}/api/auth`;

// ===== SESSION VALIDATION (admin dashboard only) =====
document.addEventListener("DOMContentLoaded", async () => {
  // Run only on /admin/admin.html
  if (!window.location.pathname.endsWith("admin/admin.html")) return;

  try {
    const meRes = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
    if (!meRes.ok) throw new Error("Not logged in");

    const me = await meRes.json();

    if (me.role !== "admin") {
      window.location.href = "/admin-login.html";  
      return;
    }

    const nameEl = document.getElementById("adminName");
    const emailEl = document.getElementById("adminEmail");

    if (nameEl) nameEl.textContent = `${me.firstName || ""} ${me.lastName || ""}`.trim() || "Admin";
    if (emailEl) emailEl.textContent = me.email || "-";

    loadUsers();
  } catch (err) {
    console.error("Auth check failed:", err.message);
    window.location.href = "/admin-login.html";
  }
});

// ===== LOAD USERS =====
async function loadUsers() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/users`, { credentials: "include" });

    if (res.status === 403) {
      window.location.href = "/admin-login.html";
      return;
    }

    if (!res.ok) throw new Error("Failed to load users");

    const users = await res.json();

    const totalUsersEl = document.getElementById("totalUsers");
    if (totalUsersEl) totalUsersEl.textContent = users.length;

    console.log("Loaded users:", users);
  } catch (e) {
    console.error("Error loading users:", e);
  }
}

// ===== ADMIN LOGIN PAGE (on admin-login.html) =====
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
      const res = await fetch(`${API_BASE}/api/auth/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Login failed");

      if (data?.user?.role !== "admin") {
        errorEl.textContent = "Access denied — admin only.";
        return;
      }

      localStorage.setItem("currentAdmin", JSON.stringify(data.user));

      errorEl.style.color = "green";
      errorEl.textContent = "Login successful! Redirecting…";

      // Redirect correctly to dashboard
      setTimeout(() => (window.location.href = "/admin/admin.html"), 800);
    } catch (err) {
      console.error("Login error:", err.message);
      errorEl.textContent = err.message;
    }
  });
}