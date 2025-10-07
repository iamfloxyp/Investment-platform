// routes/depositRoutes.js
import express from "express";
import {
  addDepositForUser,
  getAllDeposits,
  updateDepositStatus,
  getUserDeposits
} from "../controllers/depositController.js";

const router = express.Router();

// 🔹 Admin creates deposit for a user
router.post("/admin/add", addDepositForUser);

// 🔹 Admin fetches all deposits
router.get("/admin/all", getAllDeposits);

// 🔹 Admin updates deposit status (optional)
router.put("/admin/:depositId", updateDepositStatus);

// 🔹 User fetches their own deposits
router.get("/user/:userId", getUserDeposits);

export default router;