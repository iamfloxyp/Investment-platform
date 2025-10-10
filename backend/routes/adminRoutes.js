import express from "express";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import {saveAdminSettings, getAdminSettings} from "../controllers/adminSettingsController.js";
import {
  getAllUsers,
  createUser,
  toggleUserStatus,
  deleteUser,
  getAdminStats, // ✅ added for dashboard totals
} from "../controllers/adminController.js";

const router = express.Router();

// ✅ Admin Dashboard Stats (totals + recent transactions)
router.get("/stats", protect, adminOnly, getAdminStats);

// ✅ Fetch all users (display in admin user management)
router.get("/users", protect, adminOnly, getAllUsers);
router.post("/users", protect, adminOnly, createUser);
// ✅ Toggle user active/inactive
router.patch("/users/:id/status", protect, adminOnly, toggleUserStatus);

// ✅ Delete user
router.delete("/users/:id", protect, adminOnly, deleteUser);
router.post("/settings", protect, adminOnly, saveAdminSettings);

export default router;