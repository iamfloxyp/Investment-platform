document.addEventListener("DOMContentLoaded", () => {
  const usersTable = document.getElementById("usersTable");
  const addUserBtn = document.getElementById("addUserBtn");
  const addUserModal = document.getElementById("addUserModal");
  const closeAddUser = document.getElementById("closeAddUser");
  const addUserForm = document.getElementById("addUserForm");
  const sidebar = document.getElementById("sidebar");
  const hamburgerBtn = document.getElementById("hamburgerBtn");
  const searchInput = document.getElementById("userSearch");
  const userFilter = document.getElementById("userFilter"); // ✅ added filter dropdown

  const prevBtn = document.getElementById("prevPage");
  const nextBtn = document.getElementById("nextPage");
  const pageNumbers = document.getElementById("pageNumbers");

  const perPage = 10;
  let currentPage = 1;

  // ✅ Load users from localStorage or default
  let users = JSON.parse(localStorage.getItem("users")) || [
    { id: 1, name: "John Doe", email: "john@example.com", balance: 500, status: "active" },
    { id: 2, name: "Jane Smith", email: "jane@example.com", balance: 300, status: "inactive" },
    { id: 3, name: "Mike Lee", email: "mike@example.com", balance: 200, status: "active" }
  ];
  saveUsers();

  // Save users to localStorage
  function saveUsers() {
    localStorage.setItem("users", JSON.stringify(users));
  }

  // Generate next ID properly
  function getNextId() {
    if (users.length === 0) return 1;
    return Math.max(...users.map(u => u.id)) + 1;
  }

  // -------- Render Users --------
  function renderUsers(list = users) {
    usersTable.innerHTML = "";

    if (list.length === 0) {
      let row = document.createElement("tr");
      row.innerHTML = `<td colspan="6" style="text-align:center; color:#888;">No users found</td>`;
      usersTable.appendChild(row);
      prevBtn.style.display = "none";
      nextBtn.style.display = "none";
      pageNumbers.innerHTML = "";
      return;
    }

    // Pagination logic
    const totalPages = Math.ceil(list.length / perPage);
    if (currentPage > totalPages) currentPage = 1;

    const start = (currentPage - 1) * perPage;
    const end = start + perPage;
    const pageUsers = list.slice(start, end);

    pageUsers.forEach(u => {
      let row = document.createElement("tr");
      row.innerHTML = `
        <td>${u.id}</td>
        <td>${u.name}</td>
        <td>${u.email}</td>
        <td>$${u.balance}</td>
        <td class="status ${u.status}">${u.status}</td>
        <td>
          <div class="action-dropdown">
            <select data-id="${u.id}">
              <option value="">Actions</option>
              <option value="view">View</option>
              <option value="toggle">${u.status === "active" ? "Deactivate" : "Activate"}</option>
              <option value="delete">Delete</option>
            </select>
          </div>
        </td>
      `;
      usersTable.appendChild(row);
    });

    // Show/hide pagination buttons
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
        applyFilters();
      });
      pageNumbers.appendChild(btn);
    }
  }

  // ✅ Apply filter + search combined
  function applyFilters() {
    let filtered = [...users];

    // Filter dropdown
    const filterVal = userFilter.value;
    if (filterVal !== "all") {
      filtered = filtered.filter(u => u.status === filterVal);
    }

    // Search input
    const searchVal = searchInput.value.toLowerCase();
    if (searchVal) {
      filtered = filtered.filter(u =>
        u.name.toLowerCase().includes(searchVal) ||
        u.email.toLowerCase().includes(searchVal) ||
        u.status.toLowerCase().includes(searchVal)
      );
    }

    renderUsers(filtered);
  }

  // -------- Events --------
  prevBtn.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      applyFilters();
    }
  });

  nextBtn.addEventListener("click", () => {
    const totalPages = Math.ceil(users.length / perPage);
    if (currentPage < totalPages) {
      currentPage++;
      applyFilters();
    }
  });

  // Add User modal
  addUserBtn.addEventListener("click", () => addUserModal.style.display = "flex");
  closeAddUser.addEventListener("click", () => addUserModal.style.display = "none");

  addUserForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const newUser = {
      id: getNextId(),
      name: document.getElementById("newName").value,
      email: document.getElementById("newEmail").value,
      balance: document.getElementById("newBalance").value,
      status: document.getElementById("newStatus").value
    };
    users.push(newUser);
    saveUsers();
    addUserModal.style.display = "none";
    addUserForm.reset();
    applyFilters(); // ✅ refresh with filters applied
  });

  // Handle Actions
  usersTable.addEventListener("change", (e) => {
    if (e.target.tagName === "SELECT") {
      const action = e.target.value;
      const userId = parseInt(e.target.getAttribute("data-id"));
      if (!action || !userId) return;

      if (action === "delete") {
        users = users.filter(u => u.id !== userId);
      } else if (action === "toggle") {
        users = users.map(u =>
          u.id === userId ? { ...u, status: u.status === "active" ? "inactive" : "active" } : u
        );
      } else if (action === "view") {
        const user = users.find(u => u.id === userId);
        alert(`User Details:\n\nName: ${user.name}\nEmail: ${user.email}\nBalance: $${user.balance}\nStatus: ${user.status}`);
      }

      saveUsers();
      applyFilters();
    }
  });

  // 🔍 Search functionality
  searchInput.addEventListener("keyup", () => {
    currentPage = 1;
    applyFilters();
  });

  // 🔽 Filter dropdown functionality
  userFilter.addEventListener("change", () => {
    currentPage = 1;
    applyFilters();
  });

  // Hamburger toggle
  hamburgerBtn.addEventListener("click", () => {
    sidebar.classList.toggle("active");
    const icon = hamburgerBtn.querySelector("i");
    if (sidebar.classList.contains("active")) {
      icon.classList.remove("fa-bars");
      icon.classList.add("fa-xmark");
    } else {
      icon.classList.remove("fa-xmark");
      icon.classList.add("fa-bars");
    }
  });

  // ✅ Initial render with all users
  applyFilters();
});