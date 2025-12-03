// controllers/nowPaymentsController.js

export const getSupportedCoins = async (req, res) => {
  return res.json({
    success: true,
    coins: [
      "btc",        // Bitcoin
      "eth",        // Ethereum
      "usdttrc20",  // USDT (TRON network, lowest fee)
      "usdc",       // USD Coin
      "trx",        // Tron
      "bnb",        // BNB Smart Chain
      "xrp",        // Ripple
      "sol",        // Solana
      "ltc",        // Litecoin
      "doge",       // Dogecoin
      "bch",        // Bitcoin Cash
      "ada"         // Cardano
    ]
  });
};