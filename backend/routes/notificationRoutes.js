// backend/routes/notificationRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getUserNotifications,
//   getRecentNotifications,
  markAsRead,
  deleteNotification,
  deleteAllNotifications,
} from "../controllers/notificationController.js";

const router = express.Router();

// ✅ Fetch notifications
router.get("/", protect, getUserNotifications);
// router.get("/", protect, getRecentNotifications);

// ✅ Mark as read
router.patch("/read/:id", protect, markAsRead);

// ✅ Delete a single notification
router.delete("/:id", protect, deleteNotification);

// ✅ Delete all notifications
router.delete("/", protect, deleteAllNotifications);

export default router;;