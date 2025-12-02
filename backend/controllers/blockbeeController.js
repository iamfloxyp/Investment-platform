// controllers/blockbeeController.js
import axios from "axios";

export const getCoins = async (req, res) => {
  try {
    const apiKey = process.env.BLOCKBEE_API_KEY;

    const url = `https://api.blockbee.io/api/v1/crypto`;

    const response = await axios.get(url, {
      headers: {
        "X-API-KEY": apiKey,
      },
    });

    res.json(response.data);
  } catch (err) {
    console.error("BlockBee coin list error:", err.message);
    res.status(500).json({ msg: "Unable to fetch coin list" });
  }
};

export const createPayment = async (req, res) => {
  try {
    const { amount, coin, userId, plan } = req.body;

    if (!amount || !coin || !userId) {
      return res.status(400).json({ msg: "Missing fields" });
    }

    const usd = Number(amount);

    const apiKey = process.env.BLOCKBEE_API_KEY;

    const url = `https://api.blockbee.io/api/v1/${coin}/create`;

    const response = await axios.post(
      url,
      {
        amount: usd,
        fiat: "USD",
        callback: `${process.env.API_BASE}/api/blockbee/webhook`,
        metadata: { userId, plan }
      },
      {
        headers: { "X-API-KEY": apiKey }
      }
    );

    res.json(response.data);

  } catch (err) {
    console.error("BlockBee payment error:", err.message);
    res.status(500).json({ msg: "Unable to create payment" });
  }
};