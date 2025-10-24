document.addEventListener("DOMContentLoaded", async () => {
  const API_BASE =
    window.location.hostname.includes("localhost") ||
    window.location.hostname.includes("127.0.0.1")
      ? "http://127.0.0.1:4000"
      : "https://investment-platform-1-qjx8.onrender.com";

  const welcomeName = document.getElementById("welcomeName");
  const tableBody = document.getElementById("transactionsTable");
  const totalAmount = document.getElementById("totalAmount");

  let allTransactions = [];
  let currentPage = 1;
  const itemsPerPage = 10;

  // ✅ STEP 1: Get authenticated user
  let userId = null;
  try {
    const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: "include" });
    if (!res.ok) throw new Error("User not authenticated");
    const user = await res.json();
    userId = user.id;
    welcomeName.textContent = user.firstName || "User";
  } catch (err) {
    console.error("❌ Error loading user:", err);
    window.location.href = "./login.html";
    return;
  }

  // ✅ STEP 2: Fetch deposits
  let deposits = [];
  try {
    const res = await fetch(`${API_BASE}/api/deposits/user/${userId}`, {
      credentials: "include",
    });
    if (res.ok) deposits = await res.json();
  } catch (err) {
    console.error("❌ Error fetching deposits:", err);
  }

  // ✅ STEP 3: Fetch withdrawals
  let withdrawals = [];
  try {
    const res = await fetch(`${API_BASE}/api/withdrawals/pending`, {
      credentials: "include",
    });
    if (res.ok) {
      const allWithdrawals = await res.json();
      withdrawals = allWithdrawals.filter(
        (w) => w.user === userId || w.user?._id === userId
      );
    }
  } catch (err) {
    console.error("❌ Error fetching withdrawals:", err);
  }

  // ✅ STEP 4: Combine all into one transaction list
  const planRates = {
    Bronze: 4,
    Silver: 8,
    Gold: 18,
    Diamond: 24,
    Platinum: 40,
  };

  const earnings = deposits.map((d) => {
    const rate = planRates[d.plan] || 0;
    const profit = (d.amount * rate) / 100;
    return {
      type: "earning",
      currency: d.method || "usd",
      amount: profit,
      date: new Date(d.createdAt).toISOString().split("T")[0],
    };
  });

  allTransactions = [
    ...deposits.map((d) => ({
      type: "deposit",
      currency: d.method || "usd",
      amount: d.amount || 0,
      date: new Date(d.createdAt).toISOString().split("T")[0],
    })),
    ...withdrawals.map((w) => ({
      type: "withdrawal",
      currency: w.method || "usd",
      amount: w.amount || 0,
      date: new Date(w.createdAt).toISOString().split("T")[0],
    })),
    ...earnings,
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  // ✅ STEP 5: Initial render
  renderTransactions(allTransactions, currentPage);

  // ✅ STEP 6: Filter logic
  document.getElementById("applyFilter").addEventListener("click", () => {
    const type = document.getElementById("filterType").value;
    const currency = document.getElementById("filterCurrency").value;
    const from = document.getElementById("filterFrom").value;
    const to = document.getElementById("filterTo").value;

    let filtered = [...allTransactions];
    if (type !== "all") filtered = filtered.filter((t) => t.type === type);
    if (currency !== "all")
      filtered = filtered.filter((t) => t.currency.toLowerCase() === currency);
    if (from) filtered = filtered.filter((t) => t.date >= from);
    if (to) filtered = filtered.filter((t) => t.date <= to);

    currentPage = 1; // reset to first page on new filter
    renderTransactions(filtered, currentPage);
  });

  // ✅ STEP 7: Render with pagination
  function renderTransactions(data, page) {
    tableBody.innerHTML = "";
    const totalPages = Math.ceil(data.length / itemsPerPage);

    if (!data.length) {
      tableBody.innerHTML = `<tr><td colspan="4" style="text-align:center;">No transactions found</td></tr>`;
      totalAmount.textContent = "$0.00";
      renderPagination(0, 0, data);
      return;
    }

    const start = (page - 1) * itemsPerPage;
    const paginatedData = data.slice(start, start + itemsPerPage);

    let total = 0;
    paginatedData.forEach((t) => {
      total += t.amount || 0;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${capitalize(t.type)}</td>
        <td>${t.currency.toUpperCase()}</td>
        <td>$${(t.amount || 0).toFixed(2)}</td>
        <td>${t.date}</td>
      `;
      tableBody.appendChild(row);
    });

    totalAmount.textContent = "$" + total.toFixed(2);
    renderPagination(page, totalPages, data);
  }

  // ✅ STEP 8: Pagination controls
  function renderPagination(current, totalPages, data) {
    let paginationDiv = document.getElementById("paginationControls");
    if (!paginationDiv) {
      paginationDiv = document.createElement("div");
      paginationDiv.id = "paginationControls";
      paginationDiv.style.textAlign = "center";
      paginationDiv.style.marginTop = "15px";
      document.querySelector(".history-card").appendChild(paginationDiv);
    }

    paginationDiv.innerHTML = "";

    if (totalPages <= 1) return;

    const prevBtn = document.createElement("button");
    prevBtn.textContent = "⬅️ Prev";
    prevBtn.disabled = current === 1;
    prevBtn.className = "btn-secondary";
    prevBtn.style.margin = "0 10px";

    const nextBtn = document.createElement("button");
    nextBtn.textContent = "Next ➡️";
    nextBtn.disabled = current === totalPages;
    nextBtn.className = "btn-secondary";
    nextBtn.style.margin = "0 10px";

    const pageInfo = document.createElement("span");
    pageInfo.textContent = `Page ${current} of ${totalPages}`;
    pageInfo.style.margin = "0 10px";
    pageInfo.style.fontWeight = "bold";

    prevBtn.addEventListener("click", () => {
      currentPage--;
      renderTransactions(data, currentPage);
    });

    nextBtn.addEventListener("click", () => {
      currentPage++;
      renderTransactions(data, currentPage);
    });

    paginationDiv.append(prevBtn, pageInfo, nextBtn);
  }

  function capitalize(word) {
    return word.charAt(0).toUpperCase() + word.slice(1);
  }
});