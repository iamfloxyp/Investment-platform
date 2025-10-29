document.addEventListener("DOMContentLoaded", async () => {
  const userBtn = document.getElementById("userBtn");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const welcomeName = document.getElementById("welcomeName");
  const bellBtn = document.getElementById("bellBtn");
  const notifDropdown = document.getElementById("notifDropdown");
  const notifBadge = document.getElementById("notifBadge");
  const notifList = document.getElementById("notifList");

  // ====== CONFIG ======
  const API_BASE = window.API_BASE;
  let userId = null;

  // ✅ Step 1: Fetch logged-in user via cookies
try {
  const res = await fetch(`${API_BASE}/api/auth/me`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("User not authenticated");

  const user = await res.json();
  userId = user.id;
  console.log("✅ Logged-in userId:", userId);

  // === Fix duplicate or placeholder issue ===
  const userBtn = document.getElementById("userBtn");
  const welcomeName = document.getElementById("welcomeName");
  

  if (userBtn) {
    userBtn.textContent = `${user.firstName} ▾`;
  }

  if (welcomeName) {
    // Clean up placeholder text before setting real name
    let text = welcomeName.textContent.trim();
    if (text.toLowerCase().includes("welcome")) {
      text = text.replace(/welcome[, ]*/i, "");
    }
    if (text.toLowerCase() === "user") {
      text = "";
    }

    // Safely update with real user name
    welcomeName.textContent = `Welcome, ${user.firstName}`;
  }

  // Optional: if you want to avoid the initial "User" flicker
  if (welcomeName) {
    welcomeName.style.visibility = "visible";
  }

} catch (err) {
  console.error("❌ Not logged in:", err);
  window.location.href = "./login.html";
  return;
}

  // ✅ Step 2: Fetch notifications from backend
  try {
    const res = await fetch(`${API_BASE}/api/notifications`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to load notifications");

    const notifs = await res.json();

    // ✅ Count unread
    const unread = notifs.filter((n) => !n.read);
    notifBadge.textContent = unread.length;
    notifBadge.style.display = unread.length > 0 ? "inline-block" : "none";

    // ✅ Render list with scroll + footer
    notifList.innerHTML = notifs
      .map(
        (n) => `
          <li class="notif-item ${n.read ? "read" : "unread"}" data-id="${n._id}">
            ${n.message}
          </li>
        `
      )
      .join("");

    
    // ✅ Make the dropdown scrollable if content is long
    notifDropdown.style.maxHeight = "300px";
    notifDropdown.style.overflowY = "auto";

    // ✅ Click to mark as read
    notifList.addEventListener("click", async (e) => {
      const li = e.target.closest(".notif-item");
      if (!li) return;

      const id = li.dataset.id;
      try {
        await fetch(`${API_BASE}/api/notifications/read/${id}`, {
          method: "PATCH",
          credentials: "include",
        });

        li.classList.add("read");
        li.style.opacity = "0.7";
        notifBadge.textContent = Math.max(
          parseInt(notifBadge.textContent) - 1,
          0
        );
        if (parseInt(notifBadge.textContent) === 0)
          notifBadge.style.display = "none";
      } catch (err) {
        console.error("❌ Failed to mark notification as read:", err);
      }
    });
  } catch (err) {
    console.error("❌ Notification error:", err);
  }

  // ✅ Toggle dropdown visibility
  if (bellBtn)
    bellBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle("show");
      console.log(
        "🔔 Bell clicked! Dropdown toggled:",
        notifDropdown.classList.contains("show")
      );
    });

  // ✅ Toggle user menu dropdown
  if (userBtn)
    userBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle("show");
      console.log(
        "👤 User button clicked! Dropdown toggled:",
        dropdownMenu.classList.contains("show")
      );
    });

  // ✅ Close both dropdowns when clicking outside
  window.addEventListener("click", (e) => {
    if (!e.target.closest(".notifications"))
      notifDropdown.classList.remove("show");
    if (!e.target.closest(".user-menu")) dropdownMenu.classList.remove("show");
  });

  // ✅ Step 3: Load dashboard data
  if (userId) {
    await loadUserFinancialStats(userId);
    await loadAccountOverview(userId);
    await loadCryptoBalances(userId);
    await loadPendingWithdrawals();
    await loadTotalWithdrawals(userId);
  } else {
    console.warn("⚠️ No valid userId found — cannot load dashboard data");
  }

  // ✅ Auto refresh every 30s
  setInterval(async () => {
    if (userId) {
      console.log("🔁 Auto-refreshing dashboard data...");
      await loadUserFinancialStats(userId);
      await loadAccountOverview(userId);
      await loadTotalWithdrawals(userId);
    }
  }, 30000);
});

