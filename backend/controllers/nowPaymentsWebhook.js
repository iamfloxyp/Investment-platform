// controllers/nowPaymentsWebhook.js
import Deposit from "../models/depositModel.js";
import Notification from "../models/notificationModel.js";
import User from "../models/userModel.js";
import mongoose from "mongoose";
import {sendEmail} from "../utils/sendEmail.js"

export const handleNowPaymentsIPN = async (req, res) => {
  try {
    const data = req.body;
    console.log("📩 NOWPayments Webhook Received:", data);

    const orderId = data.order_id; // e.g. "emuntra_173045..."
    const paymentStatus = data.payment_status; // e.g. "finished", "failed", "waiting"
    const paidAmount = parseFloat(data.pay_amount || 0);

    // Find deposit by order_id
    const deposit = await Deposit.findOne({ order_id: orderId }).populate("user");
    if (!deposit) return res.status(404).json({ msg: "Deposit not found" });

    // Only process finished payments once
    if (paymentStatus === "finished" && deposit.status !== "approved") {
      deposit.status = "approved";
      await deposit.save();

      const user = deposit.user;
      user.balance = (user.balance || 0) + paidAmount;
      await user.save();

      // ✅ Notification for user
      await Notification.create({
        user: user._id,
        type: "deposit",
        message: `✅ Your payment of $${paidAmount.toFixed(2)} for the ${deposit.plan} plan has been confirmed!`,
      });

      // ✅ Referral commission (7%)
      if (user.referredBy && mongoose.isValidObjectId(user.referredBy)) {
        try {
          const referrer = await User.findById(user.referredBy);
          if (referrer) {
            const commission = paidAmount * 0.07;
            referrer.balance = (referrer.balance || 0) + commission;
            referrer.referralEarnings = (referrer.referralEarnings || 0) + commission;
            await referrer.save();

            await Notification.create({
              user: referrer._id,
              type: "referral",
              message: `🎉 You earned $${commission.toFixed(
                2
              )} from ${user.firstName}'s confirmed deposit!`,
            });
          }
        } catch (err) {
          console.warn("⚠️ Referral error:", err.message);
        }
      }

      console.log(`💰 Deposit ${orderId} marked as PAID and balance updated.`);
    }

    res.status(200).json({ msg: "Webhook processed successfully" });
  } catch (err) {
    console.error("❌ Webhook error:", err.message);
    res.status(500).json({ msg: "Server error processing webhook" });
  }
};