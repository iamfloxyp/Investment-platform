/// controllers/nowPaymentsWebhook.js

import Deposit from "../models/depositModel.js";
import Notification from "../models/notificationModel.js";
import User from "../models/userModel.js";
import mongoose from "mongoose";
import { sendEmail } from "../utils/sendEmail.js";

export const handleNowPaymentsIPN = async (req, res) => {
  try {
    const data = req.body;
    console.log("📩 NOWPayments IPN Received:", data);

    const invoiceId = data.invoice_id;
    const paymentStatus = data.payment_status;

    if (!invoiceId) {
      console.log("❌ Missing invoice ID");
      return res.status(400).json({ msg: "Invalid webhook payload" });
    }

    // Match deposit using invoiceId stored earlier
    const deposit = await Deposit.findOne({ invoiceId }).populate("user");
    if (!deposit) {
      console.log("⚠️ Deposit not found for invoice:", invoiceId);
      return res.status(404).json({ msg: "Deposit not found" });
    }

    // Reject invalid statuses
    if (["failed", "expired", "refunded"].includes(paymentStatus)) {
      deposit.status = "rejected";
      await deposit.save();
      return res.status(200).json({ msg: "Payment rejected" });
    }

    // Only credit if payment is completed
    if (
      (paymentStatus === "finished" || paymentStatus === "confirmed") &&
      deposit.status !== "completed"
    ) {
      deposit.status = "completed";
      await deposit.save();

      const user = deposit.user;

      // Update USD-based balance & deposits
      const usdAmount = Number(deposit.amount);

      user.balance = (user.balance || 0) + usdAmount;
      user.activeDeposit = (user.activeDeposit || 0) + usdAmount;
      user.totalDeposits = (user.totalDeposits || 0) + usdAmount;

      await user.save();

      // Create notification
      await Notification.create({
        user: user._id,
        type: "deposit",
        message: `Your deposit of $${usdAmount} for the ${deposit.plan} plan is confirmed.`,
      });

      // Referral bonus: 7 percent once
      if (
        user.referredBy &&
        mongoose.isValidObjectId(user.referredBy) &&
        deposit.referralPaid !== true
      ) {
        const referrer = await User.findById(user.referredBy);
        if (referrer) {
          const bonus = usdAmount * 0.07;

          referrer.balance = (referrer.balance || 0) + bonus;
          referrer.referralEarnings =
            (referrer.referralEarnings || 0) + bonus;

          await referrer.save();

          await Notification.create({
            user: referrer._id,
            type: "referral",
            message: `You earned $${bonus.toFixed(
              2
            )} from ${user.firstName}'s deposit.`,
          });

          // Mark referral as processed
          deposit.referralPaid = true;
          await deposit.save();
        }
      }

      console.log(`💰 Deposit ${invoiceId} marked as completed`);
    }

    return res.status(200).json({ msg: "Webhook processed successfully" });

  } catch (err) {
    console.error("❌ NOWPayments Webhook Error:", err.message);
    return res.status(500).json({ msg: "Server error" });
  }
};