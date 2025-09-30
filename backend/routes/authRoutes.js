// routes/authRoutes.js
import express from "express";
import {
  register,
  verifyEmail,
  resendCode,
  login,
  forgotPassword,
  resetPassword
} from "../controllers/authcontrollers.js";

const router = express.Router();

// 🔹 Auth routes
router.post("/register", register);
router.post("/verify", verifyEmail);
router.post("/resend", resendCode);
router.post("/login", login);

// 🔹 Password reset flow
router.post("/forgot-password", forgotPassword);

// ✅ Use query param for token (http://.../reset-password?token=xxx)
router.post("/reset-password", resetPassword);

export default router;;