// routes/nowpayRoutes.js

import express from "express";
import { getSupportedCoins } from "../controllers/nowpayController.js";
import { addDepositForUser } from "../controllers/depositController.js";
import { handleNowPaymentsIPN } from "../controllers/nowPaymentsWebhook.js";

const router = express.Router();

// Get list of supported coins
router.get("/coins", getSupportedCoins);

// User creates a crypto deposit through NOWPayments
router.post("/create", addDepositForUser);

// NOWPayments webhook callback
router.post("/webhook", handleNowPaymentsIPN);

export default router;