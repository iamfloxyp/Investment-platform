import express from "express";
import {
  updateWallet,
  createWithdrawal,
  getPendingWithdrawals,
  approveWithdrawal, // ✅ new import
} from "../controllers/withdrawController.js";
import Withdrawal from "../models/withdrawModel.js"
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ USER ROUTES
router.patch("/users/wallet", protect, updateWallet);
router.post("/withdrawals", protect, createWithdrawal);
// router.get("/withdrawals/pending", protect, getPendingWithdrawals);
router.get("/pending", protect, getPendingWithdrawals);

// ✅ ADMIN ROUTE - APPROVE / REJECT WITHDRAWAL
router.patch("/admin/withdrawals/:id", protect, adminOnly, approveWithdrawal);

// ✅ GET TOTAL WITHDRAWALS FOR A SPECIFIC USER
router.get("/withdrawals/user/total/:id", protect, async (req, res) => {
  try {
    const userId = req.params.id;

    // ✅ Get all approved or completed withdrawals for this user
    const withdrawals = await Withdrawal.find({
      user: userId,
      status: { $in: ["approved", "completed"] },
    });

    // ✅ Calculate total amount withdrawn
    const total = withdrawals.reduce((sum, w) => sum + (w.amount || 0), 0);

    res.status(200).json({ total });
  } catch (err) {
    console.error("❌ Error fetching total withdrawals:", err);
    res.status(500).json({ message: "Server error fetching total withdrawals" });
  }
});

export default router;