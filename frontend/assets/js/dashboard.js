document.addEventListener("DOMContentLoaded", async () => {
  const userBtn = document.getElementById("userBtn");
  const dropdownMenu = document.getElementById("dropdownMenu");
  const welcomeName = document.getElementById("welcomeName");
  const bellBtn = document.getElementById("bellBtn");
  const notifDropdown = document.getElementById("notifDropdown");
  const notifBadge = document.getElementById("notifBadge");
  const notifList = document.getElementById("notifList");

  // ✅ Fetch user from backend via cookie
  try {
    const res = await fetch("https://your-backend-domain.com/api/auth/me", {
      credentials: "include"
    });

    if (!res.ok) throw new Error("Not authenticated");

    const user = await res.json();

    // ✅ Display name on dashboard
    if (userBtn) userBtn.textContent = `${user.firstName} ▾`;
    if (welcomeName) welcomeName.textContent = `Welcome, ${user.firstName}`;

    // Optional: Store ID if needed for notifications
    localStorage.setItem("userId", user.id);
  } catch (err) {
    console.warn("User not logged in. Redirecting to login...");
    window.location.href = "./login.html";
    return;
  }

  // ✅ DEMO Notifications from localStorage
  const sampleNotifs = [
    { id: 1, message: "Deposit of $100 successful", read: false },
    { id: 2, message: "Your withdrawal has been processed", read: false },
    { id: 3, message: "New investment plan added", read: true }
  ];

  // Save to localStorage only once
  if (!localStorage.getItem("notifications")) {
    localStorage.setItem("notifications", JSON.stringify(sampleNotifs));
  }

  const notifs = JSON.parse(localStorage.getItem("notifications")) || [];
  const unread = notifs.filter(n => !n.read);

  if (notifBadge) {
    notifBadge.textContent = unread.length;
    notifBadge.style.display = unread.length > 0 ? "inline-block" : "none";
  }

  if (notifList) {
    notifList.innerHTML = notifs.map(n => `<li>${n.message}</li>`).join("");
  }

  // Toggle user menu
  if (userBtn) {
    userBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      dropdownMenu.classList.toggle("show");
    });
  }

  // Toggle notifications dropdown
  if (bellBtn) {
    bellBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      notifDropdown.classList.toggle("show");
    });
  }

  // Close dropdowns if click outside
  window.addEventListener("click", (e) => {
    if (!e.target.closest(".user-menu")) {
      dropdownMenu.classList.remove("show");
    }
    if (!e.target.closest(".notifications")) {
      notifDropdown.classList.remove("show");
    }
  });
});

// ✅ Investment calculator (unchanged)
function calculateReturn() {
  const amount = parseFloat(document.getElementById("amount").value);
  const plan = document.getElementById("plan").value;
  const currency = document.getElementById("currency").value;
  const result = document.getElementById("calcResult");
  const okBtn = document.getElementById("okBtn");

  if (!amount || !plan) {
    result.textContent = "Please enter amount and select plan.";
    return;
  }

  const [days, percent] = plan.split("-").map(Number);
  const profit = amount * (percent / 100);
  const total = amount + profit;

  result.textContent = `You’ll earn ${currency} ${profit.toFixed(2)} in ${days} days. Total: ${currency} ${total.toFixed(2)}`;
  okBtn.style.display = "inline-block";
}

function resetCalc() {
  document.getElementById("calcForm").reset();
  document.getElementById("calcResult").textContent = "";
  document.getElementById("okBtn").style.display = "none";
}
// Logout button click
const logoutBtn = document.querySelector(".logout-btn");

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    try {
      const res = await fetch("http://localhost:4000/api/auth/logout", {
        method: "POST",
        credentials: "include"
      });

      if (res.ok) {
        // Optional: Clear userId from localStorage
        localStorage.removeItem("userId");
        window.location.href = "./login.html";
      } else {
        alert("Logout failed.");
      }
    } catch (err) {
      console.error("Logout error:", err);
      alert("Something went wrong during logout.");
    }
  });
}