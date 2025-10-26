document.addEventListener("DOMContentLoaded", async () => {
  const plans = [
    { name: "Bronze", min: 50, max: 599, rate: 4 },
    { name: "Silver", min: 600, max: 1899, rate: 8 },
    { name: "Gold", min: 1900, max: 5000, rate: 18 },
    { name: "Diamond", min: 5001, max: 6999, rate: 24 },
    { name: "Platinum", min: 7000, max: 100000, rate: 40 },
  ];

  const API_BASE = window.API_BASE;

  let userId = null;
  let dashboardActive = 0; // Store dashboard active total

  // ✅ Get authenticated user + dashboard data
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
    if (!res.ok) throw new Error("User not authenticated");
    const user = await res.json();
    userId = user.id;

    // ✅ Show user's name
    document.getElementById("welcomeName").textContent = user.firstName || "User";

    // ✅ If backend includes activeDeposits (from dashboard)
    if (user.activeDeposits !== undefined) {
      dashboardActive = user.activeDeposits;
      const activeDepositElement = document.querySelector(".active-deposit-card h3");
      if (activeDepositElement) {
        activeDepositElement.textContent = `$${dashboardActive.toFixed(2)}`;
      }
    }
  } catch (err) {
    console.error("❌ Unable to load user:", err);
    window.location.href = "./login.html";
    return;
  }

  // ✅ Fetch user's deposits from backend (for per-plan breakdown)
  let deposits = [];
  try {
    const res = await fetch(`${API_BASE}/api/deposits/user/${userId}`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch deposits");
    deposits = await res.json();
    console.log("✅ User deposits:", deposits);
  } catch (err) {
    console.error("❌ Error fetching deposits:", err);
  }

  // ✅ Filter approved or completed deposits
  const activeDeposits = deposits.filter(
    (d) => d.status === "approved" || d.status === "completed"
  );

  // ✅ Calculate total active deposits (backend precision)
  const totalActive = activeDeposits.reduce((sum, d) => sum + (d.amount || 0), 0);

  // ✅ Update the active deposit section (overwrite dashboard total if backend gives more accurate data)
  const activeDepositElement = document.querySelector(".active-deposit-card h3");
  if (activeDepositElement) {
    activeDepositElement.textContent = `$${totalActive.toFixed(2)}`;
  }

  // ✅ Group deposits by plan (using the actual plan field)
  plans.forEach((plan) => {
    const planBox = Array.from(document.querySelectorAll(".plan-box")).find(
      (box) => box.querySelector("h3")?.textContent.trim() === plan.name
    );
    if (!planBox) return;

    const planDeposits = activeDeposits.filter((d) => d.plan === plan.name);

    const depositContainer =
      planBox.querySelector(".plan-deposits") || planBox.querySelector("p:last-child");

    if (planDeposits.length > 0) {
      depositContainer.innerHTML = "";
      planDeposits.forEach((dep) => {
        const profit = ((dep.amount * plan.rate) / 100).toFixed(2);
        depositContainer.innerHTML += `
          <p>💰 Amount: $${dep.amount}</p>
          <p>📈 Daily Profit: $${profit}</p>
        `;
      });
    } else {
      depositContainer.innerHTML = `<p>No deposits for this plan</p>`;
    }
  });

  /* ============================================================
     ✅ HANDLE "CONFIRM DEPOSIT" BUTTON (NOWPayments Integration)
  ============================================================ */
  const confirmBtn = document.querySelector("#confirmDepositBtn");

  if (confirmBtn) {
    confirmBtn.addEventListener("click", async (e) => {
      e.preventDefault();

      const amountInput = document.querySelector("#amount");
      const planSelect = document.querySelector("#plan");
      const cryptoSelect = document.querySelector("#cryptoSelect");

      const amount = amountInput?.value?.trim();
      const plan = planSelect?.value?.trim();
      const method = cryptoSelect?.value?.trim();

      if (!amount || !plan || !method) {
        alert("Please fill in all fields before confirming deposit.");
        return;
      }

      try {
        const response = await fetch(`${API_BASE}/api/deposit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ userId, amount, plan, method }),
        });

        const data = await response.json();

        if (response.ok && data.paymentLink) {
          alert("Redirecting you to complete your payment...");
          window.open(data.paymentLink, "_blank"); // Opens NOWPayments link
        } else {
          alert(data.msg || "Unable to create deposit. Please try again.");
        }
      } catch (err) {
        console.error("❌ Error during deposit creation:", err);
        alert("Something went wrong while processing your deposit.");
      }
    });
  } else {
    console.warn("⚠️ Confirm Deposit button not found on this page.");
  }
});