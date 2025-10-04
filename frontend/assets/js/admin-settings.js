document.addEventListener("DOMContentLoaded", () => {
  // Load saved settings
  const savedSettings = JSON.parse(localStorage.getItem("adminSettings")) || {};
  loadSettings(savedSettings);

  // Profile
  document.getElementById("profileForm").addEventListener("submit", e => {
    e.preventDefault();
    savedSettings.profile = {
      name: document.getElementById("adminName").value,
      email: document.getElementById("adminEmail").value,
      password: document.getElementById("adminPassword").value
    };
    saveSettings(savedSettings);
  });

  // System
  document.getElementById("systemForm").addEventListener("submit", e => {
    e.preventDefault();
    savedSettings.system = {
      brandName: document.getElementById("brandName").value,
      currency: document.getElementById("currency").value
    };
    saveSettings(savedSettings);
  });

  // Security
  document.getElementById("securityForm").addEventListener("submit", e => {
    e.preventDefault();
    savedSettings.security = {
      enable2FA: document.getElementById("enable2FA").checked
    };
    saveSettings(savedSettings);
  });

  // Transactions
  document.getElementById("transactionForm").addEventListener("submit", e => {
    e.preventDefault();
    savedSettings.transactions = {
      minLimit: document.getElementById("minLimit").value,
      maxLimit: document.getElementById("maxLimit").value,
      withdrawApproval: document.getElementById("withdrawApproval").value
    };
    saveSettings(savedSettings);
  });

  function saveSettings(settings) {
    localStorage.setItem("adminSettings", JSON.stringify(settings));
    alert("Settings saved successfully!");
  }

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
});