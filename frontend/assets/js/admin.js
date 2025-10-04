// -------------------------
// Protect admin dashboard
// -------------------------
let currentAdmin = JSON.parse(localStorage.getItem("currentAdmin")) || null;
if (!currentAdmin) {
  window.location.href = "admin-login.html";
}

// Mock data (in real use, this will come from API)
let users = JSON.parse(localStorage.getItem("users")) || [
  { id: 1, name: "John Doe", email: "john@example.com", active: true, balance: 200 },
  { id: 2, name: "Jane Smith", email: "jane@example.com", active: true, balance: 500 },
];

let transactions = JSON.parse(localStorage.getItem("transactions")) || [
  { id: 1, userId: 1, type: "deposit", amount: 200, status: "completed", paymentProcess: "USDT" },
  { id: 2, userId: 2, type: "withdrawal", amount: 50, status: "pending", paymentProcess: "Bank Transfer" },
];

let investments = JSON.parse(localStorage.getItem("investments")) || [
  { id: 1, userId: 2, amount: 300, status: "active" },
];

// ✅ Upgrade existing transactions
transactions = transactions.map(t => ({
  ...t,
  userName: t.userName || (users.find(u => u.id === t.userId)?.name || "Unknown User"),
  status: t.status || "pending",
  paymentProcess: t.paymentProcess || "Unknown", // 👈 BTC, USDT, Bank Transfer, PayPal
  performedBy: t.performedBy || currentAdmin?.name || "System",
  date: t.date || new Date().toISOString().slice(0,10)
}));

localStorage.setItem("transactions", JSON.stringify(transactions));

function saveData() {
  localStorage.setItem("users", JSON.stringify(users));
  localStorage.setItem("transactions", JSON.stringify(transactions));
  localStorage.setItem("investments", JSON.stringify(investments));
}

// -------------------------
// 1. Update Dashboard Stats
// -------------------------
function updateDashboard() {
  document.querySelector("#totalUsers").innerText = users.length;

  let deposits = transactions
    .filter(t => t.type === "deposit" && t.status === "completed")
    .reduce((sum, t) => sum + t.amount, 0);
  document.querySelector("#totalDeposits").innerText = `$${deposits}`;

  let pendingWithdrawals = transactions
    .filter(t => t.type === "withdrawal" && t.status === "pending")
    .reduce((sum, t) => sum + t.amount, 0);
  document.querySelector("#pendingWithdrawals").innerText = `$${pendingWithdrawals}`;

  let activeInvestments = investments
    .filter(i => i.status === "active")
    .reduce((sum, i) => sum + i.amount, 0);
  document.querySelector("#activeInvestments").innerText = `$${activeInvestments}`;
}

// -------------------------
// 2. Render Recent Transactions (for dashboard preview)
// -------------------------
function renderRecentTransactions(limit = 3) {
  const tableBody = document.getElementById("transactionsTable");
  if (!tableBody) return;

  tableBody.innerHTML = "";

  // Show only latest N transactions on dashboard
  let recent = [...transactions].slice(-limit).reverse();

  recent.forEach(t => {
    let userName = t.userName || (users.find(u => u.id === t.userId)?.name || "Unknown User");
    let status = t.status || "pending";
    let paymentProcess = t.paymentProcess || "Unknown";
    let performedBy = t.performedBy || currentAdmin?.name || "Unknown Admin";
    let date = t.date || new Date().toISOString().slice(0,10);

    let row = document.createElement("tr");
    row.innerHTML = `
      <td>${userName}</td>
      <td>$${t.amount}</td>
      <td>${t.type}</td>
      <td><span class="status ${status}">${status}</span></td>
      <td>${paymentProcess}</td>
      <td>${performedBy}</td>
      <td>${date}</td>
    `;
    tableBody.appendChild(row);
  });
}

// -------------------------
// 3. Search Functionality (for Users Management, not dashboard)
// -------------------------
function setupSearch() {
  const searchBox = document.querySelector(".search-box input");
  if (!searchBox) return;

  searchBox.addEventListener("keyup", function () {
    let searchTerm = searchBox.value.toLowerCase();
    let rows = document.querySelectorAll(".users-table tbody tr");

    rows.forEach(row => {
      let name = row.querySelector("td:nth-child(1)")?.innerText.toLowerCase() || "";
      let email = row.querySelector("td:nth-child(2)")?.innerText.toLowerCase() || "";

      if (name.includes(searchTerm) || email.includes(searchTerm)) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    });
  });
}

// -------------------------
// 4. Profile Dropdown
// -------------------------
document.addEventListener("DOMContentLoaded", () => {
  const profileIcon = document.getElementById("profileIcon");
  const profileDropdown = document.getElementById("profileDropdown");

  if (profileIcon) {
    profileIcon.addEventListener("click", () => {
      profileDropdown.style.display =
        profileDropdown.style.display === "block" ? "none" : "block";
    });

    document.addEventListener("click", (e) => {
      if (!profileIcon.contains(e.target) && !profileDropdown.contains(e.target)) {
        profileDropdown.style.display = "none";
      }
    });
  }

  const profileModal = document.getElementById("profileModal");
  const closeProfile = document.getElementById("closeProfile");

  if (document.querySelector("#profileDropdown ul li:nth-child(1)")) {
    document.querySelector("#profileDropdown ul li:nth-child(1)").addEventListener("click", () => {
      document.getElementById("adminName").innerText = currentAdmin.name;
      document.getElementById("adminEmail").innerText = currentAdmin.email;
      profileModal.style.display = "flex";
    });
  }

  if (closeProfile) {
    closeProfile.addEventListener("click", () => {
      profileModal.style.display = "none";
    });
  }

  if (document.querySelector("#profileDropdown ul li:nth-child(2)")) {
    document.querySelector("#profileDropdown ul li:nth-child(2)").addEventListener("click", () => {
      document.getElementById("settingsSection").classList.remove("hidden");
      profileDropdown.style.display = "none";
    });
  }

  if (document.getElementById("changePasswordForm")) {
    document.getElementById("changePasswordForm").addEventListener("submit", (e) => {
      e.preventDefault();
      let newPass = document.getElementById("newPassword").value;
      alert(`Password updated to: ${newPass} (saved in DB later)`);
      e.target.reset();
    });
  }

  if (document.querySelector("#profileDropdown ul li:nth-child(3)")) {
    document.querySelector("#profileDropdown ul li:nth-child(3)").addEventListener("click", () => {
      localStorage.removeItem("currentAdmin");
      window.location.href = "admin-login.html";
    });
  }

  // Initialize
  updateDashboard();
  renderRecentTransactions(); // only few items on dashboard
  setupSearch();
});
// Sidebar toggle
const hamburgerBtn = document.getElementById("hamburgerBtn");
const closeSidebar = document.getElementById("closeSidebar");
const sidebar = document.querySelector(".sidebar");

// Toggle with hamburger
hamburgerBtn.addEventListener("click", () => {
  sidebar.classList.toggle("active");

  // Toggle icon inside hamburger
  const icon = hamburgerBtn.querySelector("i");
  if (sidebar.classList.contains("active")) {
    icon.classList.remove("fa-bars");
  } else {
    icon.classList.remove("fa-xmark");
    icon.classList.add("fa-bars");
  }
});

// Close with X inside sidebar
if (closeSidebar) {
  closeSidebar.addEventListener("click", () => {
    sidebar.classList.remove("active");

    // Reset hamburger icon
    const icon = hamburgerBtn.querySelector("i");
    icon.classList.remove("fa-xmark");
    icon.classList.add("fa-bars");
  });
}