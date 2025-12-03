import Deposit from "../models/depositModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import { sendEmail } from "../utils/sendEmail.js";

export const handleNowPaymentsWebhook = async (req, res) => {
  try {
    const payment = req.body;

    console.log("📩 NOWPayments Webhook Received:", payment);

    if (!payment || (!payment.order_id && !payment.payment_id)) {
      return res.status(400).json({ msg: "Invalid webhook payload" });
    }

    // Determine which id we use
    const orderId = payment.order_id; // deposit._id we sent in create request
    const status = payment.payment_status;

    // Find deposit
    const deposit = await Deposit.findById(orderId);
    if (!deposit) {
      console.warn(`⚠️ Deposit not found for order_id: ${orderId}`);
      return res.status(404).json({ msg: "Deposit not found" });
    }

    console.log(`🔍 Deposit found for ${deposit._id}, status: ${status}`);

    // Handle statuses
    if (status === "finished") {
      deposit.status = "completed";
      await deposit.save();

      const user = await User.findById(deposit.user);

      // Update balance
      user.balance = (user.balance || 0) + Number(deposit.amount);
      await user.save();

      await Notification.create({
        user: user._id,
        type: "deposit",
        message: `Your deposit of $${deposit.amount} via ${deposit.method.toUpperCase()} is now completed.`,
      });

      console.log(`💰 Deposit completed & balance updated for ${user.email}`);
    } 
    else if (status === "confirmed") {
      deposit.status = "approved";
      await deposit.save();
    } 
    else if (["failed", "refunded", "expired"].includes(status)) {
      deposit.status = "rejected";
      await deposit.save();
    }

    return res.status(200).json({ msg: "Webhook processed successfully" });

  } catch (err) {
    console.error("❌ NOWPayments Webhook Error:", err);
    return res.status(500).json({ msg: "Webhook error" });
  }
};