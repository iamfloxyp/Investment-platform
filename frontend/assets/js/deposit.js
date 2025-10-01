document.addEventListener("DOMContentLoaded", () => {
  const plans = [
    { name: "Bronze", min: 50, max: 599, rate: 4 },
    { name: "Silver", min: 600, max: 1899, rate: 8 },
    { name: "Gold", min: 1900, max: 5000, rate: 18 },
    { name: "Diamond", min: 5001, max: 6999, rate: 24 },
    { name: "Platinum", min: 7000, max: 100000, rate: 40 },
  ];

  let deposits = JSON.parse(localStorage.getItem("userDeposits")) || [];

  plans.forEach(plan => {
    const planBox = document.querySelector(`.plan-box[data-plan="${plan.name}"] .plan-deposits`);
    const userDeposits = deposits.filter(d => d.plan === plan.name);

    if (userDeposits.length > 0) {
      planBox.innerHTML = "";
      userDeposits.forEach(dep => {
        const profit = (dep.amount * plan.rate / 100).toFixed(2);
        planBox.innerHTML += `
          <p>💰 Amount: $${dep.amount}</p>
          <p>📈 Daily Profit: $${profit}</p>
        `;
      });
    } else {
      planBox.innerHTML = `<p>No deposits for this plan</p>`;
    }
  });
});