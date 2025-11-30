// return hardcoded coins, no API calls at all
export const getSupportedCoins = async (req, res) => {
  return res.json({
    success: true,
    coins: [
      "btc", "eth", "usdttrc20", "xrp", "bnb", "sol", "ltc", "doge", "bch", "trx",
      "ada", "dot", "matic", "avax", "xlm", "xmr", "vet", "algo", "atom", "icp",
      "fil", "hbar", "near", "grt", "ftm", "cro", "sand", "mana", "enj", "gala",
      "ape", "qnt", "zil", "dcr", "ksm", "luna", "dai", "shib", "floki", "pepe",
      "inj", "rndr", "imx", "sushi", "comp", "link", "uni", "aave", "snx",
      "1inch", "crv", "yfi", "bal", "ldo", "op", "arb", "sei", "apt", "ton",
      "btt", "hot", "sc", "rvn", "zen", "omg", "iost", "waves", "dash", "zec"
    ]
  });
};