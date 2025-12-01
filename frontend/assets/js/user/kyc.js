const API_BASE = window.API_BASE || "https://api.emuntra.com";

document.getElementById("kycForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const ssn = document.getElementById("ssn").value.trim();
  const licenseNumber = document.getElementById("licenseNumber").value.trim();
  const frontFile = document.getElementById("frontImage").files[0];
  const backFile = document.getElementById("backImage").files[0];

  if (!ssn || !licenseNumber || !frontFile || !backFile) {
    showPopup("Please fill all fields.", "error");
    return;
  }

  const formData = new FormData();
  formData.append("ssn", ssn);
  formData.append("driverLicenseNumber", licenseNumber);
  formData.append("licenseFront", frontFile);
  formData.append("licenseBack", backFile);

  try {
    const res = await fetch(`${API_BASE}/api/kyc/submit`, {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok) {
      showPopup(data.message || "Submission failed.", "error");
      return;
    }

    showPopup("KYC submitted successfully.", "success");

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1500);

  } catch (error) {
    console.error(error);
    showPopup("Something went wrong.", "error");
  }
});