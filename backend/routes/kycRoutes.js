import express from "express";
import { submitKYC } from "../controllers/kycController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  getAllKycRequests,
  getSingleKycRequest,
  approveKyc,
  rejectKyc,
} from "../controllers/adminKycController.js";

const router = express.Router();

// User submits KYC
router.post("/submit", protect, submitKYC);

// User gets their own KYC data
router.get("/me", protect, async (req, res) => {
  try {
    const user = req.user;
    return res.json({
      kycStatus: user.kycStatus,
      kycMessage: user.kycMessage,
      kyc: user.kyc,
    });
  } catch (err) {
    return res.status(500).json({ message: "Could not fetch KYC details" });
  }
});

// Admin routes
router.get("/admin/all", protect, adminOnly, getAllKycRequests);
router.get("/admin/:userId", protect, adminOnly, getSingleKycRequest);
router.patch("/admin/:userId/approve", protect, adminOnly, approveKyc);
router.patch("/admin/:userId/reject", protect, adminOnly, rejectKyc);

export default router;