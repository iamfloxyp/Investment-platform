// routes/authRoutes.
import express from "express";
import {
  register,
  verifyEmail,
  resendCode,
  login,
  logout,
  forgotPassword,
  resetPassword,
} from "../controllers/authcontrollers.js";
import { protect } from "../middleware/authMiddleware.js";
import { getMe } from "../controllers/authcontrollers.js";

const router = express.Router();

// 🔹 Auth routes
router.post("/register", register);
router.post("/verify", verifyEmail);
router.post("/resend", resendCode);
router.post("/forgot-password", forgotPassword);
router.post("/login", login);
router.post("/logout", logout);

// 🔹 Password reset flow
router.post("/forgot-password", forgotPassword);

// ✅ Use query param for token (http://.../reset-password?token=xxx)
router.post("/reset-password", resetPassword);
router.get("/me", protect, getMe);

export default router;;