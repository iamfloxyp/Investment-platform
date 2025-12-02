
// admin-kyc-view.js
const params = new URLSearchParams(window.location.search);
const userId = params.get("id");

async function loadKYCDetails() {
  const box = document.getElementById("kycContainer");
  if (!box) return;

  // If someone opens the page from the sidebar, there is no ?id=
  if (!userId) {
    box.innerHTML = `<p style="color:red;">No KYC user selected.</p>`;
    return;
  }

  try {
    const res = await fetch(`${window.API_BASE}/api/admin/kyc/${userId}`, {
      credentials: "include",
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      box.innerHTML = `<p style="color:red;">${data.message || "Server error"}</p>`;
      return;
    }

    const u = data.user;

    box.innerHTML = `
      <div class="kyc-field"><label>Full Name:</label> <div>${u.firstName} ${u.lastName}</div></div>
      <div class="kyc-field"><label>Email:</label> <div>${u.email}</div></div>
      <div class="kyc-field"><label>SSN:</label> <div>${u.kyc?.ssnText || "N/A"}</div></div>
      <div class="kyc-field"><label>License Number:</label> <div>${u.kyc?.driverLicenseNumber || "N/A"}</div></div>

      <div class="kyc-docs">
        <div class="doc-preview">
          <label>ID Front:</label>
         <img src="${window.API_BASE}/${u.kyc?.idFrontUrl}">
        </div>

        <div class="doc-preview">
          <label>ID Back:</label>
          <img src="${window.API_BASE}/${u.kyc?.idBackUrl || ""}" />
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
  if (!userId) return;
  await fetch(`${window.API_BASE}/api/admin/kyc/${userId}/approve`, {
    method: "PATCH",
    credentials: "include",
  });

  showPopup("KYC approved.", "success");
  setTimeout(() => (window.location.href = "/admin/adminKyc.html"), 1000);
}

async function rejectKYC() {
  if (!userId) return;
  await fetch(`${window.API_BASE}/api/admin/kyc/${userId}/reject`, {
    method: "PATCH",
    credentials: "include",
  });

  showPopup("KYC rejected.", "success");
  setTimeout(() => (window.location.href = "/admin/adminKyc.html"), 1000);
}

loadKYCDetails();