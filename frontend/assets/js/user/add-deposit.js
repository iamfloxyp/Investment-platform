document.addEventListener("DOMContentLoaded", () => {
  /* ==========================================================
     DOM ELEMENTS
  ========================================================== */
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

  // PayPal modal
  const paypalModal = document.getElementById("paypalModal");
  const paypalEmailEl = document.getElementById("paypalEmail");
  const paypalSentBtn = document.getElementById("paypalSentBtn");
  const copyPaypalBtn = document.getElementById("copyPaypalBtn");
  const closePaypalBtn = document.getElementById("closePaypal");

  const API_BASE = window.API_BASE;
  let userId = null;

  /* ==========================================================
     SUPPORTED COINS – MATCHING BACKEND
  ========================================================== */
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
    ada: "ada",
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
    ada: "Cardano (ADA)",
  };

  /* ==========================================================
     POPUP UTILITY
  ========================================================== */
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

  /* ==========================================================
     CRYPTO DROPDOWN
  ========================================================== */
  function loadCryptoList() {
    if (!cryptoSelect) return;

    cryptoSelect.innerHTML = `<option value="">-- Select Crypto --</option>`;

    Object.entries(NOWPAY_COINS).forEach(([symbol, npCode]) => {
      const opt = document.createElement("option");
      opt.value = npCode;
      opt.textContent = COIN_LABELS[npCode] || symbol.toUpperCase();
      cryptoSelect.appendChild(opt);
    });

    // PayPal option
    const paypalOpt = document.createElement("option");
    paypalOpt.value = "paypal";
    paypalOpt.textContent = "PayPal (Friends and Family)";
    cryptoSelect.prepend(paypalOpt);
  }
  loadCryptoList();

  /* ==========================================================
     FETCH USER
  ========================================================== */
  (async function fetchUser() {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: "include",
      });
      if (!res.ok) throw new Error("User not authenticated");

      const user = await res.json();
      userId = user._id || user.id;

      // Update balance display
      const balanceEl = document.querySelector(".balance h3");
      if (balanceEl) balanceEl.textContent = `$${(user.balance || 0).toFixed(2)}`;

      const available = document.getElementById("availableBalance");
      if (available) {
        available.textContent = `$${(user.availableBalance ?? user.balance ?? 0).toFixed(2)}`;
      }
    } catch (err) {
      console.error("Auth Error:", err);
      alert("Session expired. Please log in again.");
      window.location.href = "./login.html";
    }
  })();

  /* ==========================================================
     DEPOSIT MODAL
  ========================================================== */
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

      if (cryptoSelect) cryptoSelect.value = "";
    });
  });

  /* ==========================================================
     PAYPAL OPTION
  ========================================================== */
  if (copyPaypalBtn) {
    copyPaypalBtn.onclick = () => {
      navigator.clipboard.writeText(paypalEmailEl.textContent.trim());
      showPopup("PayPal email copied");
    };
  }

  if (closePaypalBtn) {
    closePaypalBtn.onclick = () => {
      paypalModal.style.display = "none";
    };
  }

  /* ==========================================================
     CREATE DEPOSIT (CRYPTO + PAYPAL)
  ========================================================== */
  if (cryptoSelect) {
    cryptoSelect.addEventListener("change", async () => {
      const method = cryptoSelect.value;
      const amount = Number(depositAmount.value || 0);
      const planName = depositPlan.value;

      if (!method) return;
      if (!amount || amount < 50) {
        showPopup("Please enter a valid amount.", "error");
        return;
      }

      /* ---------------------------
         PAYPAL HANDLER
      --------------------------- */
      if (method === "paypal") {
        paypalModal.style.display = "flex";

        paypalSentBtn.onclick = async () => {
          try {
            const res = await fetch(`${API_BASE}/api/deposits/paypal`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({
                userId,
                amount,
                plan: planName,
                note: "User selected PayPal FNF. Pending admin approval.",
              }),
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.msg);

            showPopup("Your PayPal deposit request has been created.");
            paypalModal.style.display = "none";
            depositModal.style.display = "none";
          } catch (err) {
            console.error(err);
            showPopup("Error creating PayPal deposit.", "error");
          }
        };
        return;
      }

      /* ---------------------------
         CRYPTO HANDLER (NOWPAYMENTS)
      --------------------------- */
      try {
        const res = await fetch(`${API_BASE}/api/nowpayments/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            userId,
            amount,
            plan: planName,
            method,
          }),
        });

        const data = await res.json();
        console.log("Deposit response:", data);

        if (!res.ok) throw new Error(data.msg || "Deposit failed");

        let iid = null;

        if (data.paymentLink) {
          const regex1 = /iid=(\d+)/;
          const regex2 = /invoice_id=(\d+)/;

          iid = data.paymentLink.match(regex1)?.[1] ||
                data.paymentLink.match(regex2)?.[1] ||
                null;
        }

        if (iid) {
          showPopup("Redirecting to secure payment.", "success");
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

  /* ==========================================================
     CLOSE MODALS
  ========================================================== */
  document.getElementById("closeCalc").onclick = () => (calcModal.style.display = "none");
  document.getElementById("closeDeposit").onclick = () => (depositModal.style.display = "none");
  document.getElementById("calcOkBtn").onclick = () => (calcModal.style.display = "none");
  document.getElementById("depositOkBtn").onclick = () => (depositModal.style.display = "none");

  /* ==========================================================
     CALCULATOR LOGIC
  ========================================================== */
  document.getElementById("calcForm").addEventListener("submit", (e) => {
    e.preventDefault();

    const card = document.querySelector(`[data-name="${calcPlan.value}"]`);
    if (!card) return;

    const rate = Number(card.dataset.rate);
    const amount = Number(calcAmount.value);

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

  /* ==========================================================
     CLICK OUTSIDE TO CLOSE
  ========================================================== */
  window.onclick = (e) => {
    if (e.target === calcModal) calcModal.style.display = "none";
    if (e.target === depositModal) depositModal.style.display = "none";
    if (e.target === paypalModal) paypalModal.style.display = "none";
  };
});