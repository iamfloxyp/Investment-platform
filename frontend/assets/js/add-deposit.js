document.addEventListener("DOMContentLoaded", () => {
  const calcModal = document.getElementById("calcModal");
  const depositModal = document.getElementById("depositModal");

  const calcPlan = document.getElementById("calcPlan");
  const calcAmount = document.getElementById("calcAmount");
  const calcResult = document.getElementById("calcResult");

  const depositPlan = document.getElementById("depositPlan");
  const depositAmount = document.getElementById("depositAmount");

  // Open calculator modal
  document.querySelectorAll(".calc-link").forEach(link => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const card = e.target.closest(".plan-card");
      calcPlan.value = card.dataset.name;
      calcAmount.value = card.dataset.min;
      calcResult.innerHTML = "";
      calcModal.style.display = "flex";
    });
  });

  // Open deposit modal
  document.querySelectorAll(".btn-plan").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const card = e.target.closest(".plan-card");
      depositPlan.value = card.dataset.name;
      depositAmount.value = card.dataset.min;
      depositModal.style.display = "flex";
    });
  });

  // Close buttons
  document.getElementById("closeCalc").onclick = () => calcModal.style.display = "none";
  document.getElementById("closeDeposit").onclick = () => depositModal.style.display = "none";
  document.getElementById("calcOkBtn").onclick = () => calcModal.style.display = "none";
  document.getElementById("depositOkBtn").onclick = () => depositModal.style.display = "none";

  // Calculator logic
  document.getElementById("calcForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const rate = parseFloat(document.querySelector(`[data-name="${calcPlan.value}"]`).dataset.rate);
    const amount = parseFloat(calcAmount.value);
    const profit = (rate / 100) * amount;
    calcResult.innerHTML = `
      <p>For <strong>${calcPlan.value}</strong>, if you invest <strong>$${amount}</strong>,</p>
      <p>You will earn <strong>$${profit.toFixed(2)}</strong> daily.</p>
    `;
  });

  // Deposit form
  document.getElementById("depositForm").addEventListener("submit", (e) => {
    e.preventDefault();
    alert(`Deposit submitted for ${depositPlan.value} with $${depositAmount.value}`);
    depositModal.style.display = "none";
  });

  // Close modal on background click
  window.onclick = (e) => {
    if (e.target === calcModal) calcModal.style.display = "none";
    if (e.target === depositModal) depositModal.style.display = "none";
  };
});