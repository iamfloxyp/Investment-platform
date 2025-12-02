async function loadKYCList() {
  try {
    const res = await fetch(`${window.API_BASE}/api/admin/kyc`, {
      credentials: "include",
    });

    const data = await res.json();
    const tableBody = document.getElementById("kycTableBody");
    tableBody.innerHTML = "";

    if (!data.success) {
      showPopup("Failed to load KYC data.", "error");
      return;
    }

    data.users.forEach((user, index) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${user.firstName} ${user.lastName}</td>
        <td>${user.email}</td>
        <td>${user.kyc?.ssnText || "N/A"}</td>
        <td>${user.kyc?.driverLicenseNumber || "N/A"}</td>
        <td><span class="status-${user.kycStatus}">${user.kycStatus}</span></td>
        <td>${new Date(user.createdAt).toLocaleDateString()}</td>
        <td>
          <button class="view-btn" onclick="viewKYC('${user._id}')">View</button>
        </td>
      `;

      tableBody.appendChild(tr);
    });

  } catch (err) {
    console.error("KYC Load Error:", err);
    showPopup("Failed to load KYC data.", "error");
  }

  if (u.kycStatus === "verified") {
  document.querySelector(".btn-approve").disabled = true;
  document.querySelector(".btn-approve").style.opacity = "0.5";
}
}

function viewKYC(id) {
  window.location.href = `/admin/admin-kyc-view.html?id=${id}`;
}

loadKYCList();