// routes/withdrawRoutes.js
import express from "express";
import mongoose from "mongoose";
import {
  updateWallet,
  createWithdrawal,
  getPendingWithdrawals,
} from "../controllers/withdrawController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import Withdraw from "../models/withdrawModel.js";
import Notification from "../models/notificationModel.js";
import { sendEmail } from "../utils/sendEmail.js";

const router = express.Router();

// ✅ USER ROUTES
router.patch("/users/wallet", protect, updateWallet);
router.post("/withdrawals", protect, createWithdrawal);
router.get("/withdrawals/pending", protect, getPendingWithdrawals);
router.get("/pending", protect, getPendingWithdrawals);

// ✅ ADMIN ROUTE - APPROVE / REJECT WITHDRAWAL (INLINE HANDLER)
router.patch("/admin/withdrawals/:id", protect, adminOnly, async (req, res) => {
  try {
    const { status } = req.body;

    const withdrawal = await Withdraw.findById(req.params.id).populate("user");
    if (!withdrawal) {
      return res.status(404).json({ message: "Withdrawal not found" });
    }

    // Update withdrawal status
    withdrawal.status = status;
    await withdrawal.save();

    // Notification message
    const msg =
      status === "approved"
        ? `✅ Your withdrawal of $${withdrawal.amount.toFixed(
            2
          )} has been approved and is being processed.`
        : `❌ Your withdrawal of $${withdrawal.amount.toFixed(
            2
          )} was rejected. Please contact support if you have questions.`;

    // Create user notification
    if (withdrawal.user?._id) {
      await Notification.create({
        user: withdrawal.user._id,
        type: "withdraw",
        message: msg,
      });
    }

    // Optional email notification
    if (withdrawal.user?.email) {
      await sendEmail({
        to: withdrawal.user.email,
        subject:
          status === "approved"
            ? "Withdrawal Approved ✅"
            : "Withdrawal Update ❌",
        html: `<div style="font-family:Arial,sans-serif"><p>${msg}</p></div>`,
      });
    }

    res.status(200).json({
      message: `Withdrawal ${status} successfully`,
      withdrawal,
    });
  } catch (err) {
    console.error("❌ Error updating withdrawal:", err);
    res.status(500).json({ message: "Server error updating withdrawal" });
  }
});

// ✅ GET TOTAL WITHDRAWALS FOR A SPECIFIC USER
router.get("/withdrawals/user/total/:id", protect, async (req, res) => {
  try {
    const userId = req.params.id;

    // ✅ Support both user and userId fields
    const withdrawals = await Withdraw.find({
      $or: [{ user: userId }, { userId: userId.toString() }],
      status: { $in: ["approved", "completed"] },
    });

    const total = withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);

    res.status(200).json({ total });
  } catch (err) {
    console.error("❌ Error fetching total withdrawals:", err);
    res
      .status(500)
      .json({ message: "Server error fetching total withdrawals" });
  }
});

export default router;