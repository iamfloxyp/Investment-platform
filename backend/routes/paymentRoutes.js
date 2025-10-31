// routes/paymentRoutes.js
import express from "express";
import { handleNowPaymentsWebhook } from "../controllers/nowPaymentsWebhookController.js";

const router = express.Router();

// ✅ Webhook for payment updates (no auth)
router.post("/nowpayments/webhook", handleNowPaymentsWebhook);

export default router;