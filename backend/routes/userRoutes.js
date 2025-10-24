// backend/routes/userRoutes.js
import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  updateMe,
  updateWalletAddresses,
  updateMyPassword,
  updateMyAvatar,
} from "../controllers/userController.js";

const router = express.Router();

router.put("/me", protect, updateMe);
router.put("/me/wallets", protect, updateWalletAddresses);
router.put("/me/password", protect, updateMyPassword);
router.put("/me/avatar", protect, updateMyAvatar);

export default router;