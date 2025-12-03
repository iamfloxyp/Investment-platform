import express from "express";
import axios from "axios";
import Deposit from "../models/depositModel.js";
import User from "../models/userModel.js";

const router = express.Router();

router.post("/create", async (req, res) => {
  try {
    const { userId, amount, plan, coin } = req.body;

    if (!userId || !amount || !plan || !coin) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    // Validate user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Create pending deposit
    const deposit = await Deposit.create({
      user: userId,
      amount,
      plan,
      method: coin.toLowerCase(),
      status: "pending",
      type: "deposit",
      coin: coin.toLowerCase(),
    });

    // CORRECT BLOCKBEE URL
    const url = `https://api.blockbee.io/forward/${coin}/generate`;

    // CORRECT REQUEST BODY
    const forwardRes = await axios.post(url, {
      api_key: process.env.BLOCKBEE_API_KEY,
      callback_url: `${process.env.BACKEND_URL}/api/blockbee/webhook/${deposit._id}`,
    });

    // CORRECT RESPONSE FIELD
    const paymentAddress =
      forwardRes.data.destination ||
      forwardRes.data.address ||
      forwardRes.data.address_in;

    if (!paymentAddress) {
      return res.status(500).json({ msg: "Could not generate address" });
    }

    deposit.paymentAddress = paymentAddress;
    await deposit.save();

    return res.json({
      success: true,
      depositId: deposit._id,
      address: paymentAddress,
      coin,
      amount,
    });

  } catch (err) {
    console.error("BlockBee Create Error:", err.message);
    return res.status(500).json({ msg: "Server error creating transaction" });
  }
});

export default router;