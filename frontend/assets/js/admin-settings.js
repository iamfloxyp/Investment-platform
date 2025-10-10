const API_BASE = "http://127.0.0.1:4000"; // Change to your deployed API later

document.addEventListener("DOMContentLoaded", async () => {
  // Load settings from backend or local
  const savedSettings = await fetchSettingsFromBackend() || JSON.parse(localStorage.getItem("adminSettings")) || {};
  loadSettings(savedSettings);

  /* =========================
     ✅ PROFILE SETTINGS
  ========================= */
  document.getElementById("profileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    savedSettings.profile = {
      name: document.getElementById("adminName").value,
      email: document.getElementById("adminEmail").value,
      password: document.getElementById("adminPassword").value
    };
    await saveSettings(savedSettings);
  });

  /* =========================
     ✅ SYSTEM SETTINGS
  ========================= */
  document.getElementById("systemForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    savedSettings.system = {
      brandName: document.getElementById("brandName").value,
      currency: document.getElementById("currency").value
    };
    await saveSettings(savedSettings);
  });

  /* =========================
     ✅ SECURITY SETTINGS
  ========================= */
  document.getElementById("securityForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    savedSettings.security = {
      enable2FA: document.getElementById("enable2FA").checked
    };
    await saveSettings(savedSettings);
  });

  /* =========================
     ✅ TRANSACTION SETTINGS
  ========================= */
  document.getElementById("transactionForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    savedSettings.transactions = {
      minLimit: document.getElementById("minLimit").value,
      maxLimit: document.getElementById("maxLimit").value,
      withdrawApproval: document.getElementById("withdrawApproval").value
    };
    await saveSettings(savedSettings);
  });

  /* =========================
     🔹 FUNCTIONS
  ========================= */

  // ✅ Save both locally & backend
  async function saveSettings(settings) {
    // 1️⃣ Save locally
    localStorage.setItem("adminSettings", JSON.stringify(settings));

    // 2️⃣ Try save to backend
    try {
      const res = await fetch(`${API_BASE}/api/admin/settings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error("Failed to save to backend");
      showPopup("✅ Settings saved successfully!");
    } catch (err) {
      console.warn("⚠️ Backend not reachable, saved locally only.");
      showPopup("Saved locally (offline mode).", "warning");
    }
  }

  // ✅ Load into UI
  function loadSettings(settings) {
    if (settings.profile) {
      document.getElementById("adminName").value = settings.profile.name || "";
      document.getElementById("adminEmail").value = settings.profile.email || "";
    }
    if (settings.system) {
      document.getElementById("brandName").value = settings.system.brandName || "";
      document.getElementById("currency").value = settings.system.currency || "USD";
    }
    if (settings.security) {
      document.getElementById("enable2FA").checked = settings.security.enable2FA || false;
    }
    if (settings.transactions) {
      document.getElementById("minLimit").value = settings.transactions.minLimit || "";
      document.getElementById("maxLimit").value = settings.transactions.maxLimit || "";
      document.getElementById("withdrawApproval").value = settings.transactions.withdrawApproval || "no";
    }
  }

  // ✅ Fetch settings from backend
  async function fetchSettingsFromBackend() {
    try {
      const res = await fetch(`${API_BASE}/api/admin/settings`, {
        credentials: "include",
      });
      if (res.ok) return await res.json();
      return null;
    } catch (err) {
      console.warn("⚠️ Could not fetch backend settings:", err);
      return null;
    }
  }

  // ✅ Popup feedback
  function showPopup(message, type = "success") {
    const popup = document.createElement("div");
    popup.textContent = message;
    popup.style.position = "fixed";
    popup.style.bottom = "25px";
    popup.style.right = "25px";
    popup.style.padding = "10px 15px";
    popup.style.background = type === "error"
      ? "#c0392b"
      : type === "warning"
      ? "#f39c12"
      : "#102630";
    popup.style.color = "#fff";
    popup.style.borderRadius = "5px";
    popup.style.zIndex = "9999";
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 2500);
  }
});