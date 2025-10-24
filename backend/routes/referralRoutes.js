import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { getReferralStats, getAllReferrals } from "../controllers/referralController.js";

const router = express.Router();

// ✅ User Route
router.get("/my", protect, getReferralStats);

// ✅ Admin Route
router.get("/admin/all", protect, adminOnly, getAllReferrals);

export default router;