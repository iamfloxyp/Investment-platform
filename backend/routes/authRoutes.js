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

// 🔹 Protected Routes
router.get("/me", protect, getMe);
router.get("/admin", protect, getAdmin);

// 🔹 Force Logout (clears all cookies)
router.get("/force-logout", (req, res) => {
  try {
    res.clearCookie("emuntra_user_token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });
    res.clearCookie("emuntra_admin_token", {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      path: "/",
    });
    console.log("✅ All cookies cleared");
    return res.json({ message: "✅ All cookies cleared successfully" });
  } catch (err) {
    console.error("Force logout error:", err);
    return res.status(500).json({ message: "Server error clearing cookies" });
  }
});

export default router;