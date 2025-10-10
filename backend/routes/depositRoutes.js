// backend/routes/depositRoutes.js
import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {
  addDepositForUser,
  getAllDeposits,
  updateDepositStatus,
  getUserDeposits,
  deleteDeposit,
  withdrawFromUser,
} from "../controllers/depositController.js";

const router = express.Router();

// ✅ User - get their own deposits
router.get("/user/:userId", protect, getUserDeposits);

// ✅ Admin - fetch all deposits
router.get("/admin", protect, adminOnly, getAllDeposits);

// ✅ Admin - add a deposit for a user
router.post("/admin", protect, adminOnly, addDepositForUser);

// ✅ Admin - update deposit status (approve/reject)
router.patch("/admin/:depositId", protect, adminOnly, updateDepositStatus);
router.delete("/admin/:depositId", protect, adminOnly, deleteDeposit);
router.post("/admin/withdraw", protect, adminOnly, withdrawFromUser);
import Deposit from "../models/depositModel.js";

// ⚙️ TEMP route to clean deposits missing type
router.get("/fix-missing-type", async (req, res) => {
  try {
    const result = await Deposit.updateMany(
      { type: { $exists: false } },
      { $set: { type: "deposit" } }
    );
    res.json({ msg: "Fixed missing type fields", result });
  } catch (err) {
    console.error("❌ Fix route error:", err);
    res.status(500).json({ msg: "Server error" });
  }
});


export default router;