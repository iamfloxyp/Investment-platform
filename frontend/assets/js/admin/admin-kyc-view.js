const API_BASE = window.API_BASE || "https://api.emuntra.com";

// Get URL param
const params = new URLSearchParams(window.location.search);
const kycId = params.get("id");

async function loadKYCDetails() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/kyc/${kycId}`, {
      credentials: "include"
    });

    const data = await res.json();
    const box = document.getElementById("kycContainer");

    if (!res.ok) {
      box.innerHTML = `<p style="color:red;">${data.message || "Failed to load KYC"}</p>`;
      return;
    }

    box.innerHTML = `
      <div class="kyc-field">
        <label>Full Name:</label>
        <div class="kyc-value">${data.fullName}</div>
      </div>

      <div class="kyc-field">
        <label>Email:</label>
        <div class="kyc-value">${data.email}</div>
      </div>

      <div class="kyc-field">
        <label>SSN:</label>
        <div class="kyc-value">${data.ssn}</div>
      </div>

      <div class="kyc-field">
        <label>License Number:</label>
        <div class="kyc-value">${data.licenseNumber}</div>
      </div>

      <div class="kyc-docs">
        <div class="doc-preview">
          <label>ID Front:</label>
          <img src="${data.frontImage}" alt="Front ID">
        </div>

        <div class="doc-preview">
          <label>ID Back:</label>
          <img src="${data.backImage}" alt="Back ID">
        </div>
      </div>

      <div class="kyc-actions">
        <button class="btn-approve" onclick="approveKYC()">Approve</button>
        <button class="btn-reject" onclick="rejectKYC()">Reject</button>
      </div>
    `;
  } catch (err) {
    console.error(err);
    showPopup("Could not load KYC details.", "error");
  }
}

async function approveKYC() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/kyc/${kycId}/approve`, {
      method: "PATCH",
      credentials: "include"
    });
    if (!res.ok) throw new Error();

    showPopup("KYC approved successfully", "success");
    setTimeout(() => window.location.href = "/admin/admin-kyc.html", 1200);
  } catch (err) {
    showPopup("Failed to approve KYC.", "error");
  }
}

async function rejectKYC() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/kyc/${kycId}/reject`, {
      method: "PATCH",
      credentials: "include"
    });
    if (!res.ok) throw new Error();

    showPopup("KYC rejected", "success");
    setTimeout(() => window.location.href = "/admin/admin-kyc.html", 1200);
  } catch (err) {
    showPopup("Failed to reject KYC.", "error");
  }
}

// load on start
loadKYCDetails();