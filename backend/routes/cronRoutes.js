// backend/routes/cronRoutes.js
import express from "express";
import { runDailyProfit } from "../dailyProfitJob.js";

const router = express.Router();

// Simple GET endpoint that cron-job.com will call
router.get("/run-daily-profit", async (req, res) => {
  try {
    console.log("Cron route hit, running daily profit...");
    await runDailyProfit();
    res.json({ success: true, message: "Daily profit executed" });
  } catch (err) {
    console.error("Error in cron route", err);
    res.status(500).json({ success: false, message: "Error running daily profit" });
  }
});

export default router;