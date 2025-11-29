document.addEventListener("DOMContentLoaded", () => {
  // ======= DOM ELEMENTS =======
  const calcModal = document.getElementById("calcModal");
  const depositModal = document.getElementById("depositModal");

  const calcPlan = document.getElementById("calcPlan");
  const calcAmount = document.getElementById("calcAmount");
  const calcResult = document.getElementById("calcResult");

  const depositPlan = document.getElementById("depositPlan");
  const depositAmount = document.getElementById("depositAmount");

  const cryptoSelect = document.getElementById("cryptoSelect");
  const addressSection = document.getElementById("cryptoAddressSection");
  const addressBox = document.getElementById("cryptoAddress");

  const API_BASE = window.API_BASE;
  let userId = null;

  const COIN_LABELS = {
    btc: "Bitcoin (BTC)",
    eth: "Ethereum (ETH)",
    usdt: "Tether (USDT)",
    bnb: "Binance Coin (BNB)",
    tron: "Tron (TRX)",
    bch: "Bitcoin Cash (BCH)",
    ltc: "Litecoin (LTC)",
    xrp: "Ripple (XRP)",
    doge: "Dogecoin (DOGE)",
  };

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

  // ==========================================================
  //            DYNAMIC CRYPTO LIST FROM NOWPAYMENTS
  // ==========================================================
  async function loadCryptoList() {
    try {
      const res = await fetch(`${API_BASE}/api/nowpay/coins`);
      const data = await res.json();

      cryptoSelect.innerHTML = `<option value="">-- Select --</option>`;

      if (data.success && Array.isArray(data.coins) && data.coins.length > 0) {
        data.coins.forEach((coin) => {
          const value = coin.toLowerCase();
          const label = COIN_LABELS[value] || value.toUpperCase();

          const opt = document.createElement("option");
          opt.value = value;
          opt.textContent = label;
          cryptoSelect.appendChild(opt);
        });

        console.log("NowPayments coin list loaded:", data.coins);
        return;
      }

      throw new Error("Empty coin list");
    } catch (error) {
      console.error("Unable to fetch NowPayments coins. Using backup list.");

      cryptoSelect.innerHTML = `
        <option value="">-- Select --</option>
        <option value="btc">Bitcoin (BTC)</option>
        <option value="eth">Ethereum (ETH)</option>
        <option value="usdt">Tether (USDT)</option>
      `;
    }
  }

  loadCryptoList();

  // ==========================================================
  //                  UPDATE DASHBOARD BALANCES
  // ==========================================================
  function updateBalances(user) {
    try {
      const totalBalance = Number(user.balance || 0);

      const balanceEl = document.querySelector(".balance h3");
      if (balanceEl) balanceEl.textContent = `$${totalBalance.toFixed(2)}`;

      const availableEl = document.getElementById("availableBalance");
      if (availableEl) {
        const balance = user.availableBalance ?? user.balance ?? 0;
        availableEl.textContent = `$${Number(balance).toFixed(2)}`;
      }

      const cryptoList = document.querySelector(".crypto-list");
      if (!cryptoList) return;
      cryptoList.innerHTML = "";

      const wallets = user.wallets || {};
      const entries = Object.entries(wallets).filter(
        ([, amount]) => Number(amount) > 0
      );

      if (!entries.length) {
        const li = document.createElement("li");
        li.className = "empty-balance";
        li.textContent = "No crypto balance yet. Make a deposit to see it here.";
        cryptoList.appendChild(li);
        return;
      }

      entries.forEach(([coinKey, amount]) => {
        const coin = String(coinKey).toLowerCase();
        const niceLabel = COIN_LABELS[coin] || coin.toUpperCase();

        const li = document.createElement("li");
        li.dataset.coin = coin;

        const labelSpan = document.createElement("span");
        labelSpan.textContent = niceLabel;

        const valueSpan = document.createElement("span");
        valueSpan.textContent = `$${Number(amount).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`;

        li.appendChild(labelSpan);
        li.appendChild(valueSpan);
        cryptoList.appendChild(li);
      });
    } catch (e) {
      console.error("Error updating balances:", e);
    }
  }

  // ==========================================================
  //                        FETCH USER
  // ==========================================================
  (async function fetchUser() {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("User not authenticated");

      const user = await res.json();
      userId = user._id || user.id;

      updateBalances(user);
    } catch (err) {
      console.error("Auth Error:", err);
      alert("Session expired. Please log in again.");
      window.location.href = "./login.html";
    }
  })();

  // ==========================================================
  //                     CALCULATOR MODAL
  // ==========================================================
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

  // ==========================================================
  //                      DEPOSIT MODAL
  // ==========================================================
  document.querySelectorAll(".btn-plan").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const card = e.target.closest(".plan-card");
      depositPlan.value = card.dataset.name;
      depositAmount.value = card.dataset.min;
      depositModal.style.display = "flex";

      addressBox.textContent = "";
      addressSection.style.display = "none";
    });
  });

  // ==========================================================
  //                      PAYPAL MODAL

  // PayPal flow
