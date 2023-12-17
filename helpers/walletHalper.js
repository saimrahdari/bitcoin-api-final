const CryptoJS = require("crypto-js");
const axios = require("axios");
exports.getCryptoInUsd = async (symbol) => {
  let newSymbol = symbol;

  var _coinList = {};
  let response = null;
  try {
    response = await axios.get(
      `${process.env.COIN_MARKET_CAP_URL}?symbol=${newSymbol}`,
      {
        headers: {
          "X-CMC_PRO_API_KEY": process.env.COIN_MARKET_CAP_API_KEY,
        },
      }
    );
  } catch (ex) {
    response = null;
    console.log(ex);
  }
  if (response) {
    // success
    const json = response.data.data[symbol].quote.USD.price;

    _coinList[symbol] = json;
    console.log(
      "🚀 ~ file: walletHalper.js:26 ~ exports.getCryptoInUsd= ~ _coinList:",
      _coinList
    );
    return _coinList;
  } else {
    _coinList[symbol] = 0;
    return _coinList;
  }
};
