document.addEventListener("DOMContentLoaded", () => {
  const transactionsTable = document.getElementById("transactionsTable");
  const addTransactionBtn = document.getElementById("addTransactionBtn");
  const addTransactionModal = document.getElementById("addTransactionModal");
  const closeTransactionModal = document.getElementById("closeTransactionModal");
  const addTransactionForm = document.getElementById("addTransactionForm");

  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  const pageNumbers = document.getElementById("pageNumbers");
  const searchInput = document.getElementById("transactionSearch");

  // Filter modal elements
  const filterBtn = document.getElementById("filterBtn");
  const filterModal = document.getElementById("filterModal");
  const closeFilterModal = document.getElementById("closeFilterModal");
  const filterForm = document.getElementById("filterForm");
  const resetFilterBtn = document.createElement("button"); 
  resetFilterBtn.type = "button";
  resetFilterBtn.textContent = "Reset";
  resetFilterBtn.id = "resetFilterBtn";
  filterForm.querySelector(".modal-actions").appendChild(resetFilterBtn);

  const perPage = 10;
  let currentPage = 1;

  // ✅ Load users and transactions from localStorage
  let users = JSON.parse(localStorage.getItem("users")) || [];
  let transactions = JSON.parse(localStorage.getItem("transactions")) || [
    { id: 1, userId: 1, userName: "John Doe", type: "deposit", amount: 200, status: "completed", date: "2025-10-03" },
    { id: 2, userId: 2, userName: "Jane Smith", type: "withdraw", amount: 100, status: "pending", date: "2025-10-02" }
  ];
  saveTransactions();

  function saveTransactions() {
    localStorage.setItem("transactions", JSON.stringify(transactions));
  }

  function getNextId() {
    if (transactions.length === 0) return 1;
    return Math.max(...transactions.map(t => t.id)) + 1;
  }

  // -------- Populate User Dropdown --------
  function populateUserDropdown() {
    const userSelect = document.getElementById("transactionUser");
    userSelect.innerHTML = ""; // clear old options

    if (users.length === 0) {
      let option = document.createElement("option");
      option.value = "";
      option.textContent = "No users available";
      userSelect.appendChild(option);
      return;
    }

    users.forEach(u => {
      let option = document.createElement("option");
      option.value = u.id;   // store userId
      option.textContent = `${u.name} (${u.email})`; 
      userSelect.appendChild(option);
    });
  }

  // -------- Render Transactions --------
  function renderTransactions(list = transactions) {
    transactionsTable.innerHTML = "";

    if (list.length === 0) {
      let row = document.createElement("tr");
      row.innerHTML = `<td colspan="6" style="text-align:center; color:#888;">No transactions found</td>`;
      transactionsTable.appendChild(row);
      prevBtn.style.display = "none";
      nextBtn.style.display = "none";
      pageNumbers.innerHTML = "";
      return;
    }

    const totalPages = Math.ceil(list.length / perPage);
    if (currentPage > totalPages) currentPage = 1;

    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    const pageTransactions = list.slice(start, end);

    pageTransactions.forEach(t => {
      let row = document.createElement("tr");
      row.innerHTML = `
        <td>${t.id}</td>
        <td>${t.userName || "Unknown User"}</td>
        <td>${t.type}</td>
        <td>$${t.amount}</td>
        <td class="status ${t.status}">${t.status}</td>
        <td>${t.date}</td>
      `;
      transactionsTable.appendChild(row);
    });

    if (list.length < perPage) {
      prevBtn.style.display = "none";
      nextBtn.style.display = "none";
      pageNumbers.innerHTML = "";
    } else {
      prevBtn.style.display = "inline-block";
      nextBtn.style.display = "inline-block";
      renderPagination(totalPages);
    }
  }

  // -------- Render Pagination --------
  function renderPagination(totalPages) {
    pageNumbers.innerHTML = "";

    for (let i = 1; i <= totalPages; i++) {
      let btn = document.createElement("button");
      btn.textContent = i;
      if (i === currentPage) btn.classList.add("active");
      btn.addEventListener("click", () => {
        currentPage = i;
        renderTransactions();
      });
      pageNumbers.appendChild(btn);
    }
  }

  // -------- Events --------
  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTransactions();
    }
  });

  nextBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(transactions.length / perPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderTransactions();
    }
  });

  // Add Transaction modal
  addTransactionBtn.addEventListener("click", () => {
    populateUserDropdown(); // refresh list before showing
    addTransactionModal.style.display = "flex";
  });

  closeTransactionModal.addEventListener("click", () => addTransactionModal.style.display = "none");

  addTransactionForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const selectedUserId = parseInt(document.getElementById("transactionUser").value);
    const user = users.find(u => u.id === selectedUserId);

    const newTransaction = {
      id: getNextId(),
      userId: selectedUserId,
      userName: user ? user.name : "Unknown User",
      type: document.getElementById("transactionType").value,
      amount: parseFloat(document.getElementById("transactionAmount").value),
      status: document.getElementById("transactionStatus").value,
      // ✅ Save in uniform YYYY-MM-DD format
      date: new Date().toISOString().split("T")[0]
    };
    transactions.push(newTransaction);
    saveTransactions();
    addTransactionModal.style.display = "none";
    addTransactionForm.reset();
    renderTransactions();
  });

  // 🔍 Search functionality
  searchInput.addEventListener("keyup", () => {
    const searchValue = searchInput.value.toLowerCase();
    const filtered = transactions.filter(t =>
      (t.userName || "").toLowerCase().includes(searchValue) ||
      t.type.toLowerCase().includes(searchValue) ||
      t.status.toLowerCase().includes(searchValue) ||
      String(t.amount).includes(searchValue)
    );
    renderTransactions(filtered);
  });

  // ------- Filter Modal -------
  filterBtn.addEventListener("click", () => filterModal.style.display = "flex");
  closeFilterModal.addEventListener("click", () => filterModal.style.display = "none");

  filterForm.addEventListener("submit", (e) => {
    e.preventDefault();
    let filtered = [...transactions];

    const status = document.getElementById("filterStatus").value;
    const type = document.getElementById("filterType").value;
    const user = document.getElementById("filterUser").value.toLowerCase();
    const minAmount = parseFloat(document.getElementById("filterMinAmount").value);
    const maxAmount = parseFloat(document.getElementById("filterMaxAmount").value);
    const date = document.getElementById("filterDate").value;

    if (status) filtered = filtered.filter(t => t.status === status);
    if (type) filtered = filtered.filter(t => t.type === type);
    if (user) filtered = filtered.filter(t => (t.userName || "").toLowerCase().includes(user));
    if (!isNaN(minAmount)) filtered = filtered.filter(t => t.amount >= minAmount);
    if (!isNaN(maxAmount)) filtered = filtered.filter(t => t.amount <= maxAmount);
    if (date) filtered = filtered.filter(t => t.date === date);

    renderTransactions(filtered);
    filterModal.style.display = "none";
  });

  // Reset filter
  resetFilterBtn.addEventListener("click", () => {
    filterForm.reset();
    renderTransactions();
    filterModal.style.display = "none";
  });

  // ✅ Initial render
  renderTransactions();
});