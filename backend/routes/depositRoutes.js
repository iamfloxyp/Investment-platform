// routes/depositRoutes.js
import express from "express";
import {
  addDepositForUser,
  getAllDeposits,
  updateDepositStatus,
  getUserDeposits,
  deleteDeposit,
} from "../controllers/depositController.js";
import { handleNowPaymentsIPN } from "../controllers/nowPaymentsWebhook.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";

const router = express.Router();

/* ============================================================
   ✅ ADMIN ROUTES
============================================================ */
router.post("/admin/add", protect, adminOnly, addDepositForUser);
router.get("/admin/all", protect, adminOnly, getAllDeposits);
router.patch("/admin/update/:depositId", protect, adminOnly, updateDepositStatus);
router.delete("/admin/delete/:depositId", protect, adminOnly, deleteDeposit);

/* ============================================================
   ✅ USER ROUTES
============================================================ */
router.post("/", protect, addDepositForUser);
router.get("/user/:userId", protect, getUserDeposits);

/* ============================================================
   ✅ NOWPAYMENTS WEBHOOK ROUTE (AUTO PAYMENT UPDATES)
============================================================ */
// 🔔 This route will be called automatically by NOWPayments
// when a deposit is completed or confirmed on the blockchain.
router.post("/webhook/nowpayments", express.json(), handleNowPaymentsIPN);

export default router;