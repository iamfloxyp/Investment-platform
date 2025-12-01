const API_BASE = window.API_BASE || "https://api.emuntra.com";

document.getElementById("kycForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const ssn = document.getElementById("ssn").value.trim();
  const driverLicenseNumber = document.getElementById("driverLicenseNumber").value.trim();
  const frontFile = document.getElementById("licenseFront").files[0];
  const backFile = document.getElementById("licenseBack").files[0];

  if (!ssn || !driverLicenseNumber || !frontFile || !backFile) {
    showPopup("All fields are required.", "error");
    return;
  }

  const form = new FormData();
  form.append("ssn", ssn);
  form.append("driverLicenseNumber", driverLicenseNumber);
  form.append("licenseFront", frontFile);
  form.append("licenseBack", backFile);

  try {
    const res = await fetch(`${API_BASE}/api/kyc/submit`, {
      method: "POST",
      credentials: "include",
      body: form
    });

    const data = await res.json();

    if (!res.ok) {
      showPopup(data.message || "Submission failed.", "error");
      return;
    }

    showPopup("KYC submitted successfully.", "success");

    setTimeout(() => {
      window.location.href = "/user/dashboard.html";
    }, 1500);

  } catch (err) {
    console.error("KYC submit error:", err);
    showPopup("Something went wrong.", "error");
  }
});