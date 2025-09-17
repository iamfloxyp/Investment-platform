// server.js (ESM version)
import express from "express";
// authRoutes.js

import {
  register,
  verifyEmail,
  resendCode,
  login,
} from "../controllers/authControllers.js";

const router = express.Router();

router.post("/register", register);
router.post("/verify", verifyEmail);
router.post("/resend", resendCode);
router.post("/login", login);

// ✅ THIS IS THE FIX
export default router;