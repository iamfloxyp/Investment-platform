// controllers/nowpayController.js

import axios from "axios";

// Your NowPayments API key from your dashboard
const NOWPAY_API_KEY = process.env.NOWPAY_API_KEY;
const NOWPAY_BASE = "https://api.nowpayments.io/v1";

// Get list of supported currencies
export const getSupportedCoins = async (req, res) => {
  try {
    const response = await axios.get(`${NOWPAY_BASE}/currencies`, {
      headers: {
        "x-api-key": NOWPAY_API_KEY,
      },
    });

    return res.json({
      success: true,
      coins: response.data.currencies || [],
    });
  } catch (err) {
    console.error("NowPayments currency list error:", err.response?.data || err);
    return res.status(500).json({
      success: false,
      message: "Unable to fetch currency list from NowPayments",
    });
  }
};