const API_BASE = window.API_BASE || "https://api.emuntra.com";

// Preview selected images
function previewImage(input, previewEl) {
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (file) {
      previewEl.src = URL.createObjectURL(file);
      previewEl.style.display = "block";
    }
  });
}

// Enable previews
previewImage(document.getElementById("frontImage"), document.getElementById("frontPreview"));
previewImage(document.getElementById("backImage"), document.getElementById("backPreview"));

document.getElementById("submitKYCBtn").addEventListener("click", async () => {
  const ssn = document.getElementById("ssn").value.trim();
  const licenseNumber = document.getElementById("licenseNumber").value.trim();
  const frontFile = document.getElementById("frontImage").files[0];
  const backFile = document.getElementById("backImage").files[0];

  if (!ssn || !licenseNumber || !frontFile || !backFile) {
    showPopup("Please fill all fields and upload both ID images.", "error");
    return;
  }

  const form = new FormData();
  form.append("ssn", ssn);
  form.append("licenseNumber", licenseNumber);
  form.append("frontImage", frontFile);
  form.append("backImage", backFile);

  try {
    const res = await fetch(`${API_BASE}/api/kyc/submit`, {
      method: "POST",
      credentials: "include",
      body: form
    });

    const data = await res.json();

    if (!res.ok) {
      showPopup(data.message || "Verification failed.", "error");
      return;
    }

    showPopup("Verification submitted successfully. Awaiting admin approval.", "success");

    setTimeout(() => {
      window.location.href = "/user/dashboard.html";
    }, 1500);

  } catch (err) {
    console.error("KYC submit error:", err);
    showPopup("Something went wrong. Try again.", "error");
  }
});