import express from "express";
import { handleNowPaymentsWebhook } from "../controllers/nowPaymentsWebhookController.js";

const router = express.Router();

// Webhook (no auth needed)
router.post("/nowpayments/webhook", handleNowPaymentsWebhook);

export default router;