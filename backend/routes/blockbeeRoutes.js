// routes/blockbeeRoutes.js
import express from "express";
import axios from "axios";
import Deposit from "../models/depositModel.js";
import User from "../models/userModel.js";

const router = express.Router();

// ----------------------------------------------
// GET DYNAMIC COIN LIST FROM BLOCKBEE
// ----------------------------------------------
router.get("/coins", async (req, res) => {
  try {
    const apiRes = await axios.get(
      `https://api.blockbee.io/coins?apikey=${process.env.BLOCKBEE_API_KEY}`
    );

    return res.json({
      success: true,
      coins: apiRes.data.coins || []
    });

  } catch (err) {
    console.error("Coin list error:", err.message);
    return res.status(500).json({ msg: "Failed to load coins" });
  }
});

// ----------------------------------------------
// CREATE PAYMENT ADDRESS
// ----------------------------------------------
router.post("/create", async (req, res) => {
  try {
    const { userId, amount, plan, coin } = req.body;

    if (!userId || !amount || !plan || !coin) {
      return res.status(400).json({ msg: "Missing required fields" });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ msg: "User not found" });

    // Create deposit
    const deposit = await Deposit.create({
      user: userId,
      amount,
      plan,
      method: coin.toLowerCase(),
      status: "pending",
      type: "deposit",
      coin: coin.toLowerCase()
    });

    // BlockBee generate address
    const forwardRes = await axios.get(
      `https://api.blockbee.io/forward/${coin}?apikey=${process.env.BLOCKBEE_API_KEY}`
    );

    const address = forwardRes.data.address;
    if (!address) {
      return res.status(500).json({ msg: "Failed to generate address" });
    }

    deposit.paymentAddress = address;
    await deposit.save();

    return res.json({
      success: true,
      depositId: deposit._id,
      address,
      coin,
      amount
    });

  } catch (err) {
    console.error("BlockBee Create Error:", err.message);
    return res.status(500).json({ msg: "Server error creating transaction" });
  }
});

export default router;