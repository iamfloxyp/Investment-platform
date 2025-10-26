const API = `${window.API_BASE}/api/auth`; // backend auth routes
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // must have a session cookie and be admin
    const meRes = await fetch(`${API_BASE}/auth/me, { credentials: "include" }`);
    if (!meRes.ok) throw new Error("Not logged in");
    const me = await meRes.json();

    if (me.role !== "admin") {
      window.location.href = "admin-login.html";
      return;
    }

    // (Optional) display admin profile info
    const nameEl = document.getElementById("adminName");
    const emailEl = document.getElementById("adminEmail");
    if (nameEl) nameEl.textContent = `${me.firstName || ""} ${me.lastName || ""}`.trim() || "Admin";
    if (emailEl) emailEl.textContent = me.email || "-";

    // now load dashboard data (users, totals, etc.)
    loadUsers();
  } catch {
    window.location.href = "admin-login.html";
  }
});

async function loadUsers() {
  try {
    const res = await fetch(`${API_BASE}/admin/users, { credentials: "include" }`);
    if (res.status === 403) {
      window.location.href = "admin-login.html";
      return;
    }
    if (!res.ok) throw new Error("Failed to load users");
    const users = await res.json();

    const totalUsersEl = document.getElementById("totalUsers");
    if (totalUsersEl) totalUsersEl.textContent = users.length;

    // TODO: render users into your table if needed
    // console.log(users);
  } catch (e) {
    console.error(e);
  }
}

const form = document.getElementById("adminLoginForm");
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
    const res = await fetch(`${API}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include", // send/receive cookie
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data?.message || "Login failed");

    // Must be admin
    if (data?.user?.role !== "admin") {
      errorEl.textContent = "Access denied — admin only.";
      return;
    }

    // (Optional) keep a tiny flag so admin.html knows you passed login page
    localStorage.setItem("currentAdmin", JSON.stringify(data.user));

    errorEl.style.color = "green";
    errorEl.textContent = "Login successful! Redirecting…";
    setTimeout(() => (window.location.href = "admin.html"), 800);
  } catch (err) {
    errorEl.textContent = err.message;
  }
});