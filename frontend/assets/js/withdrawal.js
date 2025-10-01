document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("withdrawModal");
  const closeBtn = modal.querySelector(".close");
  const setWalletForm = document.getElementById("setWalletForm");
  const withdrawProcessor = document.getElementById("withdrawProcessor");
  const withdrawInput = document.getElementById("withdrawInput");

  // Open modal when user clicks "Set Wallet/Account"
  document.querySelectorAll(".set-wallet").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const processor = e.target.dataset.processor;
      withdrawProcessor.value = processor.toUpperCase(); // Show processor name
      modal.style.display = "block";
    });
  });

  // Close modal
  closeBtn.addEventListener("click", () => modal.style.display = "none");
  window.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  // Save wallet/account
  setWalletForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const processor = withdrawProcessor.value.toLowerCase();
    const account = withdrawInput.value;

    // Save in localStorage
    localStorage.setItem(`withdraw_${processor}`, account);

    // Mask last 4 characters
    const masked = "****" + account.slice(-4);

    // Update UI
    const link = document.querySelector(`[data-processor="${processor}"]`);
    if (link) {
      link.outerHTML = `<span>${masked}</span>`;
    }

    // Reset + close modal
    withdrawInput.value = "";
    modal.style.display = "none";
  });

  // Load saved wallets/accounts on page load
  document.querySelectorAll(".set-wallet").forEach(link => {
    const processor = link.dataset.processor;
    const saved = localStorage.getItem(`withdraw_${processor}`);
    if (saved) {
      const masked = "****" + saved.slice(-4);
      link.outerHTML = `<span>${masked}</span>`;
    }
  });
});
document.addEventListener("DOMContentLoaded", () => {
  const withdrawForm = document.getElementById("withdrawForm");
  const processorSelect = document.getElementById("processor");
  const withdrawAmount = document.getElementById("withdrawAmount");

  if (withdrawForm) {
    withdrawForm.addEventListener("submit", (e) => {
      e.preventDefault();

      const processor = processorSelect.value;
      const amount = parseFloat(withdrawAmount.value);

      if (!processor) {
        alert("Please select a payment processor.");
        return;
      }
      if (!amount || amount <= 0) {
        alert("Please enter a valid withdrawal amount.");
        return;
      }

      // Example check for minimums
      if (processor === "btc" && amount < 2) {
        alert("Minimum withdrawal for Bitcoin is $2");
        return;
      }
      if (processor === "bank" && amount < 10) {
        alert("Minimum withdrawal for Bank Transfer is $10");
        return;
      }
      if (processor === "paypal" && amount < 5) {
        alert("Minimum withdrawal for PayPal is $5");
        return;
      }

      // ✅ At this point, form is valid
      alert(`Withdrawal request submitted:\nProcessor: ${processor}\nAmount: $${amount}`);

      // Clear form
      processorSelect.value = "";
      withdrawAmount.value = "";
    });
  }
});