// routes/nowpayRoutes.js

import express from "express";
import { getSupportedCoins } from "../controllers/nowpayController.js";

const router = express.Router();

// Public route or protected route: your choice
router.get("/coins", getSupportedCoins);

export default router;