// password-toggle.js
(function setupPasswordToggles() {
  document.querySelectorAll(".password-field").forEach((wrap) => {
    const input = wrap.querySelector('input[type="password"], input[name="password"]');
    const btn   = wrap.querySelector(".toggle-pass");
    if (!input || !btn) return;

    let shown = false;
    update(shown);

    btn.addEventListener("click", () => {
      shown = !shown;
      update(shown);
      input.focus({ preventScroll: true });
    });

    // Optional keyboard shortcut: Ctrl + .
    input.addEventListener("keydown", (e) => {
      if (e.ctrlKey && e.key === ".") {
        e.preventDefault();
        shown = !shown;
        update(shown);
      }
    });

    function update(state) {
      input.type = state ? "text" : "password";
      btn.setAttribute("aria-pressed", String(state));
      btn.setAttribute("aria-label", state ? "Hide password" : "Show password");
      btn.textContent = state ? "🙈" : "👁️";
    }
  });
})();