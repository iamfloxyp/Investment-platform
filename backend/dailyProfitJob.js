import mongoose from "mongoose";
import dotenv from "dotenv";
import User from "./models/userModel.js";
import Deposit from "./models/depositModel.js"; // ✅ make sure this path is correct

dotenv.config();
const MONGO_URI = process.env.MONGO_URI;

const runDailyProfit = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected for daily profit\n");

    const users = await User.find();
    console.log(`📊 Total users found: ${users.length}\n`);

    const now = new Date();

    for (const user of users) {
      console.log(`🧾 Checking deposits for user: ${user.email || "unknown"}`);

      // ✅ FIXED: use 'user' instead of 'userId'
      const deposits = await Deposit.find({
        user: user._id,
        type: "deposit", // only deposits, not withdrawals
        status: { $in: ["approved", "completed"] },
      });

      if (deposits.length === 0) {
        console.log(`⚠️ No approved/completed deposits found for ${user.email}\n`);
        continue;
      }

      const totalDeposit = deposits.reduce((sum, dep) => sum + dep.amount, 0);
      console.log(`💰 Total Deposits for ${user.email}: $${totalDeposit.toFixed(2)}`);

      const percent = Math.floor(Math.random() * 5) + 1;
      const profit = totalDeposit * (percent / 100);

      user.earnedTotal = (user.earnedTotal || 0) + profit;
      user.dailyProfit = profit;
      user.lastProfitUpdate = now;
      await user.save();

      console.log(
        `✅ Profit for ${user.email}: $${profit.toFixed(2)} (${percent}%) added\n`
      );
    }

    console.log("🎉 Daily profit calculation complete!\n");
    process.exit();
  } catch (error) {
    console.error("❌ Error in daily profit job:", error.message);
    process.exit(1);
  }
};

export {runDailyProfit};