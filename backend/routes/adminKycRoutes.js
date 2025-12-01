import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  getAllKycRequests,
  getSingleKycRequest,
  approveKyc,
  rejectKyc
} from "../controllers/adminKycController.js";

const router = express.Router();

// GET all submissions
router.get("/", protect, adminOnly, getAllKycRequests);

// GET single submission
router.get("/:userId", protect, adminOnly, getSingleKycRequest);

// APPROVE
router.patch("/:userId/approve", protect, adminOnly, approveKyc);

// REJECT
router.patch("/:userId/reject", protect, adminOnly, rejectKyc);

export default router;