import axios from "axios";

export const getSupportedCoins = async (req, res) => {
  try {
    const url = "https://min-api.cryptocompare.com/data/all/coinlist";

    const response = await axios.get(url);

    const allCoins = response.data.Data || {};

    // Extract all symbols: BTC, ETH, XRP, etc.
    const symbols = Object.keys(allCoins)
      .map((key) => key.toLowerCase())
      .filter((sym) => sym.length >= 2); // remove invalid entries

    return res.json({
      success: true,
      coins: symbols,   // full unlimited list
    });
  } catch (err) {
    console.error("CryptoCompare API error:", err.message);

    return res.status(500).json({
      success: false,
      message: "Unable to load coins",
    });
  }
};