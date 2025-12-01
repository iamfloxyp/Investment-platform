import express from "express";
import { submitKYC, updateKYCStatus } from "../controllers/kycController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// User submits KYC
router.post("/submit", protect, submitKYC);

// User gets their own KYC info
router.get("/me", protect, async (req, res) => {
  try {
    const kyc = await KYC.findOne({ user: req.user.id });
    res.status(200).json(kyc || {});
  } catch (err) {
    res.status(500).json({ message: "Could not fetch KYC details" });
  }
});

// Admin views all KYC submissions
router.get("/all", protect, adminOnly, async (req, res) => {
  try {
    const list = await KYC.find().populate("user", "firstName lastName email");
    res.status(200).json(list);
  } catch (err) {
    res.status(500).json({ message: "Could not fetch KYC list" });
  }
});

// Admin updates KYC status
router.put("/status/:id", protect, adminOnly, updateKYCStatus);

export default router;