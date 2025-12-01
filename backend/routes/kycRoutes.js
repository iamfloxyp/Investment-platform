 import express from "express";
import { submitKYC } from "../controllers/kycController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { uploadKYC } from "../middleware/uploadKYC.js";

const router = express.Router();

// USER submits KYC
router.post(
  "/submit",
  protect,
  uploadKYC.fields([
    { name: "licenseFront", maxCount: 1 },
    { name: "licenseBack", maxCount: 1 },
  ]),
  submitKYC
);

export default router;