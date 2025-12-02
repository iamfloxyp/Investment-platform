import Deposit from "../models/depositModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";

export const handleBlockBeeWebhook = async (req, res) => {
  try {
    const { id, payment_id, txid, value_coin, coin, confirmations, status } =
      req.body;

    console.log("🔔 BlockBee Webhook Received:", req.body);

    // 1. Find deposit by invoice/payment id
    const deposit = await Deposit.findOne({ paymentId: id });

    if (!deposit) {
      console.log("⚠️ Deposit not found for this payment id");
      return res.status(404).json({ success: false });
    }

    // 2. Ignore if already completed
    if (deposit.status === "completed") {
      return res.json({ success: true, message: "Already processed" });
    }

    // 3. If status is confirmed, complete the deposit
    if (status === "confirmed" || confirmations >= 3) {
      deposit.status = "completed";
      await deposit.save();

      // credit the user
      const user = await User.findById(deposit.user);
      user.balance = (user.balance || 0) + Number(deposit.amount);
      user.activeDeposit =
        (user.activeDeposit || 0) + Number(deposit.amount);
      await user.save();

      // send notification
      await Notification.create({
        user: user._id,
        message: `Your crypto deposit of $${deposit.amount} was confirmed.`,
      });

      console.log("✅ Deposit Completed via BlockBee");
    }

    return res.json({ success: true });
  } catch (err) {
    console.log("Webhook error:", err);
    return res.status(500).json({ success: false });
  }
};