// Mock admin accounts (for now in localStorage)
let admins = JSON.parse(localStorage.getItem("admins")) || [
  { name: "Admin One", email: "admin1@example.com", password: "admin123" },
  { name: "Admin Two", email: "admin2@example.com", password: "admin456" }
];

// Save Admins if not already saved
localStorage.setItem("admins", JSON.stringify(admins));

const loginForm = document.getElementById("adminLoginForm");
if (loginForm) {
  loginForm.addEventListener("submit", (e) => {
    e.preventDefault();

    let email = document.getElementById("loginEmail").value;
    let password = document.getElementById("loginPassword").value;

    // Check credentials
    let admin = admins.find(a => a.email === email && a.password === password);

    if (admin) {
      // Save current admin session
      localStorage.setItem("currentAdmin", JSON.stringify(admin));
      window.location.href = "admin.html"; // redirect to dashboard
    } else {
      document.getElementById("loginError").innerText = "Invalid email or password";
    }
  });
}