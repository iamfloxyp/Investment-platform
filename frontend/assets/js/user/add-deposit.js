document.addEventListener("DOMContentLoaded", () => {
  // ======= DOM ELEMENTS =======
  const calcModal = document.getElementById("calcModal");
  const depositModal = document.getElementById("depositModal");

  const calcPlan = document.getElementById("calcPlan");
  const calcAmount = document.getElementById("calcAmount");
  const calcResult = document.getElementById("calcResult");

  const depositPlan = document.getElementById("depositPlan");
  const depositAmount = document.getElementById("depositAmount");

  const addressSection = document.getElementById("cryptoAddressSection");
  const addressBox = document.getElementById("cryptoAddress");
  const copyBtn = document.getElementById("copyAddressBtn");

  // ====== CONFIG ======
 const API_BASE = window.API_BASE;
  let userId = null;

  // ====== FETCH USER & POPULATE BALANCES ======
  (async function fetchUser() {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("User not authenticated");

      const user = await res.json();
      userId = user._id || user.id;

      console.log("✅ Logged-in user:", user.firstName);
      console.log("💰 Wallets from DB:", user.wallets);

      const totalBalanceEl = document.querySelector(".balance h3");
      if (totalBalanceEl) {
        totalBalanceEl.textContent = `$${(user.balance || 0).toFixed(2)}`;
      }

      const cryptoList = document.querySelectorAll(".crypto-list li");
      const wallets = user.wallets || {};

      cryptoList.forEach((li) => {
        const coin = li.dataset.coin?.toLowerCase();
        const span = li.querySelector("span");
        if (!coin || !span) return;
        const amount = wallets[coin] ?? 0;
        span.textContent = `$${Number(amount).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;
      });
    } catch (err) {
      console.error("❌ Auth Error:", err);
      alert("Session expired. Please log in again.");
      window.location.href = "./login.html";
    }
  })();

  // ====== UPDATE BALANCES ======
  function updateBalances(user) {
    try {
      const balanceEl = document.querySelector(".balance h3");
      const totalBalance = user.balance || 0;
      if (balanceEl) balanceEl.textContent = `$${totalBalance.toFixed(2)}`;

      const cryptoList = document.querySelector(".crypto-list");
      if (cryptoList && user.wallets) {
        const wallet = user.wallets;
        cryptoList.querySelectorAll("li").forEach((li) => {
          const label = li.textContent.toLowerCase();
          let val = 0;
          if (label.includes("bitcoin")) val = wallet.btc || 0;
          else if (label.includes("usdt")) val = wallet.usdt || 0;
          else if (label.includes("tron")) val = wallet.tron || 0;
          else if (label.includes("bnb")) val = wallet.bnb || 0;
          else if (label.includes("eth")) val = wallet.eth || 0;
          const span = li.querySelector("span");
          if (span) span.textContent = `$${val.toFixed(2)}`;
        });
      }
    } catch (e) {
      console.error("⚠️ Error updating balances:", e);
    }
  }

  // ====== POPUP UTILITY ======
  function showPopup(message, type = "success") {
    const popup = document.createElement("div");
    popup.textContent = message;
    popup.style.position = "fixed";
    popup.style.bottom = "25px";
    popup.style.right = "25px";
    popup.style.padding = "10px 15px";
    popup.style.background = type === "error" ? "#c0392b" : "#102630";
    popup.style.color = "#fff";
    popup.style.borderRadius = "5px";
    popup.style.zIndex = "9999";
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 3000);
  }

  // ====== CALCULATOR MODAL ======
  document.querySelectorAll(".calc-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const card = e.target.closest(".plan-card");
      calcPlan.value = card.dataset.name;
      calcAmount.value = card.dataset.min;
      calcResult.innerHTML = "";
      calcModal.style.display = "flex";
    });
  });

  // ====== DEPOSIT MODAL ======
  document.querySelectorAll(".btn-plan").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const card = e.target.closest(".plan-card");
      depositPlan.value = card.dataset.name;
      depositAmount.value = card.dataset.min;
      depositModal.style.display = "flex";

      if (addressSection && addressBox) {
        addressBox.textContent = "";
        addressSection.style.display = "none";
      }
    });
  });

  // ====== UPDATED: EMBEDDED PAYMENT VIEW ======
  const cryptoSelect = document.getElementById("cryptoSelect");
  if (cryptoSelect) {
    cryptoSelect.addEventListener("change", async () => {
      const crypto = cryptoSelect.value;
      const amount = parseFloat(depositAmount.value || 0);
      const planName = depositPlan.value;

      if (!crypto || !amount || amount < 50) {
        showPopup("Please enter a valid amount and crypto.", "error");
        return;
      }

      try {
        const resUser = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
        const user = await resUser.json();
        const userId = user._id || user.id;

        const res = await fetch(`${API_BASE}/api/deposits`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId, amount, plan: planName, method: crypto }),
        });

        const data = await res.json();
        console.log("💰 Deposit response:", data);
        if (data.paymentLink) {
  const paymentBox = document.getElementById("paymentBox");
  const frame = document.getElementById("paymentFrame");
  paymentBox.style.display = "block";
  frame.src = data.paymentLink;
  console.log("✅ NowPayments frame loaded:", data.paymentLink);
}

        if (res.ok && data.paymentLink) {
          showPopup("🪙 Loading payment interface...");
          addressSection.innerHTML = `
            <h4 style="margin-bottom:10px;">Complete your payment below:</h4>
            <iframe src="${data.paymentLink}" width="100%" height="700" 
                    style="border:none; border-radius:10px;"></iframe>
          `;
          addressSection.style.display = "block";
        } else if (data.address) {
          addressBox.textContent = data.address;
          addressSection.style.display = "block";
          if (copyBtn) {
            copyBtn.onclick = () => {
              navigator.clipboard.writeText(data.address);
              showPopup("✅ Wallet address copied.");
            };
          }
        } else {
          showPopup(data.msg || "Unable to generate payment link.", "error");
        }
      } catch (err) {
        console.error("❌ Payment Error:", err);
        showPopup("Error connecting to payment server.", "error");
      }
    });
  }

  // ====== CLOSE BUTTONS ======
  document.getElementById("closeCalc").onclick = () => (calcModal.style.display = "none");
  document.getElementById("closeDeposit").onclick = () => (depositModal.style.display = "none");
  document.getElementById("calcOkBtn").onclick = () => (calcModal.style.display = "none");
  document.getElementById("depositOkBtn").onclick = () => (depositModal.style.display = "none");

  // ====== CALCULATOR LOGIC ======
  document.getElementById("calcForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const rate = parseFloat(document.querySelector(`[data-name="${calcPlan.value}"]`).dataset.rate);
    const amount = parseFloat(calcAmount.value);
    const profit = (rate / 100) * amount;
    calcResult.innerHTML = `
      <p>For <strong>${calcPlan.value}</strong>, if you invest <strong>$${amount}</strong>,</p>
      <p>You will earn <strong>$${profit.toFixed(2)}</strong> daily.</p>
    `;
  });

  // ====== BACKGROUND CLICK CLOSE ======
  window.onclick = (e) => {
    if (e.target === calcModal) calcModal.style.display = "none";
    if (e.target === depositModal) calcModal.style.display = "none";
  };
});