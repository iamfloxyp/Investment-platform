document.addEventListener("DOMContentLoaded", () => {
  const depositModal = document.getElementById("depositModal");
  const depositPlan = document.getElementById("depositPlan");
  const depositAmount = document.getElementById("depositAmount");

  const cryptoSelect = document.getElementById("cryptoSelect");
  const addressSection = document.getElementById("cryptoAddressSection");
  const addressBox = document.getElementById("cryptoAddress");

  // PayPal modal
  const paypalModal = document.getElementById("paypalModal");
  const paypalSentBtn = document.getElementById("paypalSentBtn");
  const closePaypalBtn = document.getElementById("closePaypal");

  const API_BASE = window.API_BASE;
  let userId = null;

  // =====================================================
  //                 POPUP MESSAGE
  // =====================================================
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

  // =====================================================
  //                LOAD USER DETAILS
  // =====================================================
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
  //          LOAD COINS FROM BLOCKBEE (DYNAMIC)
  // =====================================================
  async function loadCryptoList() {
    cryptoSelect.innerHTML = `<option value="">-- Select Crypto --</option>`;

    try {
      const res = await fetch(`${API_BASE}/api/blockbee/coins`, {
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed");

      const data = await res.json();

      if (!Array.isArray(data.coins)) throw new Error("Invalid format");

      data.coins.forEach((coin) => {
        const opt = document.createElement("option");
        opt.value = coin.code.toLowerCase();
        opt.textContent = coin.name;
        cryptoSelect.appendChild(opt);
      });
    } catch (err) {
      console.error("Coin load error:", err);

      // fallback
      const fallback = [
        { code: "btc", name: "Bitcoin (BTC)" },
        { code: "eth", name: "Ethereum (ETH)" },
        { code: "usdt", name: "Tether USDT" },
        { code: "ltc", name: "Litecoin (LTC)" },
        { code: "trx", name: "Tron (TRX)" },
        { code: "bch", name: "Bitcoin Cash (BCH)" }
      ];

      fallback.forEach((coin) => {
        const opt = document.createElement("option");
        opt.value = coin.code;
        opt.textContent = coin.name;
        cryptoSelect.appendChild(opt);
      });
    }

    // Add PayPal
    const paypalOpt = document.createElement("option");
    paypalOpt.value = "paypal";
    paypalOpt.textContent = "PayPal (Friends and Family)";
    cryptoSelect.prepend(paypalOpt);
  }

  loadCryptoList();

  // =====================================================
  //            OPEN DEPOSIT MODAL
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
  //                HANDLE PAYPAL PAYMENT
  // =====================================================
  if (closePaypalBtn) {
    closePaypalBtn.onclick = () => {
      paypalModal.style.display = "none";
    };
  }

  // =====================================================
  //          WHEN USER SELECTS A CRYPTO COIN
  // =====================================================
  cryptoSelect.addEventListener("change", async () => {
    const coin = cryptoSelect.value;
    const amount = parseFloat(depositAmount.value);
    const plan = depositPlan.value;

    if (!coin) return;

    // If PayPal
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

    // ====== CRYPTO PATH (BLOCKBEE) =======
    try {
      const res = await fetch(`${API_BASE}/api/blockbee/create`, {
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

      // EXPECTING: { address: "...", depositId: "..." }
      if (!data.address) throw new Error("No payment address received");

      addressBox.textContent = data.address;
      addressSection.style.display = "block";

      showPopup("Crypto payment address generated");
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