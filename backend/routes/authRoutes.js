import express from "express";
import {
  register,
  verifyEmail,
  resendCode,
  login,
  logout,
  forgotPassword,
  resetPassword,
  adminLogin,
  getMe,
  getAdmin,
} from "../controllers/authcontrollers.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// 🔹 Authentication Routes
router.post("/register", register);
router.post("/verify", verifyEmail);
router.post("/resend", resendCode);
router.post("/login", login);
router.post("/logout", logout);
router.post("/admin/login", adminLogin);

// 🔹 Password Recovery Routes
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

// 🔹 Protected Route (requires valid cookie)
router.get("/me", protect, getMe);
router.get("/admin", protect, getAdmin);


export default router;