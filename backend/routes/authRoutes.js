import express from "express";
import {
  register,
  verifyEmail,
  resendCode,
  login,
  logout,
  forgotPassword,
  resetPassword,
  getMe,
} from "../controllers/authcontrollers.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔹 Authentication Routes
router.post("/register", register);
router.post("/verify", verifyEmail);
router.post("/resend", resendCode);
router.post("/login", login);
router.post("/logout", logout);

// 🔹 Password Recovery Routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// 🔹 Protected Route (requires valid cookie)
router.get("/me", protect, getMe);

export default router;