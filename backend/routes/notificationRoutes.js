// routes/notificationRoutes.js
// backend/routes/notificationRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getUserNotifications, markAsRead } from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", protect, getUserNotifications);
router.patch("/read/:id", protect, markAsRead);

export default router;