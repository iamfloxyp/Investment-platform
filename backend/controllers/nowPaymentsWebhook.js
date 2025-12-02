/// controllers/nowPaymentsWebhook.js

import Deposit from "../models/depositModel.js";
import Notification from "../models/notificationModel.js";
import User from "../models/userModel.js";
import mongoose from "mongoose";
import { sendEmail } from "../utils/sendEmail.js";

export const handleNowPaymentsIPN = async (req, res) => {
  try {
    const data = req.body;
    console.log("NOWPayments Webhook Received:", data);

    const invoiceId = data.invoice_id;
    const paymentStatus = data.payment_status;
    const payAmount = Number(data.pay_amount || 0);

    if (!invoiceId) {
      console.log("No invoice id received");
      return res.status(400).json({ msg: "Invalid webhook payload" });
    }

    // Find deposit by invoiceId
    const deposit = await Deposit.findOne({ invoiceId }).populate("user");
    if (!deposit) {
      console.log("Deposit not found for invoice", invoiceId);
      return res.status(404).json({ msg: "Deposit not found" });
    }

    // Only approve once
    if (paymentStatus === "finished" && deposit.status !== "approved") {
      deposit.status = "approved";
      await deposit.save();

      const user = deposit.user;

      // Update wallet balances
      const coin = deposit.method.toLowerCase();
      if (!user.wallets) user.wallets = {};
      user.wallets[coin] = (user.wallets[coin] || 0) + payAmount;

      // Update user balance
      user.balance = (user.balance || 0) + payAmount;
      user.activeDeposit = (user.activeDeposit || 0) + payAmount;
      user.totalDeposits = (user.totalDeposits || 0) + payAmount;
      await user.save();

      // Notify the user
      await Notification.create({
        user: user._id,
        type: "deposit",
        message: `Your deposit of $${payAmount.toFixed(2)} for the ${deposit.plan} plan has been confirmed.`,
      });

      // Referral bonus
      if (user.referredBy && mongoose.isValidObjectId(user.referredBy)) {
        try {
          const referrer = await User.findById(user.referredBy);
          if (referrer) {
            const bonus = payAmount * 0.07;
            referrer.balance = (referrer.balance || 0) + bonus;
            referrer.referralEarnings = (referrer.referralEarnings || 0) + bonus;
            await referrer.save();

            await Notification.create({
              user: referrer._id,
              type: "referral",
              message: `You earned $${bonus.toFixed(2)} from ${user.firstName}'s deposit.`,
            });
          }
        } catch (err) {
          console.log("Referral error", err.message);
        }
      }

      console.log(`Deposit with invoice ${invoiceId} marked as paid`);
    }

    return res.status(200).json({ msg: "Webhook processed successfully" });
  } catch (err) {
    console.error("Webhook error:", err.message);
    res.status(500).json({ msg: "Server error processing webhook" });
  }
};