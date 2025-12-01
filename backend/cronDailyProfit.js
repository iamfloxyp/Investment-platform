import cron from "node-cron";
import { runDailyProfit } from "./dailyProfitJob.js";

// Run every day at 21:00 California time (5 am Nigeria)
cron.schedule("0 21 * * *", () => {
  console.log("⏳ Running scheduled daily profit...");
  runDailyProfit();
});

console.log("⚙️ Daily Profit Scheduler Loaded");