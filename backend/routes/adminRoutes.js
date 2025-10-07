// routes/adminRoutes.js
import express from "express";
import { addUserByAdmin } from "../controllers/adminController.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

// ➕ Only authenticated admins can access this
router.post("/add-user", protect, adminOnly, addUserByAdmin);

export default router;