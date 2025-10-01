document.addEventListener("DOMContentLoaded", () => {
  const userBtn = document.getElementById("userBtn");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const welcomeName = document.getElementById("welcomeName"); // 👈 grab welcome span

  // ✅ Load username from localStorage (only once)
  const username = localStorage.getItem("username") || "User";

  // Set name in dropdown button
  if (userBtn) {
    userBtn.textContent = username + " ▾";
  }

  // Set name in welcome message
  if (welcomeName) {
    welcomeName.textContent = username;
  }

  // Dropdown toggle
  if (userBtn) {
    userBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle("show");
    });
  }

  // Close dropdown if click happens outside
  window.addEventListener("click", (e) => {
    if (!e.target.closest(".user-menu")) {
      dropdownMenu.classList.remove("show");
    }
  });
});

// Toggle Mobile Menu
function toggleMenu() {
  const navLinks = document.getElementById("navLinks");
  navLinks.classList.toggle("show");
}
// Redirect to investment page
function startInvestment() {
  window.location.href = "deposit.html"; // or investment.html if you make one
}

// Handle card routing
function goToPage(page) {
  window.location.href = page;
}

function calculateReturn() {
  const amount = parseFloat(document.getElementById("amount").value);
  const plan = document.getElementById("plan").value;
  const currency = document.getElementById("currency").value;

  if (isNaN(amount) || !plan) {
    document.getElementById("calcResult").innerText = "Please enter amount and select a plan.";
    return;
  }

  // Fixed conversion rates to USD
  const rates = {
    USD: 1,
    GBP: 1.25,   // £1 = $1.25
    EUR: 1.10,   // €1 = $1.10
    NGN: 0.0012  // ₦1 = $0.0012 (example rate)
  };

  // Extract duration and rate
  const [duration, percent] = plan.split("-").map(Number);

  // Convert to USD for calculation
  const amountInUSD = amount * rates[currency];
  const profitUSD = (amountInUSD * percent) / 100;
  const totalUSD = amountInUSD + profitUSD;

  // Convert back to user’s selected currency
  const profitInUserCurrency = profitUSD / rates[currency];
  const totalInUserCurrency = totalUSD / rates[currency];

  // Currency symbols
  const symbols = { USD: "$", GBP: "£", EUR: "€", NGN: "₦" };

  // Show results
  document.getElementById("calcResult").innerHTML = `
    <p>📅 Duration: <strong>${duration} days</strong></p>
    <p>💵 Expected Profit: <strong>${symbols[currency]}${profitInUserCurrency.toFixed(2)}</strong></p>
    <p>💰 Total Return: <strong>${symbols[currency]}${totalInUserCurrency.toFixed(2)}</strong></p>
    <hr>
    <p>👉 If you invest <strong>${symbols[currency]}${amount.toFixed(2)}</strong> in this plan, 
    after <strong>${duration} days</strong> you will earn a profit of 
    <strong>${symbols[currency]}${profitInUserCurrency.toFixed(2)}</strong>. 
    This means you will get back a total of 
    <strong>${symbols[currency]}${totalInUserCurrency.toFixed(2)}</strong> at the end of the plan.</p>
  `;

  // Show OK button
  document.getElementById("okBtn").style.display = "block";
}

function resetCalc() {
  document.getElementById("calcForm").reset();
  document.getElementById("calcResult").innerHTML = "";
  document.getElementById("okBtn").style.display = "none";
}

document.addEventListener("DOMContentLoaded", () => {
  const calcAmount = document.getElementById("calcAmount");
  const calcPlan = document.getElementById("calcPlan");
  const resultBox = document.getElementById("calcResult");

  const depositAmount = document.getElementById("depositAmount");
  const depositPlan = document.getElementById("depositPlan");

  // Calculate your profit links
  document.querySelectorAll(".calc-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const card = e.target.closest(".plan-card");

      // Autofill calculator
      calcPlan.value = card.dataset.name;
      calcAmount.value = card.dataset.min;

      resultBox.innerHTML = `
        <p><strong>${card.dataset.name}</strong></p>
        <p>Daily Profit: ${card.dataset.rate}%</p>
        <p>Deposit Range: $${card.dataset.min} - $${card.dataset.max}</p>
        <p>Enter amount above to calculate your return.</p>
      `;

      // Smooth scroll to calculator
      document.querySelector(".investment-calculator").scrollIntoView({ behavior: "smooth" });
    });
  });

  // Select Plan buttons
  document.querySelectorAll(".btn-plan").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const card = e.target.closest(".plan-card");

      // Autofill deposit form
      depositPlan.value = card.dataset.name;
      depositAmount.value = card.dataset.min;

      alert(`You selected ${card.dataset.name}. Fill in your amount and click Make Deposit.`);
      document.getElementById("depositForm").scrollIntoView({ behavior: "smooth" });
    });
  });
});