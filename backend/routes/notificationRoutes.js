// routes/notificationRoutes.js
import express from "express";
import { getUserNotifications, markAsRead } from "../controllers/notificationController.js";

const router = express.Router();

router.get("/:userId", getUserNotifications);
router.patch("/read/:id", markAsRead);

export default router;