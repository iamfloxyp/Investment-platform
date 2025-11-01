import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/userModel.js";
import Deposit from "./models/depositModel.js";
import Plan from "./models/planModel.js";
import { computePercentForDay } from "./utils/planPercent.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

// ✅ Set how many hours must pass before deposit starts earning
const PROFIT_DELAY_HOURS = 24;

// ✅ Run daily profit with eligibility check
export const runDailyProfit = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected for daily profit");

    // Load all plans once and map them for quick access
    const plans = await Plan.find();
    const planMap = {};
    plans.forEach((p) => (planMap[p.slug] = p));

    // Get all active users
    const users = await User.find();
    const now = new Date();

    for (const user of users) {
      // ✅ Find only deposits that have reached profit eligibility
      const eligibleDeposits = await Deposit.find({
        user: user._id,
        type: "deposit",
        status: { $in: ["approved", "completed"] },
        // ✅ Only include deposits that have reached their profit eligibility time
        profitEligibleAt: { $lte: new Date() },
      });

      // Skip users who have no eligible deposits
      if (eligibleDeposits.length === 0) continue;

      let totalProfit = 0;

      for (const dep of eligibleDeposits) {
        const slug = (dep.plan || "bronze").toLowerCase();
        const plan = planMap[slug] || planMap["bronze"];

        // ✅ Get plan’s daily percent rate dynamically
        const percent = computePercentForDay(plan, now);

        // ✅ Calculate profit and add up
        const profit = dep.amount * percent;
        totalProfit += profit;
      }

      // ✅ Only update if there’s actual profit to apply
      if (totalProfit > 0) {
        user.earnedTotal = (user.earnedTotal || 0) + totalProfit;
        user.dailyProfit = totalProfit;
        user.lastProfitUpdate = now;
        user.balance = (user.balance || 0) + totalProfit; // add profit to available balance
        await user.save();

        console.log(
          `💰 ${user.email}: +$${totalProfit.toFixed(2)} profit added (${(
            totalProfit / (user.balance - totalProfit)
          ).toFixed(4)}%)`
        );
      }
    }

    console.log("🎯 Daily profit job completed successfully");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error running daily profit job:", err);
    process.exit(1);
  }
};