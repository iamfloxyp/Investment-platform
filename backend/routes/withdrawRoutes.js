import express from "express";
import {
  updateWallet,
  createWithdrawal,
  getPendingWithdrawals,
  approveWithdrawal, // ✅ new import
} from "../controllers/withdrawController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// ✅ USER ROUTES
router.patch("/users/wallet", protect, updateWallet);
router.post("/withdrawals", protect, createWithdrawal);
router.get("/withdrawals/pending", protect, getPendingWithdrawals);
router.get("/pending", protect, getPendingWithdrawals);

// ✅ ADMIN ROUTE - APPROVE / REJECT WITHDRAWAL
router.patch("/admin/withdrawals/:id", protect, adminOnly, approveWithdrawal);

export default router;