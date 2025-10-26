document.addEventListener("DOMContentLoaded", async () => {
  const API_BASE = window.API_BASE;
  let userId = null;

  // ✅ STEP 1: Get authenticated user
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
    if (!res.ok) throw new Error("User not authenticated");
    const user = await res.json();
    userId = user.id;
    document.getElementById("welcomeName").textContent = user.firstName || "User";
  } catch (err) {
    console.error("❌ Error loading user:", err);
    window.location.href = "./login.html";
    return;
  }

  // ✅ STEP 2: Fetch all deposits
  let deposits = [];
  try {
    const res = await fetch(`${API_BASE}/api/deposits/user/${userId}`, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to load deposits");
    deposits = await res.json();
  } catch (err) {
    console.error("❌ Error fetching deposits:", err);
  }

  // ✅ STEP 3: Filter active and completed deposits
  const activeDeposits = deposits.filter(
    (d) => d.status === "approved" || d.status === "active"
  );
  const completedDeposits = deposits.filter((d) => d.status === "completed");

  // ✅ STEP 4: Fetch pending withdrawals separately
  let pendingWithdrawals = 0;
  try {
    const res = await fetch(`${API_BASE}/api/withdrawals/pending`, { credentials: "include" });
    if (res.ok) {
      const withdrawals = await res.json();
      const userPending = withdrawals.filter(
        (w) => w.user === userId || w.user?._id === userId
      );
      pendingWithdrawals = userPending.reduce((sum, w) => sum + (w.amount || 0), 0);
    }
  } catch (err) {
    console.warn("⚠️ Could not load pending withdrawals:", err);
  }

  // ✅ STEP 5: Calculate stats (Total Investment, Profit, etc.)
  const normalizePlan = (plan) => {
    if (!plan) return "Unknown";
    const p = plan.toLowerCase();
    if (p.includes("bronze")) return "Bronze";
    if (p.includes("silver")) return "Silver";
    if (p.includes("gold")) return "Gold";
    if (p.includes("diamond")) return "Diamond";
    if (p.includes("platinum")) return "Platinum";
    return plan;
  };

  const planRates = {
    Bronze: 4,
    Silver: 8,
    Gold: 18,
    Diamond: 24,
    Platinum: 40,
  };

  const allDeposits = deposits.filter(
    (d) => ["approved", "completed", "active"].includes(d.status)
  );

  const totalInvestment = activeDeposits.reduce(
    (sum, d) => sum + (d.amount || 0),
    0
  );

  const activePlans = activeDeposits.length;

  const totalProfit = allDeposits.reduce((sum, d) => {
    const normalizedPlan = normalizePlan(d.plan);
    const rate = planRates[normalizedPlan] || 0;
    const profit = ((d.amount || 0) * rate) / 100;
    return sum + profit;
  }, 0);

  // ✅ STEP 6: Update Summary Cards
  document.getElementById("totalInvestment").textContent = `$${totalInvestment.toFixed(2)}`;
  document.getElementById("activePlans").textContent = activePlans;
  document.getElementById("totalProfit").textContent = `$${totalProfit.toFixed(2)}`;
  document.getElementById("pendingWithdrawals").textContent = `$${pendingWithdrawals.toFixed(2)}`;

  // ✅ STEP 7: Populate Portfolio Table
  const tableBody = document.getElementById("portfolioTableBody");
  tableBody.innerHTML = "";

  if (activeDeposits.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;">No active investments</td></tr>`;
  } else {
    activeDeposits.forEach((d) => {
      const planName = normalizePlan(d.plan);
      const dailyProfitPercent = planRates[planName] || 0;

      const currentEarnings = ((d.amount * dailyProfitPercent) / 100).toFixed(2);
      const statusClass =
        d.status === "approved" || d.status === "active"
          ? "active"
          : d.status === "completed"
          ? "completed"
          : "pending";

      const row = `
        <tr>
          <td>${planName}</td>
          <td>$${(d.amount || 0).toFixed(2)}</td>
          <td>${dailyProfitPercent}%</td>
          <td>$${currentEarnings}</td>
          <td><span class="status ${statusClass}">${d.status}</span></td>
        </tr>`;
      tableBody.insertAdjacentHTML("beforeend", row);
    });
  }

  // ✅ STEP 8: Chart.js - Performance Overview
  const ctx = document.getElementById("portfolioChart");
  const labels = activeDeposits.map((d) => normalizePlan(d.plan));
  const dataPoints = activeDeposits.map((d) => d.amount || 0);

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels.length ? labels : ["No Plans"],
      datasets: [
        {
          label: "Investment Amount ($)",
          data: dataPoints.length ? dataPoints : [0],
          borderColor: "#2563eb",
          backgroundColor: "rgba(37,99,235,0.4)",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { display: true } },
      scales: { y: { beginAtZero: true } },
    },
  });
});