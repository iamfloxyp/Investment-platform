const API_BASE = window.API_BASE || "https://api.emuntra.com";

document.addEventListener("DOMContentLoaded", () => {
  loadKYCStatus(); // <-- RUN THIS DIRECTLY

  const form = document.getElementById("kycForm");
  if (!form) return;

  form.addEventListener("submit", submitKYCForm);
});

async function loadKYCStatus() {
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, {
      credentials: "include"
    });
    const data = await res.json();

    const statusBox = document.getElementById("kycStatusBox");
    const statusText = document.getElementById("kycStatusText");

    if (!statusBox || !statusText) return;

    if (data.kycStatus === "pending") {
      statusText.textContent = "Pending";
      statusBox.style.background = "#fff3cd";
    } else if (data.kycStatus === "verified") {
      statusText.textContent = "Verified";
      statusBox.style.background = "#d4edda";
    } else if (data.kycStatus === "rejected") {
      statusText.textContent = "Rejected";
      statusBox.style.background = "#f8d7da";
    } else {
      statusText.textContent = "Not Submitted";
      statusBox.style.background = "#ffe8e8";
    }
  } catch (err) {
    console.error("Failed to load KYC:", err);
  }
}

async function submitKYCForm(e) {
  e.preventDefault();

  const ssn = document.getElementById("ssn").value.trim();
  const licenseNumber = document.getElementById("licenseNumber").value.trim();
  const frontFile = document.getElementById("frontImage").files[0];
  const backFile = document.getElementById("backImage").files[0];

  if (!ssn || !licenseNumber || !frontFile || !backFile) {
    showPopup("Please fill in all fields and upload both images.", "error");
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

    const data = await res.json();
    if (!res.ok) {
      showPopup(data.message || "Submission failed", "error");
      return;
    }

    showPopup("KYC submitted successfully", "success");

    setTimeout(() => {
      window.location.reload();
    }, 1500);
  } catch (err) {
    console.error(err);
    showPopup("Network error submitting KYC", "error");
  }
}