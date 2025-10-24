import Deposit from "../models/depositModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";
import {sendEmail} from "../utils/sendEmail.js"

export const handleNowPaymentsWebhook = async (req, res) => {
  try {
    const payment = req.body;

    console.log("📩 NOWPayments webhook received:", payment);

    // Validate important fields
    if (!payment || !payment.order_id) {
      return res.status(400).json({ msg: "Invalid webhook data" });
    }

    // Extract details
    const orderId = payment.order_id;
    const status = payment.payment_status;

    // Match deposit
    const deposit = await Deposit.findOne({ _id: orderId });
    if (!deposit) {
      console.warn(`⚠️ Deposit not found for order_id: ${orderId}`);
      return res.status(404).json({ msg: "Deposit not found" });
    }

    // If confirmed payment
    if (status === "finished" || status === "confirmed") {
      deposit.status = "approved";
      await deposit.save();

      const user = await User.findById(deposit.user);

      // Add amount to balance
      user.balance = (user.balance || 0) + Number(deposit.amount);
      await user.save();

      // Create a notification
      await Notification.create({
        user: user._id,
        type: "deposit",
        message: `✅ Your deposit of $${deposit.amount} in ${deposit.method.toUpperCase()} is confirmed.`,
      });

      console.log("💰 Deposit confirmed and balance updated for user:", user.email);
    }

    res.status(200).json({ msg: "Webhook processed" });
  } catch (err) {
    console.error("❌ NOWPayments webhook error:", err.message);
    res.status(500).json({ msg: "Server error processing webhook" });
  }
};