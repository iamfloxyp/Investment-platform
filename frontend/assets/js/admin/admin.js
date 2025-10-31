
// or your Render URL in production

// ✅ Popup message utility
function showPopup(message, type = "success") {
  const popup = document.createElement("div");
  popup.textContent = message;
  popup.style.position = "fixed";
  popup.style.bottom = "30px";
  popup.style.right = "30px";
  popup.style.padding = "12px 18px";
  popup.style.background = type === "error" ? "#c0392b" : "#102630";
  popup.style.color = "#fff";
  popup.style.borderRadius = "6px";
  popup.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
  popup.style.zIndex = "9999";
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 3000);
}

// ✅ Load Admin Stats (for dashboard cards + recent transactions)
async function loadAdminStats() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/stats`, {
      credentials: "include",
    });

    if (!res.ok) throw new Error("Failed to load stats");

    const data = await res.json();

    // ✅ Update dashboard cards
    const totalUsersEl = document.getElementById("totalUsers");
    const totalDepositsEl = document.getElementById("totalDeposits");
    const pendingWithdrawalsEl = document.getElementById("pendingWithdrawals");
    const activeInvestmentsEl = document.getElementById("activeInvestments");

    if (totalUsersEl) totalUsersEl.textContent = data.totalUsers || 0;
    if (totalDepositsEl)
      totalDepositsEl.textContent = `$${(data.totalDeposits || 0).toFixed(2)}`;
    if (pendingWithdrawalsEl)
      pendingWithdrawalsEl.textContent = `$${data.pendingWithdrawals || 0}`;
    if (activeInvestmentsEl)
      activeInvestmentsEl.textContent = `$${data.activeInvestments || 0}`;

    // ✅ Populate recent transactions
    const tableBody = document.getElementById("transactionsTable");
    if (tableBody && data.recentTransactions) {
      tableBody.innerHTML = "";

      data.recentTransactions.forEach((tx) => {
        const statusClass =
          tx.status === "approved"
            ? "status-approved"
            : tx.status === "pending"
            ? "status-pending"
            : "status-rejected";

        const row = document.createElement("tr");
        row.innerHTML = `
          <td>${tx.user || "Unknown"}</td>
          <td>$${tx.amount}</td>
          <td>${tx.type}</td>
          <td class="${statusClass}">${tx.status}</td>
          <td>${tx.paymentProcess}</td>
          <td>${tx.performedBy}</td>
          <td>${new Date(tx.date).toLocaleDateString()}</td>
        `;
        tableBody.appendChild(row);
      });

      if (data.recentTransactions.length === 0) {
        tableBody.innerHTML = `
          <tr>
            <td colspan="7" style="text-align:center; color:#888;">
              No recent transactions
            </td>
          </tr>
        `;
      }
    }
  } catch (error) {
    console.error(error);
    showPopup("Error loading admin stats", "error");
  }
}

// ✅ Load Users (for user management page)
async function loadUsers() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/users`, {
      credentials: "include",
    });

    if (!res.ok) throw new Error("Failed to load users");

    const users = await res.json();

    const tableBody = document.querySelector("#usersTable tbody");
    if (tableBody) {
      tableBody.innerHTML = users
        .map(
          (user) => `
        <tr>
          <td>${user.firstName} ${user.lastName}</td>
          <td>${user.email}</td>
          <td>${user.role}</td>
          <td>$${(user.balance || 0).toFixed(2)}</td>
          <td>${user.isVerified ? "✅" : "❌"}</td>
        </tr>
      `
        )
        .join("");
    }
  } catch (err) {
    console.error(err);
    showPopup("Failed to load users", "error");
  }
}

// ✅ Sidebar + Profile Dropdown Controls
function setupUIControls() {
  const sidebar = document.querySelector(".sidebar");
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const closeSidebar = document.getElementById("closeSidebar");
  const profileIcon = document.getElementById("profileIcon");
  const profileDropdown = document.getElementById("profileDropdown");

  // ✅ Sidebar toggle (use .active to match your CSS)
  if (hamburgerBtn && sidebar) {
    hamburgerBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebar.classList.toggle("active");
    });
  }

  // ✅ Close sidebar (X button)
  if (closeSidebar && sidebar) {
    closeSidebar.addEventListener("click", (e) => {
      e.stopPropagation();
      sidebar.classList.remove("active");
    });
  }

  // ✅ Profile dropdown toggle
  if (profileIcon && profileDropdown) {
    profileIcon.addEventListener("click", (e) => {
      e.stopPropagation();
      profileDropdown.classList.toggle("show");
    });
  }

  // ✅ Close dropdown & sidebar when clicking outside
  window.addEventListener("click", (e) => {
    if (profileDropdown && !e.target.closest("#profileIcon")) {
      profileDropdown.classList.remove("show");
    }
    if (sidebar && !e.target.closest(".sidebar") && !e.target.closest("#hamburgerBtn")) {
      sidebar.classList.remove("active");
    }
  });
}
// ===================== ADMIN PROFILE MENU (Deploy Ready) =====================
document.addEventListener("DOMContentLoaded", () => {
  const profileDropdown = document.getElementById("profileDropdown");
  const profileModal = document.getElementById("profileModal");
  const closeProfile = document.getElementById("closeProfile");

  if (!profileDropdown) return; // Exit if no dropdown found

  // Handle clicks inside dropdown
  profileDropdown.addEventListener("click", async (e) => {
    const item = e.target.closest("li");
    if (!item) return;

    const text = item.textContent.trim();

    // 🔹 View Profile
    if (text.includes("View Profile")) {
      if (profileModal) profileModal.classList.add("show");
    }

    // 🔹 Go to Settings Page
    if (text.includes("Settings")) {
      window.location.href = "admin-settings.html";
    }

    // 🔹 Logout Function (✅ Works Locally + Live)
    if (text.includes("Logout")) {
      try {
        // Smart base URL (auto detect local vs production)
        const baseURL =
          window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
            ? "http://localhost:4000"
            : "https://api.emuntra.com";

        const res = await fetch(`${baseURL}/api/auth/logout`, {
          method: "POST",
          credentials: "include",
        });

        if (res.ok) {
          localStorage.clear();
          alert("✅ Logged out successfully!");
          window.location.href = "admin-login.html"; // ✅ redirect to admin login page
        } else {
          alert("⚠️ Logout failed. Please try again.");
        }
      } catch (err) {
        console.error("Logout error:", err);
        alert("❌ Error logging out. Check your connection.");
      }
    }
  });

  // 🔹 Close Profile Modal
  if (closeProfile) {
    closeProfile.addEventListener("click", () => {
      profileModal.classList.remove("show");
    });
  }

  // 🔹 Close dropdown when clicking outside
  window.addEventListener("click", (e) => {
    if (!e.target.closest(".profile")) {
      profileDropdown.classList.remove("show");
    }
  });
});
// ✅ Initialize page logic
document.addEventListener("DOMContentLoaded", () => {
  setupUIControls();

  if (document.getElementById("totalUsers")) {
    // We’re on the Admin Dashboard
    loadAdminStats();
  } else if (document.querySelector("#usersTable")) {
    // We’re on the User Management page
    loadUsers();
  }
});