// ===== MOBILE MENU TOGGLE =====
function toggleMenu() {
  const navLinks = document.getElementById("navLinks");
  const toggleBtn = document.querySelector(".menu-toggle");

  if (!navLinks || !toggleBtn) return;

  navLinks.classList.toggle("active");

  if (navLinks.classList.contains("active")) {
    toggleBtn.textContent = "✖";
  } else {
    toggleBtn.textContent = "☰";
  }
}

// ====== Financial Stats ======
async function loadUserFinancialStats(userId) {
  try {
    const isLocal =
      window.location.hostname.includes("127.0.0.1") ||
      window.location.hostname.includes("localhost");
    const API_BASE = isLocal
      ? "http://127.0.0.1:4000"
      : "https://investment-platform-1-qjx8.onrender.com";

    const res = await fetch(`${API_BASE}/api/deposits/user/${userId}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to load user transactions");

    const data = await res.json();

    const deposits = data.filter(
      (t) =>
        t.type === "deposit" &&
        (t.status === "approved" || t.status === "completed")
    );
    const withdrawals = data.filter(
      (t) =>
        t.type === "withdraw" &&
        (t.status === "approved" || t.status === "completed")
    );

    const totalDeposit = deposits.reduce((sum, t) => sum + t.amount, 0);
    const totalWithdraw = withdrawals.reduce((sum, t) => sum + t.amount, 0);
    const activeDeposit = totalDeposit;
    const earnedTotal = totalDeposit * 0.1;
    const dailyProfit = totalDeposit * 0.01;

    const cards = document.querySelectorAll(".card-info p");
    if (cards.length >= 5) {
      cards[0].textContent = `$${earnedTotal.toFixed(2)}`;
      cards[1].textContent = `$${totalDeposit.toFixed(2)}`;
      cards[2].textContent = `$${activeDeposit.toFixed(2)}`;
      cards[3].textContent = `$${dailyProfit.toFixed(2)}`;
      cards[4].textContent = `$${totalWithdraw.toFixed(2)}`;
    }
  } catch (err) {
    console.error("❌ Error loading user financial stats:", err);
  }
}

// ====== Account Overview ======
async function loadAccountOverview(userId) {
  try {
    const isLocal =
      window.location.hostname.includes("127.0.0.1") ||
      window.location.hostname.includes("localhost");
    const API_BASE = isLocal
      ? "http://127.0.0.1:4000"
      : "https://investment-platform-1-qjx8.onrender.com";

    const depRes = await fetch(`${API_BASE}/api/deposits/user/${userId}`, {
      credentials: "include",
    });
    if (!depRes.ok) throw new Error("Failed to fetch deposits");
    const transactions = await depRes.json();

    const deposits = transactions.filter(
      (t) =>
        t.type === "deposit" &&
        (t.status === "approved" || t.status === "completed")
    );
    const withdrawals = transactions.filter(
      (t) =>
        t.type === "withdraw" &&
        (t.status === "approved" || t.status === "completed")
    );
    const pendingWithdrawals = transactions.filter(
      (t) => t.type === "withdraw" && t.status === "pending"
    );

    const totalDeposits = deposits.reduce((sum, t) => sum + t.amount, 0);
    const totalWithdrawals = withdrawals.reduce((sum, t) => sum + t.amount, 0);
    const pendingWithdrawSum = pendingWithdrawals.reduce(
      (sum, t) => sum + t.amount,
      0
    );
    const activeDeposits = totalDeposits;
    const earnedProfits = activeDeposits * 0.1;
    const balance = totalDeposits - totalWithdrawals + earnedProfits;

    const overviewItems = document.querySelectorAll(".overview-list li strong");
    if (overviewItems.length >= 4) {
      overviewItems[0].textContent = `$${balance.toFixed(2)}`;
      overviewItems[1].textContent = `$${activeDeposits.toFixed(2)}`;
      overviewItems[2].textContent = `$${earnedProfits.toFixed(2)}`;
      overviewItems[3].textContent = `$${pendingWithdrawSum.toFixed(2)}`;
    }

    console.log("✅ Account Overview Updated:", {
      balance,
      activeDeposits,
      earnedProfits,
      pendingWithdrawals: pendingWithdrawSum,
    });
  } catch (err) {
    console.error("❌ Error updating account overview:", err);
  }
}

// ====== Load Pending Withdrawals ======
async function loadPendingWithdrawals() {
  try {
    const isLocal =
      window.location.hostname.includes("127.0.0.1") ||
      window.location.hostname.includes("localhost");
    const API_BASE = isLocal
      ? "http://127.0.0.1:4000"
      : "https://investment-platform-1-qjx8.onrender.com";

    const res = await fetch(`${API_BASE}/api/withdrawals/pending`, {
      credentials: "include",
    });

    if (!res.ok) throw new Error("Failed to load pending withdrawals");

    const pending = await res.json();
    const totalPending = pending.reduce((sum, w) => sum + w.amount, 0);

    // ✅ Update the dashboard pending section
    const pendingSection = document.getElementById("pendingWithdrawals");
    if (pendingSection) {
      pendingSection.textContent = `$${totalPending.toFixed(2)}`;
    }

    console.log("✅ Pending Withdrawals Loaded:", totalPending);
  } catch (err) {
    console.error("❌ Error loading pending withdrawals:", err);
  }
}


// ====== Load Total Withdrawals ======
async function loadTotalWithdrawals(userId) {
  try {
    const isLocal =
      window.location.hostname.includes("127.0.0.1") ||
      window.location.hostname.includes("localhost");
    const API_BASE = isLocal
      ? "http://127.0.0.1:4000"
      : "https://investment-platform-1-qjx8.onrender.com";

    const res = await fetch(`${API_BASE}/api/withdrawals/user/total/${userId}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch total withdrawals");

    const data = await res.json();
    const total = data.total || 0;

    // ✅ Update card value
    const withdrawCard = document.querySelector(
      ".card .card-icon.withdraw"
    )?.closest(".card")?.querySelector(".card-info p");
    if (withdrawCard) withdrawCard.textContent = `$${total.toFixed(2)}`;

    console.log("✅ Total withdrawals loaded:", total);
  } catch (err) {
    console.error("❌ Error loading total withdrawals:", err);
  }
}
// ====== Investment Calculator ======
function calculateReturn() {
  const amount = parseFloat(document.getElementById("amount").value);
  const plan = document.getElementById("plan").value;
  const currency = document.getElementById("currency").value;
  const result = document.getElementById("calcResult");
  const okBtn = document.getElementById("okBtn");

  if (!amount || !plan) {
    result.textContent = "Please enter amount and select plan.";
    return;
  }

  const [days, percent] = plan.split("-").map(Number);
  const profit = amount * (percent / 100);
  const total = amount + profit;

  result.textContent = `You’ll earn ${currency} ${profit.toFixed(
    2
  )} in ${days} days. Total: ${currency} ${total.toFixed(2)}`;
  okBtn.style.display = "inline-block";
}

function resetCalc() {
  document.getElementById("calcForm").reset();
  document.getElementById("calcResult").textContent = "";
  document.getElementById("okBtn").style.display = "none";
}

function startInvestment() {
  window.location.href = "add-deposit.html";
}
// ====== Load Crypto Wallet Balances ======
async function loadCryptoBalances(userId) {
  try {
    const isLocal =
      window.location.hostname.includes("127.0.0.1") ||
      window.location.hostname.includes("localhost");
    const API_BASE = isLocal
      ? "http://127.0.0.1:4000"
      : "https://investment-platform-1-qjx8.onrender.com";

    // ✅ Fetch user details to get wallet balances
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: "include",
    });

    if (!res.ok) throw new Error("Failed to load crypto balances");

    const user = await res.json();
    if (!user.wallets) {
      console.warn("⚠️ No wallet balances found for this user.");
      return;
    }

    // ✅ Map wallet balances to UI
    const cryptoItems = document.querySelectorAll(".crypto-list li");
    cryptoItems.forEach((item) => {
      const coin = item.getAttribute("data-coin");
      const balance = user.wallets[coin] || 0;
      const span = item.querySelector("span");

      if (span) span.textContent = `$${balance.toFixed(2)}`;
    });

    console.log("✅ Wallet Balances Updated:", user.wallets);
  } catch (err) {
    console.error("❌ Error loading crypto balances:", err);
  }
}