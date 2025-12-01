const API_BASE = window.API_BASE || "https://api.emuntra.com";

async function loadKYCList() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/kyc/list`, {
      credentials: "include"
    });

    const data = await res.json();
    const tableBody = document.getElementById("kycTableBody");
    tableBody.innerHTML = "";

    data.forEach((item, index) => {
      const tr = document.createElement("tr");

      tr.innerHTML = `
        <td>${index + 1}</td>
        <td>${item.fullName}</td>
        <td>${item.email}</td>
        <td>${item.ssn}</td>
        <td>${item.licenseNumber}</td>
        <td>
          <span class="status-${item.status}">${item.status}</span>
        </td>
        <td>${new Date(item.createdAt).toLocaleDateString()}</td>
        <td>
          <button class="view-btn" onclick="viewKYC('${item._id}')">View</button>
        </td>
      `;

      tableBody.appendChild(tr);
    });

  } catch (err) {
    console.error("KYC Load Error:", err);
    showPopup("Failed to load KYC data.", "error");
  }
}

function viewKYC(id) {
  window.location.href = `/admin/admin-kyc-view.html?id=${id}`;
}

loadKYCList();