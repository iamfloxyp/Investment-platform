// frontend/assets/js/user/kyc.js
const API_BASE = window.API_BASE || "https://api.emuntra.com";

document.addEventListener("DOMContentLoaded", () => {
  async function loadKYCStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: "include"
    });
    const data = await res.json();

    const statusBox = document.getElementById("kycStatusBox");
    if (!statusBox) return;

    if (data.kycStatus === "pending") {
      statusBox.textContent = "Status: Pending";
      statusBox.style.background = "#fff3cd";
    } else if (data.kycStatus === "verified") {
      statusBox.textContent = "Status: Verified";
      statusBox.style.background = "#d4edda";
    } else if (data.kycStatus === "rejected") {
      statusBox.textContent = "Status: Rejected";
      statusBox.style.background = "#f8d7da";
    } else {
      statusBox.textContent = "Status: Not Submitted";
      statusBox.style.background = "#ffe8e8";
    }

  } catch (err) {
    console.error("Failed to load KYC:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadKYCStatus();
});
  const form = document.getElementById("kycForm");
  if (!form) {
    console.error("KYC form not found");
    return;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const ssnInput = document.getElementById("ssn");
    const licenseNumberInput = document.getElementById("licenseNumber");
    const frontInput = document.getElementById("frontImage");
    const backInput = document.getElementById("backImage");

    const ssn = ssnInput ? ssnInput.value.trim() : "";
    const licenseNumber = licenseNumberInput ? licenseNumberInput.value.trim() : "";
    const frontFile = frontInput && frontInput.files ? frontInput.files[0] : null;
    const backFile = backInput && backInput.files ? backInput.files[0] : null;

    if (!ssn || !licenseNumber || !frontFile || !backFile) {
      showPopup("Please fill in all fields and select both images.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("ssn", ssn);
    formData.append("driverLicenseNumber", licenseNumber);
    formData.append("frontImage", frontFile);
    formData.append("backImage", backFile);

    try {
      const res = await fetch(`${API_BASE}/api/kyc/submit`, {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      let data = {};
      try {
        data = await res.json();
      } catch (_) {
        data = {};
      }

      if (!res.ok) {
        const msg = data.message || "Submission failed.";
        showPopup(msg, "error");
        return;
      }

      showPopup(data.message || "KYC submitted successfully.", "success");

      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      console.error("KYC error:", err);
      showPopup("Network or server error submitting KYC.", "error");
    }
  });
});