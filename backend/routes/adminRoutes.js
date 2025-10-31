import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {saveAdminSettings, getAdminSettings} from "../controllers/adminSettingsController.js";
import {
  getAllUsers,
  createUser,
  toggleUserStatus,
  deleteUser,
  getAdminStats, 
  getAllWithdrawals,// ✅ added for dashboard totals
  addBonusToUser,
  addBonusToAll,
} from "../controllers/adminController.js";

const router = express.Router();

// ✅ Admin Dashboard Stats (totals + recent transactions)
router.get("/stats", protect, adminOnly, getAdminStats);
router.get("/withdrawals", protect,adminOnly,getAllWithdrawals);

// ✅ Fetch all users (display in admin user management)
router.get("/users", protect, adminOnly, getAllUsers);
router.post("/users", protect, adminOnly, createUser);
// ✅ Apply bonus to one user
router.post("/bonus", protect, adminOnly, addBonusToUser);

// ✅ Apply bonus to all users (tiered)
router.post("/bonus/all", protect, adminOnly, addBonusToAll);
// ✅ Toggle user active/inactive
router.patch("/users/:id/status", protect, adminOnly, toggleUserStatus);

// ✅ Delete user
router.delete("/users/:id", protect, adminOnly, deleteUser);
router.post("/settings", protect, adminOnly, saveAdminSettings);

export default router;