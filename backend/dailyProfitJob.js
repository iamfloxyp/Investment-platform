// dailyProfitJob.js
import mongoose from "mongoose";
import dotenv from "dotenv";

import User from "./models/userModel.js";
import Deposit from "./models/depositModel.js";
import Plan from "./models/planModel.js";
import Notification from "./models/notificationModel.js";
import { sendEmail } from "./utils/sendEmail.js";
import { computePercentForDay } from "./utils/planPercent.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

// How long a deposit must exist before it starts earning
const PROFIT_DELAY_HOURS = 24;

/**
 * Run daily profit for all users once per calendar day.
 * Uses user.lastProfitDate to avoid double crediting.
 */
export async function runDailyProfit() {
  const today = new Date();
  const todayKey = today.toISOString().slice(0, 10); // "2025-10-29"

  try {
    // Connect once if needed
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(MONGO_URI);
      console.log("✅ MongoDB connected for daily profit");
    }

    console.log(`🚀 Daily profit job started for ${todayKey}`);

    // Load plans once, map by slug and by name, both in lowercase
    const plans = await Plan.find({});
    const planMap = {};
    plans.forEach((p) => {
      if (p.slug) planMap[p.slug.toLowerCase()] = p;
      if (p.name) planMap[p.name.toLowerCase()] = p;
    });

    const users = await User.find({});

    const delayCutoff = new Date(
      today.getTime() - PROFIT_DELAY_HOURS * 60 * 60 * 1000
    );

    for (const user of users) {
      // Already credited today, skip
      if (user.lastProfitDate === todayKey) continue;

      // All approved or completed deposits for this user
      const deposits = await Deposit.find({
        user: user._id,
        type: "deposit",
        status: { $in: ["approved", "completed"] },
        $or: [
          // Explicit eligibility time
          { profitEligibleAt: { $lte: today } },
          // Or no field, but deposit is older than delay cutoff
          { profitEligibleAt: null, createdAt: { $lte: delayCutoff } },
        ],
      });

      if (!deposits.length) continue;

      let totalProfit = 0;

      for (const dep of deposits) {
        const key = (dep.plan || "").toLowerCase(); // "bronze", "silver", etc
        const plan = planMap[key];

        if (!plan) continue;

        const percent = computePercentForDay(plan, today);
        if (!percent || percent <= 0) continue;

        const profit = Number(dep.amount || 0) * percent;
        if (profit > 0) {
          totalProfit += profit;
        }
      }

      if (totalProfit <= 0) continue;

      // Update user financials
      user.earnedTotal = (user.earnedTotal || 0) + totalProfit;
      user.dailyProfit = totalProfit;
      user.balance = (user.balance || 0) + totalProfit;
      user.lastProfitDate = todayKey;

      await user.save();
      // Send dashboard notification
await Notification.create({
  user: user._id,
  message: "Your daily earnings for today have been added successfully.",
});

// Send email notification
await sendEmail({
  to: user.email,
  subject: "Daily Earnings Added",
  html: `
    <p>Hello ${user.firstName},</p>
    <p>Your daily earnings have been successfully added to your account.</p>
    <p>You may log in to view the updated balance.</p>
    <p>Thank you for choosing Emuntra.</p>
  `
});

      console.log(
        `💰 ${user.email}: +$${totalProfit.toFixed(2)} profit added today`
      );
    }

    console.log(`🎯 Daily profit job finished for ${todayKey}`);
  } catch (err) {
    console.error("❌ Error in daily profit job", err);
  }
}

// Allow running this file directly with "node dailyProfitJob.js"
if (process.argv[1] && process.argv[1].endsWith("dailyProfitJob.js")) {
  runDailyProfit()
    .then(async () => {
      await mongoose.connection.close();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error(err);
      await mongoose.connection.close();
      process.exit(1);
    });
}