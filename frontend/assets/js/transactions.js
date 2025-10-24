const API_BASE = "http://127.0.0.1:4000"; // Change for production

// ✅ Popup utility
function showPopup(message, type = "success") {
  const popup = document.createElement("div");
  popup.textContent = message;
  popup.style.position = "fixed";
  popup.style.bottom = "25px";
  popup.style.right = "25px";
  popup.style.padding = "10px 15px";
  popup.style.background = type === "error" ? "#c0392b" : "#102630";
  popup.style.color = "#fff";
  popup.style.borderRadius = "5px";
  popup.style.zIndex = "9999";
  document.body.appendChild(popup);
  setTimeout(() => popup.remove(), 2500);
}

let transactions = [];
let users = [];
let filteredTransactions = [];
let currentPage = 1;
const perPage = 10;

/* =======================================================
   ✅ LOAD ALL TRANSACTIONS (Deposit + Withdraw)
======================================================= */
async function loadDeposits() {
  try {
    const res = await fetch(`${API_BASE}/api/deposits/admin/all`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to load transactions");

    transactions = await res.json();
    filteredTransactions = transactions;
    renderTransactions();
    // ✅ ADD THIS BELOW loadDeposits()
    // Fetch withdrawals and merge with deposits
    const withdrawRes = await fetch(`${API_BASE}/api/admin/withdrawals`, {
      credentials: "include",
    });

    if (withdrawRes.ok) {
      const withdrawals = await withdrawRes.json();

      // ✅ Tag them with type = 'withdraw' for clarity
      const formattedWithdrawals = withdrawals.map((w) => ({
        ...w,
        type: "withdraw",
      }));

      // ✅ Merge both deposits + withdrawals
      transactions = [...transactions, ...formattedWithdrawals];

      // ✅ Optional: sort newest first
      transactions.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      filteredTransactions = transactions;
      renderTransactions();

      console.log("✅ Combined Deposits + Withdrawals:", transactions);
    } else {
      console.warn("⚠️ Could not load withdrawals");
    }
  } catch (err) {
    console.error(err);
    showPopup("Error loading transactions", "error");
  }
}

/* =======================================================
   ✅ SEARCH TRANSACTIONS
======================================================= */
document.getElementById("transactionSearch").addEventListener("input", (e) => {
  const q = (e.target.value || "").toLowerCase().trim();

  if (!q) {
    filteredTransactions = transactions.slice(); // reset
  } else {
    filteredTransactions = transactions.filter((t) => {
      const name = t.user
        ? `${(t.user.firstName || "").toLowerCase()} ${(t.user.lastName || "").toLowerCase()}`
        : "";
      const email = (t.user?.email || "").toLowerCase();
      const status = (t.status || "").toLowerCase();
      const type = (t.type || "").toLowerCase();
      const method = (t.method || "").toLowerCase();
      const amount = String(t.amount || "");

      return (
        name.includes(q) ||
        email.includes(q) ||
        status.includes(q) ||
        type.includes(q) ||
        method.includes(q) ||
        amount.includes(q)
      );
    });
  }

  currentPage = 1;
  renderTransactions();
});

/* =======================================================
   ✅ FETCH USERS FOR DROPDOWN
======================================================= */
async function fetchUsersForDropdown() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/users`, {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to load users");
    users = await res.json();
  } catch (err) {
    console.error("Error loading users:", err);
    showPopup("Could not load user list", "error");
  }
}

/* =======================================================
   ✅ POPULATE USER DROPDOWN
======================================================= */
function populateUserDropdown() {
  const userSelect = document.getElementById("transactionUser");
  userSelect.innerHTML = "";

  if (!users.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "No users found";
    userSelect.appendChild(option);
    return;
  }

  users.forEach((u) => {
    const option = document.createElement("option");
    option.value = u._id;
    option.textContent = `${u.firstName} ${u.lastName} (${u.email})`;
    userSelect.appendChild(option);
  });
}

/* =======================================================
   ✅ RENDER TRANSACTION TABLE
======================================================= */
function renderTransactions() {
  const table = document.getElementById("transactionsTable");
  table.innerHTML = "";

  if (!filteredTransactions.length) {
    table.innerHTML = `<tr><td colspan="7" style="text-align:center;color:#888;">No transactions found</td></tr>`;
    document.getElementById("pageNumbers").innerHTML = "";
    return;
  }

  const totalPages = Math.ceil(filteredTransactions.length / perPage);
  const start = (currentPage - 1) * perPage;
  const end = start + perPage;
  const pageItems = filteredTransactions.slice(start, end);

  pageItems.forEach((tx, index) => {
    const row = document.createElement("tr");

    const userName = tx.user
      ? `${tx.user.firstName || ""} ${tx.user.lastName || ""}`.trim() || tx.user.email
      : "Unknown User";

    const displayId = tx._id ? tx._id.slice(-6).toUpperCase() : index + 1;

    row.innerHTML = `
      <td>${displayId}</td>
      <td>${userName}</td>
      <td>${tx.type === "withdraw" ? "Withdraw" : "Deposit"}</td>
      <td>$${tx.amount.toFixed(2)}</td>
      <td>
        <span class="status ${tx.status}">
          ${tx.status.charAt(0).toUpperCase() + tx.status.slice(1)}
        </span>
      </td>
      <td>${new Date(tx.createdAt).toLocaleDateString()}</td>
      <td>
        ${
          tx.status === "pending"
            ? `
              <button class="approve-btn" data-id="${tx._id}">Approve</button>
              <button class="reject-btn" data-id="${tx._id}">Reject</button>
            `
            : ""
        }
        <button class="delete-btn" data-id="${tx._id}">Delete</button>
      </td>
    `;

    table.appendChild(row);
  });

  renderPagination(totalPages);
}

/* =======================================================
   ✅ PAGINATION
======================================================= */
function renderPagination(totalPages) {
  const pageNumbers = document.getElementById("pageNumbers");
  pageNumbers.innerHTML = "";

  for (let i = 1; i <= totalPages; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    if (i === currentPage) btn.classList.add("active");
    btn.addEventListener("click", () => {
      currentPage = i;
      renderTransactions();
    });
    pageNumbers.appendChild(btn);
  }
}

/* =======================================================
   ✅ APPROVE / REJECT TRANSACTION
======================================================= */
document.addEventListener("click", async (e) => {
  if (
    e.target.classList.contains("approve-btn") ||
    e.target.classList.contains("reject-btn")
  ) {
    const id = e.target.dataset.id;
    const status = e.target.classList.contains("approve-btn")
      ? "approved"
      : "rejected";

    try {
      // ✅ Determine whether this is a deposit or a withdrawal
      const txRow = e.target.closest("tr");
      const typeCell = txRow?.querySelector("td:nth-child(3)")?.textContent?.toLowerCase();

      // ✅ Choose correct endpoint based on transaction type
      const endpoint =
        typeCell === "withdraw"
          ? `${API_BASE}/api/admin/withdrawals/${id}`
          : `${API_BASE}/api/deposits/admin/update/${id}`;

      // ✅ Send PATCH request to the correct route
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status }),
      });

      if (!res.ok) throw new Error("Failed to update transaction");

      showPopup(`Transaction ${status} successfully!`);
      await loadDeposits();
    } catch (err) {
      console.error(err);
      showPopup("Error updating transaction", "error");
    }
  }
});

/* =======================================================
   ✅ DELETE TRANSACTION
======================================================= */
document.addEventListener("click", async (e) => {
  if (e.target.classList.contains("delete-btn")) {
    const id = e.target.dataset.id;
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
      const res = await fetch(`${API_BASE}/api/deposits/admin/delete/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete transaction");

      showPopup("Transaction deleted successfully!");
      await loadDeposits();
    } catch (err) {
      console.error(err);
      showPopup("Error deleting transaction", "error");
    }
  }
});

