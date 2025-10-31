document.addEventListener("DOMContentLoaded", async () => {
  const API_BASE = window.API_BASE;

  try {
    // ✅ Step 1: Get logged-in user details
    const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
    if (!res.ok) throw new Error("User not authenticated");
    const user = await res.json();

    // ✅ Extract user info
    const referralCode = user.referralCode || "N/A";
    const firstName = user.firstName || "User";

    // ✅ Update referral link dynamically
    const referralInput = document.getElementById("referralLink");
    const referralUrl = `https://emuntra.vercel.app/user/index.html?ref=${referralCode}`;
    // const referralUrl = `https://emuntra.com/?ref=${referralCode}`;
    referralInput.value = referralUrl;

    // ✅ Update personalized text in page
    document.getElementById("welcomeName").textContent = firstName;
    const refSpan = document.querySelector(".referral-card p span");
    if (refSpan) refSpan.textContent = referralUrl;

    console.log("Referral URL:", referralUrl);

    // ✅ Step 2: Fetch referral stats from backend
    const resStats = await fetch(`${API_BASE}/api/referrals/my`, { credentials: "include" });
    if (!resStats.ok) throw new Error("Failed to load referral stats");
    const stats = await resStats.json();

    // ✅ Step 3: Update referral stats table
    const table = document.querySelector(".referral-table");
    if (table) {
      table.innerHTML = `
        <tr><td>Your status</td><td>Client</td></tr>
        <tr><td>Your upline</td><td>${stats.user?.referredBy ? "Yes" : "None"}</td></tr>
        <tr><td>Referrals</td><td>${stats.totalReferrals || 0}</td></tr>
        <tr><td>Active referrals</td><td>${stats.activeReferrals || 0}</td></tr>
        <tr><td>Total commission</td><td>$${(stats.totalCommission || 0).toFixed(2)}</td></tr>
      `;
    }

    // ✅ Optional: Show a simple console summary
    console.log("Referral stats loaded:", stats);
  } catch (err) {
    console.error("❌ Referral setup error:", err);
    // Optionally redirect if not logged in
    // window.location.href = "./login.html";
  }

  // ✅ Step 4: Copy to clipboard
  document.getElementById("copyBtn").addEventListener("click", () => {
    const referralInput = document.getElementById("referralLink");
    referralInput.select();
    referralInput.setSelectionRange(0, 99999);
    document.execCommand("copy");

    const copyMessage = document.getElementById("copyMessage");
    const copyBtn = document.getElementById("copyBtn");
    copyMessage.style.display = "inline";
    copyBtn.textContent = "Copied!";
    setTimeout(() => {
      copyMessage.style.display = "none";
      copyBtn.textContent = "Copy";
    }, 2000);
  });
});