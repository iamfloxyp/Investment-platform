// routes/depositRoutes.js
import express from "express";
import {
  addDepositForUser,
  getAllDeposits,
  updateDepositStatus,
  getUserDeposits,
  deleteDeposit,
} from "../controllers/depositController.js";
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
router.post("/add", protect, addDepositForUser);
router.post("/", protect, addDepositForUser);
router.get("/user/:userId", protect, getUserDeposits);


/* ============================================================
   ✅ NOWPAYMENTS WEBHOOK ROUTE (AUTO PAYMENT UPDATES)
============================================================ */
// ⚠️ Changed path name slightly to avoid conflict with paymentRoutes.js
// router.post("/webhook/ipn", express.json(), handleNowPaymentsIPN);

export default router;