// controllers/nowpayController.js

import axios from "axios";

export const getSupportedCoins = async (req, res) => {
  try {
    const url = "https://api.coingecko.com/api/v3/coins/list";

    const response = await axios.get(url);

    // Filter out only popular coins and return IDs like btc, eth, usdt
    const allowed = ["btc", "eth", "usdt", "bnb", "trx", "ltc", "xrp", "doge", "bch", "sol"];

    const coins = response.data
      .map((c) => c.symbol.toLowerCase())
      .filter((symbol) => allowed.includes(symbol));

    return res.json({
      success: true,
      coins,
    });
  } catch (err) {
    console.error("CoinGecko API error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load coins",
    });
  }
};