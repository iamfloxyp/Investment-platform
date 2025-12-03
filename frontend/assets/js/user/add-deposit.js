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

  // PayPal modal elements
  const paypalModal = document.getElementById("paypalModal");
  const paypalEmailEl = document.getElementById("paypalEmail");
  const copyPaypalBtn = document.getElementById("copyPaypalBtn");
  const paypalSentBtn = document.getElementById("paypalSentBtn");
  const closePaypalBtn = document.getElementById("closePaypal");

  const API_BASE = window.API_BASE;
  let userId = null;
// FRONTEND COINS – MUST MATCH BACKEND
const NOWPAY_COINS = {
  btc: "btc",
  eth: "eth",
  usdttrc20: "usdttrc20",
  usdc: "usdc",
  trx: "trx",
  bnb: "bnb",
  xrp: "xrp",
  sol: "sol",
  ltc: "ltc",
  doge: "doge",
  bch: "bch",
  ada: "ada"
};

const COIN_LABELS = {
  btc: "Bitcoin (BTC)",
  eth: "Ethereum (ETH)",
  usdttrc20: "Tether USDT (TRC20)",
  usdc: "USD Coin (USDC)",
  trx: "Tron (TRX)",
  bnb: "Binance Coin (BNB)",
  xrp: "Ripple (XRP)",
  sol: "Solana (SOL)",
  ltc: "Litecoin (LTC)",
  doge: "Dogecoin (DOGE)",
  bch: "Bitcoin Cash (BCH)",
  ada: "Cardano (ADA)"
};
  // ==========================================================
  //                       POPUP UTILITY
  // ==========================================================
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
  //           CRYPTOLOADING AND SELECT OPTIONS
  // ==========================================================
async function loadCryptoList() {
  if (!cryptoSelect) return;

  cryptoSelect.innerHTML = `<option value="">-- Select Crypto --</option>`;

  Object.entries(NOWPAY_COINS).forEach(([symbol, npValue]) => {
    const label =
      COIN_LABELS[npValue] ||
      COIN_LABELS[symbol] ||
      symbol.toUpperCase();

    const opt = document.createElement("option");
    opt.value = npValue;
    opt.textContent = label;
    cryptoSelect.appendChild(opt);
  });

  const paypal = document.createElement("option");
  paypal.value = "paypal";
  paypal.textContent = "PayPal (Friends and Family)";
  cryptoSelect.prepend(paypal);
}
loadCryptoList();
// ----------------------
//   LABEL HELPER
// ----------------------
function getCoinLabel(symbol) {
  symbol = symbol.toLowerCase();

  return (
    COIN_LABELS[symbol] ||
    COIN_LABELS[NOWPAY_COINS[symbol]] ||
    symbol.toUpperCase()
  );
}
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
      li.textContent =
        "No crypto balance yet. Make a deposit to see it here.";
      cryptoList.appendChild(li);
      return;
    }

    entries.forEach(([coinKey, amount]) => {
      const coin = String(coinKey).toLowerCase();
      const niceLabel = getCoinLabel(coin);

      const li = document.createElement("li");
      li.dataset.coin = coin;

      const labelSpan = document.createElement("span");
      labelSpan.textContent = niceLabel + ":";

      const valueSpan = document.createElement("span");
      valueSpan.textContent = `$${Number(amount).toFixed(2)}`;

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
      if (!card) return;

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
      if (!card) return;

      depositPlan.value = card.dataset.name;
      depositAmount.value = card.dataset.min;
      depositModal.style.display = "flex";

      if (addressBox && addressSection) {
        addressBox.textContent = "";
        addressSection.style.display = "none";
      }

      // Reset dropdown each time
      if (cryptoSelect) cryptoSelect.value = "";
    });
  });

  // ==========================================================
  //                      PAYPAL HANDLERS
  // ==========================================================
  if (copyPaypalBtn && paypalEmailEl) {
    copyPaypalBtn.onclick = () => {
      const email = paypalEmailEl.textContent.trim();
      navigator.clipboard
        .writeText(email)
        .then(() => showPopup("PayPal email copied"))
        .catch(() => showPopup("Unable to copy email", "error"));
    };
  }

  if (closePaypalBtn && paypalModal) {
    closePaypalBtn.onclick = () => {
      paypalModal.style.display = "none";
    };
  }

  // ==========================================================
  //               CREATE DEPOSIT AND REDIRECT
  // ==========================================================
  if (cryptoSelect) {
    cryptoSelect.addEventListener("change", async () => {
      const method = cryptoSelect.value;
      const amount = parseFloat(depositAmount.value || 0);
      const planName = depositPlan.value;

      if (!method) return;

      if (!amount || amount < 50) {
        showPopup("Please enter a valid amount.", "error");
        return;
      }

      // ---------- PayPal path ----------
      if (method === "paypal") {
        if (!paypalModal) {
          showPopup("PayPal modal not found in DOM.", "error");
          return;
        }

        paypalModal.style.display = "flex";

        if (paypalSentBtn) {
          paypalSentBtn.onclick = async () => {
            try {
              const resUser = await fetch(`${API_BASE}/api/auth/me`, {
                credentials: "include",
              });
              const user = await resUser.json();
              const uid = user._id || user.id;

              // TODO: adjust this endpoint to match your backend
              const res = await fetch(`${API_BASE}/api/deposits/paypal`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  userId: uid,
                  amount,
                  plan: planName,
                  note: "User selected PayPal Friends and Family. Pending admin verification.",
                }),
              });

              const data = await res.json();
              if (!res.ok) throw new Error(data.msg || "PayPal deposit failed");

              showPopup("Your PayPal deposit request has been created.", "success");
              paypalModal.style.display = "none";
              depositModal.style.display = "none";
            } catch (e) {
              console.error(e);
              showPopup("Error creating PayPal deposit.", "error");
            }
          };
        }

        return;
      }

      // ---------- Crypto path via NowPayments ----------
      try {
        const resUser = await fetch(`${API_BASE}/api/auth/me`, {
          credentials: "include",
        });
        const user = await resUser.json();
        const uid = user._id || user.id;

        const res = await fetch(`${API_BASE}/api/nowpayments/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            userId: uid,
            amount,
            plan: planName,
            method, // crypto coin
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
  }

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
    if (paypalModal && e.target === paypalModal) paypalModal.style.display = "none";
  };
});