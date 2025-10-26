// frontend/assets/js/settings.js
document.addEventListener("DOMContentLoaded", async () => {
  // ---- API base (same pattern you use elsewhere)
  const API_BASE = window.API_BASE;
  // Elements
  const els = {
    welcomeName: document.getElementById("welcomeName"),
    userName: document.getElementById("userName"),
    userEmail: document.getElementById("userEmail"),
    regDate: document.getElementById("regDate"),
    avatarImg: document.getElementById("userAvatar"),
    avatarIcon: document.getElementById("avatarIcon"),
    avatarInput: document.getElementById("avatarUpload"),
    avatarMsg: document.getElementById("avatarMsg"),

    fullName: document.getElementById("fullName"),
    email: document.getElementById("email"),
    newPassword: document.getElementById("newPassword"),
    rePassword: document.getElementById("rePassword"),
    personalMsg: document.getElementById("personalMsg"),
    savePersonal: document.getElementById("savePersonal"),

    btcWallet: document.getElementById("btcWallet"),
    ethWallet: document.getElementById("ethWallet"),
    usdtWallet: document.getElementById("usdtWallet"),
    bankAccount: document.getElementById("bankAccount"),
    paypalAccount: document.getElementById("paypalAccount"),
    paymentMsg: document.getElementById("paymentMsg"),
    savePayment: document.getElementById("savePayment"),
  };

  // Util helpers
  const toggleDisabled = (ids, on) => ids.forEach(id => (document.getElementById(id).disabled = on));
  const show = (el) => (el.style.display = "block");
  const hide = (el) => (el.style.display = "none");

  // ---- 1) Load current user
  let me;
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
    if (!res.ok) throw new Error("Not authenticated");
    me = await res.json();
  } catch (err) {
    console.error("Load me failed:", err);
    window.location.href = "./login.html";
    return;
  }

  // ---- 2) Populate UI
  const firstName = me.firstName || "User";
  const lastName = me.lastName || "";
  const fullName = `${firstName} ${lastName}`.trim();

  els.welcomeName.textContent = firstName;
  els.userName.textContent = fullName || "User";
  els.userEmail.textContent = me.email || "";
  els.regDate.textContent = me.createdAt ? `Registration: ${new Date(me.createdAt).toLocaleString()}` : "";

  els.fullName.value = fullName;
  els.email.value = me.email || "";

  // Wallet addresses object from backend (NOT balances)
  const wa = me.walletAddresses || {};
  els.btcWallet.value = wa.btc || "";
  els.ethWallet.value = wa.eth || "";
  els.usdtWallet.value = wa.usdt || "";
  els.bankAccount.value = wa.bank || "";
  els.paypalAccount.value = wa.paypal || "";

  // Avatar (optional string URL or data URL saved on user.avatar)
  if (me.avatar) {
    els.avatarImg.src = me.avatar;
    els.avatarImg.style.display = "block";
    els.avatarIcon.style.display = "none";
  } else {
    els.avatarImg.style.display = "none";
    els.avatarIcon.style.display = "block";
  }

  // ---- 3) Edit buttons (wire to global functions used by HTML)
  window.editSection = function (section) {
    if (section === "personal") {
      toggleDisabled(["fullName", "email", "newPassword", "rePassword"], false);
      show(els.savePersonal);
    }
    if (section === "payment") {
      toggleDisabled(["btcWallet", "ethWallet", "usdtWallet", "bankAccount", "paypalAccount"], false);
      show(els.savePayment);
    }
  };

  // ---- 4) Save handlers -> call backend
  window.saveSection = async function (section) {
    try {
      if (section === "personal") {
        const name = els.fullName.value.trim();
        const email = els.email.value.trim().toLowerCase();
        const [fn, ...rest] = name.split(" ");
        const ln = rest.join(" ");

        // change email/name
        const r1 = await fetch(`${API_BASE}/api/users/me`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ firstName: fn || "", lastName: ln || "", email }),
        });
        if (!r1.ok) throw new Error("Failed to update profile");

        // change password if both provided and match
        const p1 = els.newPassword.value;
        const p2 = els.rePassword.value;
        if (p1 || p2) {
          if (p1 !== p2) throw new Error("Passwords do not match.");
          if (p1.length < 6) throw new Error("Password must be at least 6 characters.");
          const r2 = await fetch(`${API_BASE}/api/users/me/password`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ password: p1 }),
          });
          if (!r2.ok) throw new Error("Failed to update password");
        }

        show(els.personalMsg);
        setTimeout(() => hide(els.personalMsg), 4000);
        hide(els.savePersonal);
        toggleDisabled(["fullName", "email", "newPassword", "rePassword"], true);
      }

      if (section === "payment") {
        const payload = {
          btc: els.btcWallet.value.trim(),
          eth: els.ethWallet.value.trim(),
          usdt: els.usdtWallet.value.trim(),
          bank: els.bankAccount.value.trim(),
          paypal: els.paypalAccount.value.trim(),
        };

        const r = await fetch(`${API_BASE}/api/users/me/wallets`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(payload),
        });
        if (!r.ok) throw new Error("Failed to update wallet addresses");

        show(els.paymentMsg);
        setTimeout(() => hide(els.paymentMsg), 4000);
        hide(els.savePayment);
        toggleDisabled(["btcWallet", "ethWallet", "usdtWallet", "bankAccount", "paypalAccount"], true);
      }
    } catch (err) {
      alert(err.message || "Update failed.");
      console.error(err);
    }
  };

  // ---- 5) Avatar upload -> send base64 to backend
  els.avatarInput.addEventListener("change", (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const dataUrl = ev.target.result; // base64 data URL
        const r = await fetch(`${API_BASE}/api/users/me/avatar`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ avatarDataUrl: dataUrl }),
        });
        if (!r.ok) throw new Error("Failed to update avatar");

        els.avatarImg.src = dataUrl;
        els.avatarImg.style.display = "block";
        els.avatarIcon.style.display = "none";
        show(els.avatarMsg);
        setTimeout(() => hide(els.avatarMsg), 4000);
      } catch (err) {
        alert(err.message || "Avatar upload failed.");
        console.error(err);
      }
    };
    reader.readAsDataURL(file);
  });
});