/* =======================================================
   ✅ ADD NEW TRANSACTION
======================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  const addTransactionBtn = document.getElementById("addTransactionBtn");
  const addTransactionModal = document.getElementById("addTransactionModal");
  const closeTransactionModal = document.getElementById("closeTransactionModal");
  const addTransactionForm = document.getElementById("addTransactionForm");
  const filterForm = document.getElementById("filterForm");
  const filterModal = document.getElementById("filterModal");
  const filterBtn = document.getElementById("filterBtn");
  const closeFilterModal = document.getElementById("closeFilterModal");

  await fetchUsersForDropdown();

  // ✅ Open filter modal
  filterBtn?.addEventListener("click", () => (filterModal.style.display = "flex"));
  closeFilterModal?.addEventListener("click", () => (filterModal.style.display = "none"));

  // ✅ FILTER TRANSACTIONS (Fixed)
  filterForm?.addEventListener("submit", (e) => {
    e.preventDefault();

    const status = document.getElementById("filterStatus").value;
    const type = document.getElementById("filterType").value;
    const user = (document.getElementById("filterUser").value || "").toLowerCase();
    const minAmount = parseFloat(document.getElementById("filterMinAmount").value);
    const maxAmount = parseFloat(document.getElementById("filterMaxAmount").value);
    const date = document.getElementById("filterDate").value;

    filteredTransactions = transactions.filter((t) => {
      const userName = t.user
        ? `${(t.user.firstName || "").toLowerCase()} ${(t.user.lastName || "").toLowerCase()}`
        : "";
      const email = (t.user?.email || "").toLowerCase();
      const amount = Number(t.amount);

      const matchesStatus = !status || t.status === status;
      const matchesType = !type || t.type === type;
      const matchesUser = !user || userName.includes(user) || email.includes(user);
      const matchesMin = isNaN(minAmount) || amount >= minAmount;
      const matchesMax = isNaN(maxAmount) || amount <= maxAmount;
      const matchesDate =
        !date ||
        (t.createdAt && new Date(t.createdAt).toISOString().slice(0, 10) === date);

      return (
        matchesStatus &&
        matchesType &&
        matchesUser &&
        matchesMin &&
        matchesMax &&
        matchesDate
      );
    });

    currentPage = 1;
    renderTransactions();
    filterModal.style.display = "none";
  });

  // ✅ Add new transaction modal logic
  addTransactionBtn.addEventListener("click", () => {
    populateUserDropdown();
    addTransactionModal.style.display = "flex";
  });

  closeTransactionModal.addEventListener("click", () => {
    addTransactionModal.style.display = "none";
    addTransactionForm.reset();
  });

  addTransactionForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const userId = document.getElementById("transactionUser").value;
  const selectedUser = users.find((u) => u._id === userId);
  const email = selectedUser ? selectedUser.email : null;
  const type = document.getElementById("transactionType").value;
  const amount = parseFloat(document.getElementById("transactionAmount").value);
  const method = document.getElementById("transactionMethod").value;
  const status = document.getElementById("transactionStatus").value;
  const note = "Admin initiated transaction";

  try {
    if (type === "deposit") {
      const res = await fetch(`${API_BASE}/api/deposits/admin/add`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, amount, method, note, status }),
      });
      if (!res.ok) throw new Error("Deposit failed");
      showPopup("Deposit added successfully!");
    } else if (type === "withdraw") {
      console.log("🧾 Withdrawal payload being sent:", {
  userId,
  amount,
  method,
  note,
  status
});
      const res = await fetch(`${API_BASE}/api/deposits/admin/withdraw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ userId, email, amount, method, note, status }),
      });
      if (!res.ok) throw new Error("Withdraw failed");
      showPopup("Withdrawal added successfully!");
    }

    addTransactionModal.style.display = "none";
    addTransactionForm.reset();
    await loadDeposits();
  } catch (err) {
    console.error("❌ Transaction Error:", err);
    showPopup("Error adding transaction", "error");
  }
});
});

/* =======================================================
   ✅ INITIALIZATION
======================================================= */
document.addEventListener("DOMContentLoaded", async () => {
  await fetchUsersForDropdown();
  await loadDeposits();
});