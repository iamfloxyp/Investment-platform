// const API_BASE = "http://127.0.0.1:4000";
 // or your Render URL later

let loadedUsers = []; // store users fetched from MongoDB

// ✅ Popup message utility
function showPopup(message, type = "success") {
  const popup = document.getElementById("popupMessage");
  if (!popup) {
    const newPopup = document.createElement("div");
    newPopup.id = "popupMessage";
    newPopup.style.position = "fixed";
    newPopup.style.top = "20px";
    newPopup.style.right = "20px";
    newPopup.style.padding = "10px 15px";
    newPopup.style.borderRadius = "6px";
    newPopup.style.color = "#fff";
    newPopup.style.zIndex = "1000";
    document.body.appendChild(newPopup);
  }
  const pop = document.getElementById("popupMessage");
  pop.textContent = message;
  pop.style.background = type === "error" ? "#c0392b" : "#102630";
  pop.classList.add("show");
  setTimeout(() => pop.classList.remove("show"), 2500);
}

// ✅ Load all users
async function loadUsers() {
  try {
    const res = await fetch(`${API_BASE}/api/admin/users`, {
      credentials: "include",
    });

    if (!res.ok) throw new Error("Failed to load users");

    const users = await res.json();
    loadedUsers = users;
    renderFilteredUsers();
  } catch (err) {
    console.error("Error loading users:", err);
    showPopup("Failed to load users.", "error");
  }
}

