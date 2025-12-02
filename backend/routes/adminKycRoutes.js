// routes/adminKycRoutes.js
import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  getAllKycRequests,
  getSingleKycRequest,
  approveKyc,
  rejectKyc,
} from "../controllers/adminKycController.js";

const router = express.Router();

// GET /api/admin/kyc   -> list all pending KYC
router.get("/", protect, adminOnly, getAllKycRequests);

// GET /api/admin/kyc/:userId   -> details for one user
router.get("/:userId", protect, adminOnly, getSingleKycRequest);

// PATCH /api/admin/kyc/:userId/approve
router.patch("/:userId/approve", protect, adminOnly, approveKyc);

// PATCH /api/admin/kyc/:userId/reject
router.patch("/:userId/reject", protect, adminOnly, rejectKyc);

export default router;