// controllers/nowpayController.js

import axios from "axios";

const NOWPAY_API_KEY = process.env.NOWPAYMENTS_API_KEY;

// Pull full coin list from new NowPayments endpoint
export const getSupportedCoins = async (req, res) => {
  try {
    const url = "https://api.nowpayments.io/v1/merchant/coins";

    const response = await axios.get(url, {
      headers: {
        "x-api-key": NOWPAY_API_KEY,
        Accept: "application/json",
      },
    });

    // Get only coin codes like btc, eth, sol
    const coins = response.data.coins.map((c) => c.code);

    return res.json({
      success: true,
      coins,
    });
  } catch (err) {
    console.error("NowPayments API error:", err.response?.data || err.message);

    return res.status(500).json({
      success: false,
      message: "Unable to fetch coin list from NowPayments",
    });
  }
};