// ✅ Render users based on filters/search
function renderFilteredUsers() {
  const filterVal = document.getElementById("userFilter").value;
  const searchVal = document.getElementById("userSearch").value.toLowerCase();
  const tableBody = document.getElementById("usersTable");
  tableBody.innerHTML = "";

  let filtered = loadedUsers;

  // Filter dropdown
  if (filterVal !== "all") {
    const isActive = filterVal === "active";
    filtered = filtered.filter(u => u.isVerified === isActive);
  }

  // Search input
  if (searchVal) {
    filtered = filtered.filter(u =>
      (u.firstName + " " + u.lastName).toLowerCase().includes(searchVal) ||
      u.email.toLowerCase().includes(searchVal)
    );
  }

  // Render rows
  if (filtered.length === 0) {
    tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:#888;">No users found</td></tr>`;
    return;
  }

  filtered.forEach(user => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${user._id}</td>
      <td>${user.firstName} ${user.lastName}</td>
      <td>${user.email}</td>
      <td>$${user.balance ? user.balance : "0.00"}</td>
      <td>${user.isVerified ? "Active" : "Inactive"}</td>
      <td>
        <select class="user-action" data-id="${user._id}">
          <option value="">Actions</option>
          <option value="view">View</option>
          <option value="toggle">${user.isVerified ? "Deactivate" : "Activate"}</option>
          <option value="delete">Delete</option>
        </select>
      </td>
    `;
    tableBody.appendChild(row);
  });
}

// ✅ Filter, search, and reset
document.getElementById("userFilter").addEventListener("change", renderFilteredUsers);
document.getElementById("userSearch").addEventListener("input", renderFilteredUsers);

// ✅ Reset Filters Button (beside filter)
const resetBtn = document.createElement("button");
resetBtn.id = "resetFiltersBtn";
resetBtn.textContent = "Reset Filters";
resetBtn.style.marginLeft = "10px";
resetBtn.style.padding = "6px 12px";
resetBtn.style.background = "#102630";
resetBtn.style.color = "#fff";
resetBtn.style.border = "none";
resetBtn.style.borderRadius = "5px";
resetBtn.style.cursor = "pointer";
resetBtn.style.transition = "0.3s";
resetBtn.style.fontSize = "0.9rem";

// Hover effects
resetBtn.addEventListener("mouseenter", () => {
  resetBtn.style.background = "#8dbbf0";
  resetBtn.style.color = "#102630";
});
resetBtn.addEventListener("mouseleave", () => {
  resetBtn.style.background = "#102630";
  resetBtn.style.color = "#fff";
});

// Add beside filter
const userFilter = document.getElementById("userFilter");
userFilter.insertAdjacentElement("afterend", resetBtn);

// ✅ Reset functionality
resetBtn.addEventListener("click", () => {
  document.getElementById("userFilter").value = "all";
  document.getElementById("userSearch").value = "";
  renderFilteredUsers();
  showPopup("Filters reset.");
});

// ✅ Responsive button sizing & positioning
function adjustResetButtonSize() {
  const resetBtn = document.getElementById("resetFiltersBtn");
  if (!resetBtn) return;

  if (window.innerWidth <= 700) {
    // Keep your preferred mobile design
    resetBtn.style.width = "100px";
    resetBtn.style.fontSize = "0.75rem";
    resetBtn.style.padding = "5px 10px";
    resetBtn.style.height = "38px";
    resetBtn.style.position = "relative";
    resetBtn.style.bottom = "1.9rem";
    resetBtn.style.left = "7rem";
  } else {
    // ✅ Restore proper desktop alignment
    resetBtn.style.width = "auto";
    resetBtn.style.fontSize = "0.9rem";
    resetBtn.style.padding = "6px 12px";
    resetBtn.style.height = "auto";
    resetBtn.style.position = "static"; // resets any offset
    resetBtn.style.left = "unset";      // clears mobile left shift
    resetBtn.style.bottom = "unset";    // clears mobile bottom offset
    resetBtn.style.marginLeft = "10px";
  }
}

// Run on load + resize
window.addEventListener("load", adjustResetButtonSize);
window.addEventListener("resize", adjustResetButtonSize);
// Apply on load + resize
window.addEventListener("load", adjustResetButtonSize);
window.addEventListener("resize", adjustResetButtonSize);

// ✅ Handle Actions
document.addEventListener("change", async (e) => {
  if (!e.target.classList.contains("user-action")) return;

  const userId = e.target.dataset.id;
  const action = e.target.value;

  try {
    // VIEW
    if (action === "view") {
      const user = loadedUsers.find(u => u._id === userId);
      if (user) {
        document.getElementById("viewName").textContent = `${user.firstName} ${user.lastName}`;
        document.getElementById("viewEmail").textContent = user.email;
        document.getElementById("viewStatus").textContent = user.isVerified ? "Active" : "Inactive";
        document.getElementById("viewRole").textContent = user.role;
        document.getElementById("viewUserModal").style.display = "flex";
      }
    }

    // TOGGLE
    else if (action === "toggle") {
      await fetch(`${API_BASE}/api/admin/users/${userId}/status`, {
        method: "PATCH",
        credentials: "include",
      });
      showPopup("User status updated successfully.");
      await loadUsers();
    }

    // DELETE
    else if (action === "delete") {
      const confirmDelete = confirm("Are you sure you want to delete this user?");
      if (confirmDelete) {
        await fetch(`${API_BASE}/api/admin/users/${userId}`, {
          method: "DELETE",
          credentials: "include",
        });
        showPopup("User deleted successfully.");
        await loadUsers();
      }
    }
  } catch (err) {
    console.error(err);
    showPopup("Action failed. Try again.", "error");
  } finally {
    e.target.value = "";
  }
});

// ✅ Add User Modal & Logic
document.addEventListener("DOMContentLoaded", () => {
  loadUsers();

  const addUserBtn = document.getElementById("addUserBtn");
  const addUserModal = document.getElementById("addUserModal");
  const closeAddUser = document.getElementById("closeAddUser");
  const addUserForm = document.getElementById("addUserForm");

  // open modal
  if (addUserBtn && addUserModal) {
    addUserBtn.addEventListener("click", () => {
      addUserModal.style.display = "flex";
    });
  }

  // close modal
  if (closeAddUser) {
    closeAddUser.addEventListener("click", () => {
      addUserModal.style.display = "none";
    });
  }

  // ✅ Submit Add User form
  if (addUserForm) {
    addUserForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const firstName = document.getElementById("newFirstName");
      const lastName = document.getElementById("newLastName");
      const email = document.getElementById("newEmail");
      const password = document.getElementById("newPassword");
      const role = document.getElementById("newRole");

      if (!firstName || !lastName || !email || !password || !role) {
        showPopup("Add User form input IDs are missing in HTML.", "error");
        return;
      }

      const newUser = {
        firstName: firstName.value.trim(),
        lastName: lastName.value.trim(),
        email: email.value.trim(),
        password: password.value.trim(),
        role: role.value,
      };

      if (!newUser.firstName || !newUser.lastName || !newUser.email || !newUser.password) {
        showPopup("Please fill all fields.", "error");
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/api/admin/users`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(newUser),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.message || "Failed to create user");

        showPopup("User added successfully!");
        addUserModal.style.display = "none";
        addUserForm.reset();
        await loadUsers();
      } catch (err) {
        console.error(err);
        showPopup(err.message || "Error adding user", "error");
      }
    });
  }

  // close view modal
  const closeView = document.getElementById("closeViewModal");
  if (closeView) {
    closeView.addEventListener("click", () => {
      document.getElementById("viewUserModal").style.display = "none";
    });
  }
});