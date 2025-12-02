/* ============================
   DASHBOARD.JS  (Final)
   ============================ */

/** ---------- CONFIG ---------- **/
(function ensureApiBase() {
  const isLocal =
    location.hostname.includes("127.0.0.1") ||
    location.hostname.includes("localhost");

  // Fallback if config.js wasn't loaded for some reason
  if (!window.API_BASE) {
    window.API_BASE = isLocal
      ? "http://127.0.0.1:4000"
      : "https://api.emuntra.com";
  }
})();

/** ---------- FETCH HELPERS ---------- **/
async function getJSON(url, opts = {}) {
  const res = await fetch(url, {
    credentials: "include",
    cache: "no-store",
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(opts.headers || {}),
    },
  });
  let data = null;
  try {
    data = await res.json();
  } catch (_) {
    // ignore JSON parse error (non-JSON endpoints)
  }
  if (!res.ok) {
    const msg = (data && data.message) || `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

function $(sel, root = document) {
  return root.querySelector(sel);
}
function $all(sel, root = document) {
  return [...root.querySelectorAll(sel)];
}

/** ---------- TOASTER ---------- **/
function showToast(msg, type = "error") {
  let el = document.querySelector(".form-error");
  if (!el) {
    el = document.createElement("p");
    el.className = "form-error";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.style.display = "block";
  el.style.background = type === "error" ? "#dc3545" : "#198754";
  setTimeout(() => (el.style.display = "none"), 6000);
}

/** ---------- ON LOAD ---------- **/
document.addEventListener("DOMContentLoaded", initDashboard);
// CHECK USER KYC STATUS
async function checkKYCStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: "include"
    });

    const data = await res.json();

    if (!data) return;

    const status = data.kycStatus;

   if (status === "not_submitted" || status === "rejected") {
  const popup = document.getElementById("kycPopup");
  if (popup) popup.classList.remove("hidden");
} else {
  const popup = document.getElementById("kycPopup");
  if (popup) popup.classList.add("hidden");
}

  } catch (err) {
    console.log("KYC check failed:", err);
  }
}

checkKYCStatus();

// START KYC BUTTON
const startBtn = document.getElementById("startKYCBtn");

if (startBtn) {
  startBtn.addEventListener("click", () => {
    window.location.href = "/user/kyc.html";
  });
}

async function initDashboard() {
  const API_BASE = window.API_BASE;

  // Clear SW/browse caches to avoid stale JSON on mobile
  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch (_) {}
  }

  const loadingScreen = $("#loadingScreen");
  const mainContent = $("#mainContent");
  if (loadingScreen) {
    loadingScreen.style.display = "block";
    loadingScreen.textContent = "Loading your dashboard...";
  }
  if (mainContent) mainContent.style.display = "none";

  let user = null;
  try {
    // Force revalidation of session and fresh Mongo data
    user = await getJSON(`${API_BASE}/api/auth/me?refresh=true`, {
      method: "GET",
    });

    // Basic UI wiring
    const userBtn = $("#userBtn");
    const welcomeName = $("#welcomeName");
    if (userBtn) userBtn.textContent = `${user.firstName || "User"} ▾`;
    if (welcomeName) welcomeName.textContent = user.firstName || "User";

    // Show the dashboard UI
    if (loadingScreen) loadingScreen.style.display = "none";
    if (mainContent) mainContent.style.display = "block";
  } catch (err) {
    console.error("Auth/Session error:", err);
    showToast("Session expired. Please sign in again.");
    location.href = "./login.html";
    return;
  } finally {
    if (loadingScreen) loadingScreen.style.display = "none";
    if (mainContent) mainContent.style.display = "block";
  }

  // Parallel load of dashboard sections
  const userId = user && user.id ? user.id : null;
  if (!userId) {
    console.warn("No userId found after /me");
    return;
  }

  await Promise.allSettled([
    loadNotifications(),
    loadUserFinancialStats(userId),
    loadAccountOverview(userId),
    loadCryptoBalances(userId),
    loadPendingWithdrawals(),
    loadTotalWithdrawals(userId),
  ]);

  // Auto refresh key tiles every 30s
  setInterval(async () => {
    await Promise.allSettled([
      loadUserFinancialStats(userId),
      loadAccountOverview(userId),
      loadTotalWithdrawals(userId),
    ]);
  }, 30000);

  // Wire dropdowns
  wireMenus();
}

/** ---------- MENUS ---------- **/
function wireMenus() {
  const dropdownMenu = $("#dropdownMenu");
  const userBtn = $("#userBtn");
  const bellBtn = $("#bellBtn");
  const notifDropdown = $("#notifDropdown");

  if (userBtn) {
    userBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdownMenu?.classList.toggle("show");
    });
  }

  if (bellBtn) {
    bellBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      notifDropdown?.classList.toggle("show");
    });
  }

  window.addEventListener("click", (e) => {
    if (!e.target.closest(".notifications")) notifDropdown?.classList.remove("show");
    if (!e.target.closest(".user-menu")) dropdownMenu?.classList.remove("show");
  });

  // Mobile hamburger
  const toggleBtn = document.querySelector(".menu-toggle");
  const navLinks = document.getElementById("navLinks");
  if (toggleBtn && navLinks) {
    toggleBtn.addEventListener("click", () => {
      navLinks.classList.toggle("active");
      toggleBtn.textContent = navLinks.classList.contains("active") ? "✖" : "☰";
    });
  }

  // Tooltips
  const infoIcons = $all(".info-icon");
  infoIcons.forEach((icon) => {
    icon.addEventListener("click", (e) => {
      e.stopPropagation();
      icon.classList.toggle("active");
    });
  });
  window.addEventListener("click", () => {
    infoIcons.forEach((icon) => icon.classList.remove("active"));
  });
}

/** ---------- NOTIFICATIONS ---------- **/
async function loadNotifications() {
  const API_BASE = window.API_BASE;
  const notifBadge = $("#notifBadge");
  const notifList = $("#notifList");
  const notifDropdown = $("#notifDropdown");

  try {
    const data = await getJSON(`${API_BASE}/api/notifications`, { method: "GET" });
    const notifs = Array.isArray(data) ? data : data.notifications || [];

    const unread = notifs.filter((n) => !n.read);
    if (notifBadge) {
      notifBadge.textContent = unread.length;
      notifBadge.style.display = unread.length > 0 ? "inline-block" : "none";
    }

    if (notifList) {
      notifList.innerHTML = notifs
        .map(
          (n) => `
        <li class="notif-item ${n.read ? "read" : "unread"}" data-id="${n._id}">
          ${n.message}
        </li>`
        )
        .join("");

      notifDropdown && (notifDropdown.style.maxHeight = "300px");
      notifDropdown && (notifDropdown.style.overflowY = "auto");

      notifList.addEventListener("click", async (e) => {
        const li = e.target.closest(".notif-item");
        if (!li) return;
        const id = li.dataset.id;
        try {
          await getJSON(`${API_BASE}/api/notifications/read/${id}`, {
            method: "PATCH",
          });
          li.classList.add("read");
          li.style.opacity = "0.7";
          const curr = parseInt(notifBadge.textContent || "0", 10) - 1;
          notifBadge.textContent = Math.max(curr, 0);
          if (Math.max(curr, 0) === 0) notifBadge.style.display = "none";
        } catch (err) {
          console.error("Mark read error:", err);
        }
      });
    }
  } catch (err) {
    console.error("Notifications load error:", err);
  }
}

/** ---------- FINANCIAL STATS (Tiles) ---------- **/
async function loadUserFinancialStats(userId) {
  const API_BASE = window.API_BASE;

  try {
    // All transactions for the user
    const tx = await getJSON(`${API_BASE}/api/deposits/user/${userId}`, {
      method: "GET",
    });

    const deposits = tx.filter(
      (t) => t.type === "deposit" && (t.status === "approved" || t.status === "completed")
    );
    const withdrawals = tx.filter(
      (t) => t.type === "withdraw" && (t.status === "approved" || t.status === "completed")
    );

    const totalDeposit = deposits.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalWithdraw = withdrawals.reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const activeDeposit = totalDeposit;

    // Fresh profit numbers from /me
    const me = await getJSON(`${API_BASE}/api/auth/me?refresh=true`, { method: "GET" });
    const dailyProfit = Number(me.dailyProfit) || 0;
    const earnedTotal = Number(me.earnedTotal) || 0;

    const dailyProfitEl = $("#dailyProfit");
    const earnedTotalEl = $("#earnedTotal");
    if (dailyProfitEl) dailyProfitEl.textContent = `$${dailyProfit.toFixed(2)}`;
    if (earnedTotalEl) earnedTotalEl.textContent = `$${earnedTotal.toFixed(2)}`;

    // Top cards (Earned / Total Deposit / Active Deposit / Daily Profit / Total Withdraw)
    const cards = document.querySelectorAll(".card-info p");
    if (cards.length >= 5) {
      cards[0].textContent = `$${earnedTotal.toFixed(2)}`;
      cards[1].textContent = `$${totalDeposit.toFixed(2)}`;
      cards[2].textContent = `$${activeDeposit.toFixed(2)}`;
      cards[3].textContent = `$${dailyProfit.toFixed(2)}`;
      cards[4].textContent = `$${totalWithdraw.toFixed(2)}`;
    }
  } catch (err) {
    console.error("loadUserFinancialStats error:", err);
  }
}

/** ---------- ACCOUNT OVERVIEW (left panel) ---------- **/
async function loadAccountOverview(userId) {
  const API_BASE = window.API_BASE;

  try {
    const tx = await getJSON(`${API_BASE}/api/deposits/user/${userId}`, { method: "GET" });

    const deposits = tx.filter(
      (t) => t.type === "deposit" && (t.status === "approved" || t.status === "completed")
    );
    const withdrawals = tx.filter(
      (t) => t.type === "withdraw" && (t.status === "approved" || t.status === "completed")
    );
    const pendingWithdrawals = tx.filter((t) => t.type === "withdraw" && t.status === "pending");

    const totalDeposits = deposits.reduce((s, t) => s + Number(t.amount || 0), 0);
    const totalWithdrawals = withdrawals.reduce((s, t) => s + Number(t.amount || 0), 0);
    const pendingWithdrawSum = pendingWithdrawals.reduce((s, t) => s + Number(t.amount || 0), 0);
    const activeDeposits = totalDeposits;

    // Show *earned profits* from backend (not 10% guess)
    const me = await getJSON(`${API_BASE}/api/auth/me?refresh=true`, { method: "GET" });
    const earnedProfits = Number(me.earnedTotal) || 0;

    const balance = (Number(me.balance) || 0) + earnedProfits;

    const items = document.querySelectorAll(".overview-list li strong");
    if (items.length >= 4) {
      items[0].textContent = `$${balance.toFixed(2)}`;            // Account Balance
      items[1].textContent = `$${activeDeposits.toFixed(2)}`;      // Active Deposits
      items[2].textContent = `$${earnedProfits.toFixed(2)}`;       // Earned Profits
      items[3].textContent = `$${pendingWithdrawSum.toFixed(2)}`;  // Pending Withdrawals
    }
  } catch (err) {
    console.error("loadAccountOverview error:", err);
  }
}

/** ---------- PENDING WITHDRAWALS (tile or section) ---------- **/
async function loadPendingWithdrawals() {
  const API_BASE = window.API_BASE;

  try {
    const pending = await getJSON(`${API_BASE}/api/withdrawals/pending`, { method: "GET" });
    const totalPending = (Array.isArray(pending) ? pending : []).reduce(
      (sum, w) => sum + Number(w.amount || 0),
      0
    );
    const pendingSection = $("#pendingWithdrawals");
    if (pendingSection) pendingSection.textContent = `$${totalPending.toFixed(2)}`;
  } catch (err) {
    console.error("loadPendingWithdrawals error:", err);
  }
}

/** ---------- TOTAL WITHDRAWALS (top card) ---------- **/
async function loadTotalWithdrawals(userId) {
  const API_BASE = window.API_BASE;

  try {
    const data = await getJSON(`${API_BASE}/api/withdrawals/user/total/${userId}`, {
      method: "GET",
    });
    const total = Number(data.total || 0);
    const withdrawCard = document
      .querySelector(".card .card-icon.withdraw")
      ?.closest(".card")
      ?.querySelector(".card-info p");
    if (withdrawCard) withdrawCard.textContent = `$${total.toFixed(2)}`;
  } catch (err) {
    console.error("loadTotalWithdrawals error:", err);
  }
}

/** ---------- WALLET BALANCES ---------- **/
async function loadCryptoBalances(userId) { // userId unused, kept for symmetry
  const API_BASE = window.API_BASE;

  try {
    const me = await getJSON(`${API_BASE}/api/auth/me?refresh=true`, { method: "GET" });
    const wallets = me.wallets || {};
    const cryptoItems = $all(".crypto-list li");
    cryptoItems.forEach((item) => {
      const coin = item.getAttribute("data-coin");
      const balance = Number(wallets[coin] || 0);
      const spans = item.querySelectorAll("span");
if (spans.length === 2) {
  spans[1].textContent = `$${balance.toFixed(2)}`;
}
    });
  } catch (err) {
    console.error("loadCryptoBalances error:", err);
  }
}

/** ---------- INVESTMENT CALCULATOR ---------- **/
function calculateReturn() {
  const amount = parseFloat($("#amount")?.value);
  const plan = $("#plan")?.value;
  const currency = $("#currency")?.value || "USD ($)";
  const result = $("#calcResult");
  const okBtn = $("#okBtn");

  if (!amount || !plan) {
    if (result) result.textContent = "Please enter amount and select plan.";
    return;
  }
  const [days, percent] = plan.split("-").map(Number);
  const profit = amount * (percent / 100);
  const total = amount + profit;

  if (result)
    result.textContent = `You’ll earn ${currency} ${profit.toFixed(
      2
    )} in ${days} days. Total: ${currency} ${total.toFixed(2)}`;
  if (okBtn) okBtn.style.display = "inline-block";
}
function resetCalc() {
  $("#calcForm")?.reset();
  const result = $("#calcResult");
  const okBtn = $("#okBtn");
  if (result) result.textContent = "";
  if (okBtn) okBtn.style.display = "none";
}
function startInvestment() {
  location.href = "add-deposit.html";
}

// expose calculator handlers if used inline in HTML
window.calculateReturn = calculateReturn;
window.resetCalc = resetCalc;
window.startInvestment = startInvestment;