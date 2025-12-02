import express from "express";
import Deposit from "../models/depositModel.js";
import User from "../models/userModel.js";
import Notification from "../models/notificationModel.js";

const router = express.Router();

/*
  BLOCKBEE WEBHOOK FORMAT:
  {
    "address": "yourWalletAddress",
    "txid": "transaction_hash",
    "value_coin": "0.00024",
    "value_fiat": "25.00",
    "coin": "btc",
    "status": "confirmed"
  }
*/

router.post("/callback", async (req, res) => {
  try {
    const data = req.body;
    console.log("🔔 BlockBee Callback:", data);

    const {
      address,
      txid,
      value_coin,
      value_fiat,
      coin,
      status
    } = data;

    // We only process confirmed payments
    if (status !== "confirmed") {
      return res.json({ ok: true });
    }

    // Find deposit that matches address
    const deposit = await Deposit.findOne({
      paymentAddress: address,
      status: "pending"
    });

    if (!deposit) {
      console.log("⚠ No matching deposit found for address:", address);
      return res.json({ ok: true });
    }

    // Update deposit
    deposit.status = "approved";
    deposit.txid = txid;
    deposit.paidAmount = value_fiat;
    await deposit.save();

    // Update user balance
    const user = await User.findById(deposit.user);
    user.balance += Number(value_fiat);
    user.activeDeposit += Number(value_fiat);
    await user.save();

    // Create notification
    await Notification.create({
      user: user._id,
      message: `Your deposit of $${value_fiat} in ${coin.toUpperCase()} has been confirmed.`
    });

    console.log(`✅ Deposit approved for ${user.email}`);

    return res.json({ success: true });
  } catch (err) {
    console.error("❌ BlockBee webhook error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;