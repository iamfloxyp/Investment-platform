import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/userModel.js";
import Deposit from "./models/depositModel.js";
import Plan from "./models/planModel.js";
import { computePercentForDay } from "./utils/planPercent.js";

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

export const runDailyProfit = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected for daily profit");

    const plans = await Plan.find();
    const planMap = {};
    plans.forEach(p => (planMap[p.slug] = p));

    const users = await User.find();
    const now = new Date();

    for (const user of users) {
      const deposits = await Deposit.find({
        user: user._id,
        type: "deposit",
        status: { $in: ["approved", "completed"] },
      });

      if (deposits.length === 0) continue;

      let totalProfit = 0;

      for (const dep of deposits) {
        const slug = (dep.plan || "bronze").toLowerCase();
        const plan = planMap[slug] || planMap["bronze"];
        const percent = computePercentForDay(plan, now);
        const profit = dep.amount * percent;
        totalProfit += profit;
      }

      user.earnedTotal = (user.earnedTotal || 0) + totalProfit;
      user.dailyProfit = totalProfit;
      user.lastProfitUpdate = now;
      await user.save();

      console.log(
        `💰 ${user.email}: +$${totalProfit.toFixed(2)} added (${(
          totalProfit / user.balance
        ).toFixed(2)}%)`
      );
    }

    console.log("🎯 Daily profit job complete");
    process.exit(0);
  } catch (err) {
    console.error("❌ daily profit job error:", err);
    process.exit(1);
  }
};