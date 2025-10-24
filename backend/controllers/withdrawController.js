// controllers/withdrawController.js
import User from "../models/userModel.js";
import Withdrawal from "../models/withdrawModel.js";

// ✅ Update user's wallet address
export const updateWallet = async (req, res) => {
  try {
    const { processor, address } = req.body;
    const userId = req.user.id;

    if (!processor || !address) {
      return res
        .status(400)
        .json({ message: "Processor and address are required." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    // Ensure nested objects exist
    if (!user.walletAddresses) user.walletAddresses = {};

    user.walletAddresses[processor] = address;
    await user.save();

    res.status(200).json({
      message: `${processor.toUpperCase()} wallet updated successfully.`,
      walletAddresses: user.walletAddresses,
    });
  } catch (err) {
    console.error("❌ Wallet update error:", err);
    res.status(500).json({ message: "Server error while updating wallet." });
  }
};

// ✅ Create a withdrawal request
export const createWithdrawal = async (req, res) => {
  try {
    let { processor, amount, walletAddress } = req.body;
    const userId = req.user.id;

    if (!processor) {
      return res.status(400).json({ message: "Processor is required." });
    }

    amount = Number(amount);
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid amount is required." });
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    // Ensure structures exist
    if (!user.wallets) user.wallets = {};
    if (!user.walletAddresses) user.walletAddresses = {};

    // If frontend didn’t send walletAddress, fall back to saved one
    if (!walletAddress) walletAddress = user.walletAddresses[processor];

    if (!walletAddress) {
      return res
        .status(400)
        .json({ message: `Please set your ${processor.toUpperCase()} wallet first.` });
    }

    const balance = Number(user.wallets[processor] || 0);
    if (balance < amount) {
      return res.status(400).json({ message: "Insufficient balance." });
    }

    // ✅ Deduct immediately from wallet (so dashboard & pending reflect correctly)
    user.wallets[processor] = balance - amount;
    await user.save();

    // ⚠️ IMPORTANT: Use field name `user` (not `userId`) to match your schema
    const withdrawal = await Withdrawal.create({
      user: userId,
      processor,
      amount,
      walletAddress,
      status: "pending",
    });

    res.status(201).json({
      message: `Withdrawal of $${amount.toFixed(2)} in ${processor.toUpperCase()} created.`,
      withdrawal,
    });
  } catch (err) {
    console.error("❌ Withdrawal creation error:", err);
    res.status(500).json({ message: "Server error while creating withdrawal." });
  }
};

// ✅ Fetch all pending withdrawals for logged-in user
export const getPendingWithdrawals = async (req, res) => {
  try {
    // ⚠️ IMPORTANT: Query by `user`, not `userId`
    const withdrawals = await Withdrawal.find({
      user: req.user.id,
      status: "pending",
    }).sort({ createdAt: -1 });

    res.status(200).json(withdrawals);
  } catch (err) {
    console.error("❌ Error fetching pending withdrawals:", err);
    res
      .status(500)
      .json({ message: "Server error while fetching withdrawals." });
  }
};