// ============================================================
//  /assets/js/user/referral.js
// ============================================================

(function () {
  // ===== Helper selector =====
  const $ = (sel, root = document) => root.querySelector(sel);

  // ===== DOM ELEMENTS =====
  const welcomeNameEl     = $("#welcomeName");
  const referralLinkInput = $("#referralLink");
  const earnFromRefsEl    = $("#earnFromRefs");
  const refStatusEl       = $("#refStatus");
  const uplineNameEl      = $("#uplineName");
  const referralsCountEl  = $("#referralsCount");
  const activeRefsEl      = $("#activeReferrals");
  const totalCommissionEl = $("#totalCommission");

  // ===== API ENDPOINTS =====
  const API = window.API_BASE; // Defined in config.js
  const ME_URL  = `${API}/api/auth/me`;
  const REF_URL = `${API}/api/referrals/my`;

  // ===== MONEY FORMATTER =====
  const fmt = (v) => Number(v || 0).toFixed(2);

  // ===== FETCH WRAPPER =====
  async function getJSON(url, opts = {}) {
    const res = await fetch(url, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(text || `HTTP ${res.status}`);
    }
    return res.json();
  }

  // ============================================================
  //  🚀 INIT FUNCTION
  // ============================================================
  async function init() {
    try {
      // 1️⃣ GET LOGGED-IN USER
      const me = await getJSON(ME_URL);
      const fullName = `${me.firstName || ""} ${me.lastName || ""}`.trim();
      if (welcomeNameEl) welcomeNameEl.textContent = me.firstName || "User";

      // 2️⃣ BUILD REFERRAL LINK
      const siteBase =
        window.location.hostname.includes("127.0.0.1") ||
        window.location.hostname.includes("localhost")
          ? "https://investment-platform-eta.vercel.app/user/index.html"
          : `${window.location.origin.replace(/\/user.*/i, "")}/user/index.html`;

      const myLink = `${siteBase}?ref=${encodeURIComponent(me.referralCode || "")}`;
      if (referralLinkInput) referralLinkInput.value = myLink;

      // 3️⃣ GET REFERRAL STATS
      const stats = await getJSON(REF_URL);

      if (earnFromRefsEl)    earnFromRefsEl.textContent    = fmt(stats.totalCommission);
      if (totalCommissionEl) totalCommissionEl.textContent = fmt(stats.totalCommission);
      if (referralsCountEl)  referralsCountEl.textContent  = stats.referralsCount || 0;
      if (activeRefsEl)      activeRefsEl.textContent      = stats.activeReferrals || 0;
      if (uplineNameEl)      uplineNameEl.textContent      = stats.uplineName || "None";
      if (refStatusEl)       refStatusEl.textContent       = (me.role === "admin" ? "Admin" : "Client");

      console.log("✅ Referral stats loaded successfully:", stats);
    } catch (err) {
      console.error("❌ Referral page load error:", err.message);
    }
  }

  // ============================================================
  //  🖱️ COPY REFERRAL LINK
  // ============================================================
  function copyReferralLink() {
  if (!referralLinkInput) return;

  const link = referralLinkInput.value.trim();
  if (!link) {
    alert("No referral link found to copy.");
    return;
  }

  navigator.clipboard
    .writeText(link)
    .then(() => {
      const copyBtn = document.getElementById("copyBtn");
      if (copyBtn) {
        // Change button text to "Copied!"
        const originalText = copyBtn.textContent;
        copyBtn.textContent = "Copied!";
        copyBtn.disabled = true;

        // Restore button text after 1.5 seconds
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.disabled = false;
        }, 1500);
      }

      console.log("✅ Referral link copied to clipboard:", link);

      // Optional: refresh stats after copy
      refreshReferralStats();
    })
    .catch((err) => {
      console.error("❌ Clipboard copy failed:", err);
      alert("Failed to copy link. Please copy manually.");
    });
}

  // ============================================================
  //  🔁 REFRESH REFERRAL STATS (used after copy or on update)
  // ============================================================
  async function refreshReferralStats() {
    try {
      const stats = await getJSON(REF_URL);
      if (earnFromRefsEl)    earnFromRefsEl.textContent    = fmt(stats.totalCommission);
      if (totalCommissionEl) totalCommissionEl.textContent = fmt(stats.totalCommission);
      if (referralsCountEl)  referralsCountEl.textContent  = stats.referralsCount || 0;
      if (activeRefsEl)      activeRefsEl.textContent      = stats.activeReferrals || 0;
      console.log("🔄 Referral stats refreshed after copy:", stats);
    } catch (err) {
      console.error("⚠️ Could not refresh referral stats:", err.message);
    }
  }

  // ============================================================
  //  🧷 EVENT BINDINGS
  // ============================================================
  document.addEventListener("DOMContentLoaded", () => {
    const copyBtn = document.getElementById("copyBtn");
    if (copyBtn) {
      copyBtn.addEventListener("click", copyReferralLink);
    }

    // Initialize the referral dashboard once DOM is ready
    init();
  });
})();