import express from "express";
import {
  getAllKycRequests,
  getSingleKycRequest,
  approveKyc,
  rejectKyc,
} from "../controllers/adminKycController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// Correct admin KYC routes
router.get("/all", protect, adminOnly, getAllKycRequests);
router.get("/:userId", protect, adminOnly, getSingleKycRequest);
router.patch("/:userId/approve", protect, adminOnly, approveKyc);
router.patch("/:userId/reject", protect, adminOnly, rejectKyc);

export default router;