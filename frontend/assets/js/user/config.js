const isLocal =
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "localhost";

window.API_BASE = isLocal
  ? "http://127.0.0.1:4000"
  : "https://investment-platform-1-qjx8.onrender.com";