// routes/blockbeeWebhook.js
import express from "express";
import Deposit from "../models/depositModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";

const router = express.Router();

router.post("/:depositId", async (req, res) => {
  try {
    const depositId = req.params.depositId;
    const data = req.body;

    console.log("🔔 BlockBee Webhook Received:", data);

    const deposit = await Deposit.findById(depositId);

    if (!deposit) {
      console.log("Deposit not found");
      return res.json({ ok: true });
    }

    if (deposit.status !== "pending") {
      return res.json({ ok: true });
    }

    if (data.status !== "confirmed") {
      return res.json({ ok: true });
    }

    deposit.status = "approved";
    deposit.txid = data.txid;
    deposit.paidAmount = Number(data.value_fiat || 0);
    await deposit.save();

    const user = await User.findById(deposit.user);

    user.balance += deposit.paidAmount;
    user.activeDeposit += deposit.paidAmount;
    await user.save();

    await Notification.create({
      user: user._id,
      message: `Your ${deposit.coin.toUpperCase()} deposit of $${deposit.paidAmount} is confirmed`,
    });

    return res.json({ success: true });

  } catch (err) {
    console.error("Webhook Error:", err.message);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;