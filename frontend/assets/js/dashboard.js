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
  window.location.href = "add-deposit.html"; // or investment.html if you make one
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

// Demo notification data (only set once if not already in localStorage)
if (!localStorage.getItem("notifications")) {
  let notifications = [
    { text: "Your deposit of $200 is confirmed", date: "2025-10-01", read: false },
    { text: "Withdrawal request of $50 is pending", date: "2025-09-30", read: false },
    { text: "Referral bonus earned: $20", date: "2025-09-28", read: true }
  ];
  localStorage.setItem("notifications", JSON.stringify(notifications));
}

// Grab elements by ID
const bellBtn = document.getElementById("bellBtn");
const notifDropdown = document.getElementById("notifDropdown");
const notifList = document.getElementById("notifList");
const notifBadge = document.getElementById("notifBadge");

// Render notifications
function renderNotifications() {
  if (!notifList || !notifBadge) return; // safety guard

  let stored = JSON.parse(localStorage.getItem("notifications")) || [];
  notifList.innerHTML = "";
  let unreadCount = 0;

  stored.forEach((n, index) => {
    if (!n.read) unreadCount++;
    let li = document.createElement("li");
    li.innerHTML = `<strong>${n.text}</strong><br><small>${n.date}</small>`;
    if (!n.read) li.style.fontWeight = "bold";

    // Mark as read on click
    li.addEventListener("click", () => {
      stored[index].read = true;
      localStorage.setItem("notifications", JSON.stringify(stored));
      renderNotifications();
    });

    notifList.appendChild(li);
  });

  notifBadge.textContent = unreadCount > 0 ? unreadCount : "";
}

// Toggle dropdown on bell click
if (bellBtn && notifDropdown) {
  bellBtn.addEventListener("click", (e) => {
    e.stopPropagation(); // prevent immediate close
    notifDropdown.style.display = notifDropdown.style.display === "flex" ? "none" : "flex";
  });
}

// Close dropdown when clicking outside
window.addEventListener("click", (e) => {
  if (notifDropdown && !e.target.closest(".notifications")) {
    notifDropdown.style.display = "none";
  }
});

// Initial render
renderNotifications();