if (method === "paypal") {
  const paypalModal = document.getElementById("paypalModal");
  paypalModal.style.display = "flex";

  // Copy email
  document.getElementById("copyPaypalBtn").onclick = () => {
    const email = document.getElementById("paypalEmail").textContent;
    navigator.clipboard.writeText(email);
    showPopup("PayPal email copied");
  };

  // User clicked "I have sent the money"
  document.getElementById("paypalSentBtn").onclick = async () => {
    try {
      const resUser = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: "include",
      });
      const user = await resUser.json();
      const userId = user._id || user.id;

      await fetch(`${API_BASE}/api/deposits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId,
          amount,
          plan: planName,
          method: "paypal_manual",
          note: "User selected PayPal. Pending admin verification.",
        }),
      });

      showPopup("Your PayPal deposit request is created.", "success");
      paypalModal.style.display = "none";
      depositModal.style.display = "none";
    } catch (e) {
      console.error(e);
      showPopup("Error creating PayPal deposit.", "error");
    }
  };

  return;
}
document.getElementById("closePaypal").onclick = () => {
  document.getElementById("paypalModal").style.display = "none";
};
  // ==========================================================
  //               CREATE DEPOSIT AND REDIRECT
  // ==========================================================
  cryptoSelect.addEventListener("change", async () => {
    const crypto = cryptoSelect.value;
    const amount = parseFloat(depositAmount.value || 0);
    const planName = depositPlan.value;

    if (!crypto || !amount || amount < 50) {
      showPopup("Please enter a valid amount and select crypto.", "error");
      return;
    }

    try {
      const resUser = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: "include",
      });
      const user = await resUser.json();
      const userId = user._id || user.id;

      const res = await fetch(`${API_BASE}/api/deposits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId,
          amount,
          plan: planName,
          method: crypto,
        }),
      });

      const data = await res.json();
      console.log("Deposit response:", data);

      if (!res.ok) throw new Error(data.msg || "Deposit failed");

      const iidMatch = data.paymentLink && data.paymentLink.match(/iid=(\d+)/);
      const iid = iidMatch ? iidMatch[1] : null;

      if (iid) {
        showPopup("Redirecting to secure payment. Please wait.", "success");
        window.location.href = `/user/payment.html?iid=${iid}`;
      } else if (data.paymentLink) {
        window.open(data.paymentLink, "_blank", "noopener,noreferrer");
      } else {
        showPopup("Payment link not available.", "error");
      }
    } catch (err) {
      console.error("Payment Error:", err);
      showPopup("Error connecting to payment server.", "error");
    }
  });

  // ==========================================================
  //                       CLOSE BUTTONS
  // ==========================================================
  document.getElementById("closeCalc").onclick = () => {
    calcModal.style.display = "none";
  };
  document.getElementById("closeDeposit").onclick = () => {
    depositModal.style.display = "none";
  };
  document.getElementById("calcOkBtn").onclick = () => {
    calcModal.style.display = "none";
  };
  document.getElementById("depositOkBtn").onclick = () => {
    depositModal.style.display = "none";
  };

  // ==========================================================
  //                 CALCULATOR SUBMIT HANDLER
  // ==========================================================
  document.getElementById("calcForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const card = document.querySelector(
      `[data-name="${calcPlan.value}"]`
    );
    if (!card) return;

    const rate = parseFloat(card.dataset.rate);
    const amount = parseFloat(calcAmount.value);

    if (!rate || !amount) {
      calcResult.innerHTML = "<p>Please enter a valid amount.</p>";
      return;
    }

    const profit = (rate / 100) * amount;
    calcResult.innerHTML = `
      <p>For <strong>${calcPlan.value}</strong>, if you invest <strong>$${amount}</strong>,</p>
      <p>You will earn <strong>$${profit.toFixed(2)}</strong> daily.</p>
    `;
  });

  // ==========================================================
  //                CLICK OUTSIDE TO CLOSE MODALS
  // ==========================================================
  window.onclick = (e) => {
    if (e.target === calcModal) calcModal.style.display = "none";
    if (e.target === depositModal) depositModal.style.display = "none";
  };
});