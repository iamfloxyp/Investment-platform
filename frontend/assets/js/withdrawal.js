 document.addEventListener("DOMContentLoaded", async () => {
  const API_BASE =
    window.location.hostname.includes("127.0.0.1") ||
    window.location.hostname.includes("localhost")
      ? "http://127.0.0.1:4000"
      : "https://investment-platform-1-qjx8.onrender.com";

  const modal = document.getElementById("withdrawModal");
  const closeBtn = modal.querySelector(".close");
  const setWalletForm = document.getElementById("setWalletForm");
  const withdrawProcessor = document.getElementById("withdrawProcessor");
  const withdrawInput = document.getElementById("withdrawInput");
  const walletTableBody = document.getElementById("walletTableBody");
  const withdrawForm = document.getElementById("withdrawForm");
  const pendingDisplay = document.getElementById("pendingAmount");
  const userBtn = document.getElementById("userBtn");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const bellBtn = document.getElementById("bellBtn");
  const notifDropdown = document.getElementById("notifDropdown");
  const notifBadge = document.getElementById("notifBadge");
  const notifList = document.getElementById("notifList");

  let user = null;

  // === Fetch logged-in user ===
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
    if (!res.ok) throw new Error("Unauthorized");
    user = await res.json();

    // Initialize wallets if missing
    if (!user.wallets) user.wallets = {};
    if (!user.walletAddresses) user.walletAddresses = {};

    if (userBtn) userBtn.textContent = `${user.firstName} ▾`;
    document.getElementById("welcomeName").textContent = user.firstName;
  } catch (err) {
    console.error("❌ Failed to load user:", err);
    window.location.href = "login.html";
    return;
  }

  // === Fetch notifications ===
  try {
    const res = await fetch(`${API_BASE}/api/notifications`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load notifications");
    const notifs = await res.json();
    const unread = notifs.filter((n) => !n.read);
    notifBadge.textContent = unread.length;
    notifBadge.style.display = unread.length > 0 ? "inline-block" : "none";

    notifList.innerHTML = notifs
      .map(
        (n) =>
          `<li class="notif-item ${n.read ? "read" : "unread"}">${n.message}</li>`
      )
      .join("");
  } catch (err) {
    console.error("❌ Notification error:", err);
  }

  // === Toggle notifications dropdown ===
  bellBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    notifDropdown.classList.toggle("show");
  });

  // === Toggle user dropdown ===
  userBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdownMenu.classList.toggle("show");
  });

  // === Close dropdowns when clicking outside ===
  window.addEventListener("click", (e) => {
    if (!e.target.closest(".notifications")) notifDropdown.classList.remove("show");
    if (!e.target.closest(".user-menu")) dropdownMenu.classList.remove("show");
  });

  // === Render wallet balances ===
  const cryptos = {
    btc: "Bitcoin",
    eth: "Ethereum",
    usdt: "Tether (USDT)",
    bnb: "Binance Coin",
    tron: "Tron",
    bch: "Bitcoin Cash",
    ltc: "Litecoin",
    xrp: "Ripple",
    doge: "Dogecoin",
  };

  function renderWalletTable() {
    walletTableBody.innerHTML = Object.keys(cryptos)
      .map((key) => {
        const bal = user.wallets?.[key] || 0;
        const address = user.walletAddresses?.[key];
        return `
          <tr>
            <td>${cryptos[key]}</td>
            <td>$${bal.toFixed(2)}</td>
            <td>
              ${
                address
                  ? `<span class="saved-wallet">****${address.slice(-4)}</span>
                     <a href="#" class="edit-wallet" data-processor="${key}">Edit</a>`
                  : `<a href="#" class="set-wallet" data-processor="${key}">Set Wallet</a>`
              }
            </td>
          </tr>`;
      })
      .join("");

    attachWalletHandlers();
  }

  renderWalletTable();

  // === Open wallet modal ===
  function attachWalletHandlers() {
    document.querySelectorAll(".set-wallet, .edit-wallet").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const proc = e.target.dataset.processor;
        withdrawProcessor.value = proc.toUpperCase();
        withdrawInput.value = user.walletAddresses?.[proc] || "";
        modal.style.display = "block";
      });
    });
  }

  // === Close modal ===
  closeBtn.onclick = () => (modal.style.display = "none");
  window.onclick = (e) => {
    if (e.target === modal) modal.style.display = "none";
  };

  // === Save wallet to backend ===
  setWalletForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const processor = withdrawProcessor.value.toLowerCase();
    const address = withdrawInput.value.trim();
    if (!address) return alert("Please enter a wallet address.");

    try {
      const res = await fetch(`${API_BASE}/api/users/wallet`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ processor, address }),
      });

      if (!res.ok) throw new Error("Failed to save wallet");
      alert(`✅ ${processor.toUpperCase()} wallet saved successfully!`);
      modal.style.display = "none";

      // ✅ Instantly update UI and refresh
      if (!user.walletAddresses) user.walletAddresses = {};
      user.walletAddresses[processor] = address;

      try {
        // Refresh user from backend to get the latest wallet
        const updatedRes = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
        if (updatedRes.ok) {
          const refreshedUser = await updatedRes.json();
          user.walletAddresses = refreshedUser.walletAddresses || user.walletAddresses;
        }
      } catch (refreshErr) {
        console.warn("⚠️ Could not refresh user data:", refreshErr);
      }

      renderWalletTable();
    } catch (err) {
      console.error("❌ Wallet save error:", err);
      alert("Failed to save wallet. Please try again.");
    }
  });

  // === Load pending withdrawals ===
  async function loadPendingWithdrawals() {
    try {
      const res = await fetch(`${API_BASE}/api/withdrawals/pending`, { credentials: "include" }); // ✅ fixed endpoint
      if (!res.ok) return;
      const pending = await res.json();
      const totalPending = pending.reduce((sum, w) => sum + w.amount, 0);
      pendingDisplay.textContent = `$${totalPending.toFixed(2)}`;
    } catch (err) {
      console.error("❌ Failed to load pending withdrawals:", err);
    }
  }
  await loadPendingWithdrawals();

  // === Handle Withdraw Form ===
  withdrawForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const processor = document.getElementById("processor").value; // keep your ID
    const amount = parseFloat(document.getElementById("withdrawAmount").value);
    const available = user.wallets?.[processor] || 0;
    const address = user.walletAddresses?.[processor];

    if (!processor) return alert("Select a crypto.");
    if (!amount || amount <= 0) return alert("Enter a valid amount.");
    if (amount > available) return alert("Insufficient balance.");
    if (!address) return alert(`Please set your ${processor.toUpperCase()} wallet first.`);

    try {
      const res = await fetch(`${API_BASE}/api/withdrawals`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ processor, amount, walletAddress: address }),
      });

      if (!res.ok) throw new Error("Withdrawal request failed");

      alert(`✅ Withdrawal of $${amount.toFixed(2)} in ${processor.toUpperCase()} requested successfully!`);
      withdrawForm.reset();
      await loadPendingWithdrawals();
    } catch (err) {
      console.error("❌ Withdrawal error:", err);
      alert("Error submitting withdrawal. Please try again.");
    }
  });

  // === Auto-refresh every 30s ===
  setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
      if (!res.ok) return;
      user = await res.json();

      if (!user.wallets) user.wallets = {};
      if (!user.walletAddresses) user.walletAddresses = {};

      renderWalletTable();
      await loadPendingWithdrawals();
    } catch (err) {
      console.error("🔁 Auto-refresh failed:", err);
    }
  }, 30000);
});

// === Mobile menu toggle ===
function toggleMenu() {
  const navLinks = document.getElementById("navLinks");
  const toggleBtn = document.querySelector(".menu-toggle");
  if (!navLinks || !toggleBtn) return;

  navLinks.classList.toggle("active");
  toggleBtn.textContent = navLinks.classList.contains("active") ? "✖" : "☰";
}