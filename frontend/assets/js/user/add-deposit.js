document.addEventListener("DOMContentLoaded", () => {
  const depositModal = document.getElementById("depositModal");
  const depositPlan = document.getElementById("depositPlan");
  const depositAmount = document.getElementById("depositAmount");

  const cryptoSelect = document.getElementById("cryptoSelect");
  const addressSection = document.getElementById("cryptoAddressSection");
  const addressBox = document.getElementById("cryptoAddress");

  const paypalModal = document.getElementById("paypalModal");
  const paypalSentBtn = document.getElementById("paypalSentBtn");
  const closePaypalBtn = document.getElementById("closePaypal");

  const API_BASE = window.API_BASE;
  let userId = null;

  function showPopup(msg, type = "success") {
    const pop = document.createElement("div");
    pop.textContent = msg;
    pop.style.position = "fixed";
    pop.style.bottom = "20px";
    pop.style.right = "20px";
    pop.style.padding = "12px 18px";
    pop.style.background = type === "error" ? "#c0392b" : "#102630";
    pop.style.color = "#fff";
    pop.style.borderRadius = "6px";
    pop.style.zIndex = "10000";
    document.body.appendChild(pop);
    setTimeout(() => pop.remove(), 3000);
  }

  // Load logged in user
  (async function fetchUser() {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Not authenticated");

      const user = await res.json();
      userId = user._id || user.id;
    } catch (err) {
      alert("Session expired. Login again.");
      window.location.href = "./login.html";
    }
  })();

  // =====================================================
  // LOAD CRYPTO COINS FROM NOWPAYMENTS
  // =====================================================
  async function loadCryptoList() {
    cryptoSelect.innerHTML = `<option value="">-- Select Method --</option>`;

    try {
      const res = await fetch(`${API_BASE}/api/nowpayments/coins`, {
        credentials: "include",
      });

      const data = await res.json();

      const coinNames = {
        btc: "Bitcoin (BTC)",
        eth: "Ethereum (ETH)",
        usdttrc20: "Tether USDT TRC20",
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

      data.coins.forEach((code) => {
        const opt = document.createElement("option");
        opt.value = code;
        opt.textContent = coinNames[code] || code.toUpperCase();
        cryptoSelect.appendChild(opt);
      });
    } catch (err) {
      console.error("Coin load error:", err);
      showPopup("Error loading coins", "error");
    }

    // Add PayPal
    const paypalOpt = document.createElement("option");
    paypalOpt.value = "paypal";
    paypalOpt.textContent = "PayPal (Friends and Family)";
    cryptoSelect.prepend(paypalOpt);
  }

  loadCryptoList();

  // =====================================================
  // OPEN DEPOSIT MODAL
  // =====================================================
  document.querySelectorAll(".btn-plan").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const card = e.target.closest(".plan-card");
      depositPlan.value = card.dataset.name;
      depositAmount.value = card.dataset.min;

      depositModal.style.display = "flex";

      addressSection.style.display = "none";
      cryptoSelect.value = "";
    });
  });

  // =====================================================
  // HANDLE PAYPAL PAYMENT
  // =====================================================
  if (closePaypalBtn) {
    closePaypalBtn.onclick = () => {
      paypalModal.style.display = "none";
    };
  }

  // =====================================================
  // HANDLE CRYPTO SELECTION
  // =====================================================
  cryptoSelect.addEventListener("change", async () => {
    const coin = cryptoSelect.value;
    const amount = parseFloat(depositAmount.value);
    const plan = depositPlan.value;

    if (!coin) return;

    // PayPal Path
    if (coin === "paypal") {
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
              plan,
              note: "User selected PayPal manual payment.",
            }),
          });

          const data = await res.json();
          if (!res.ok) throw new Error(data.msg);

          showPopup("PayPal deposit submitted for approval");
          paypalModal.style.display = "none";
          depositModal.style.display = "none";
        } catch {
          showPopup("Error sending PayPal request", "error");
        }
      };

      return;
    }

    // =========================================
    //   CRYPTO PAYMENT USING NOWPAYMENTS
    // =========================================
    try {
      const res = await fetch(`${API_BASE}/api/nowpayments/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          userId,
          amount,
          plan,
          method: coin,
        }),
      });

      const data = await res.json();
      console.log("Deposit result:", data);

      if (!res.ok) throw new Error(data.msg || "Deposit failed");

      if (!data.paymentLink) throw new Error("No payment link received");

      showPopup("Redirecting to secure payment page");
      window.location.href = data.paymentLink;

    } catch (err) {
      console.error(err);
      showPopup("Error connecting to payment server", "error");
    }
  });

  // Close deposit modal
  document.getElementById("closeDeposit").onclick = () => {
    depositModal.style.display = "none";
  };
  document.getElementById("depositOkBtn").onclick = () => {
    depositModal.style.display = "none";
  };

  document.getElementById("closeCalc").onclick = () => {
    calcModal.style.display = "none";
  };
  document.getElementById("calcOkBtn").onclick = () => {
    calcModal.style.display = "none";
  };

  window.onclick = (e) => {
    if (e.target === calcModal) calcModal.style.display = "none";
    if (e.target === depositModal) depositModal.style.display = "none";
    if (paypalModal && e.target === paypalModal) paypalModal.style.display = "none";
  };
});