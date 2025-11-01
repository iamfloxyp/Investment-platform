
  // frontend/assets/js/user/config.js

const isLocal =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost";

window.API_BASE = isLocal
  ? "http://127.0.0.1:4000"
  : "https://api.emuntra.com"; // ✅ no slash at the end