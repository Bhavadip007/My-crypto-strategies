import axios from "axios";
import dotenv from "dotenv";

import { getSignal } from "./strategy.js";
import { placeMarketOrder } from "./delta.js";

dotenv.config();

let currentPosition = null;

async function getCandles() {
  const end = Math.floor(Date.now() / 1000);
  const start = end - (200 * 15 * 60);

  const response = await axios.get(
    "https://api.india.delta.exchange/v2/history/candles",
    {
      params: {
        symbol: "ETHUSD",
        resolution: "15m",
        start,
        end
      }
    }
  );

  const candles = response.data.result.reverse();

  const closes = candles.map(
    candle => Number(candle.close)
  );

  console.log("Candles:", closes.length);
  console.log(
    "Latest Close:",
    closes[closes.length - 1]
  );

  return closes;
}

async function run() {
  try {
    const closes = await getCandles();

    const signal = getSignal(closes);

    console.log(
      new Date().toISOString(),
      "Signal:",
      signal
    );

    if (
      signal === "BUY" &&
      currentPosition !== "LONG"
    ) {
      console.log("Opening LONG");

      await placeMarketOrder(
        "buy",
        10
      );

      currentPosition = "LONG";
    }

    if (
      signal === "SELL" &&
      currentPosition !== "SHORT"
    ) {
      console.log("Opening SHORT");

      await placeMarketOrder(
        "sell",
        10
      );

      currentPosition = "SHORT";
    }
  } catch (err) {
    console.log("========== ERROR ==========");

    if (err.response) {
      console.log(
        "Status:",
        err.response.status
      );

      console.dir(
        err.response.data,
        { depth: null }
      );
    } else {
      console.log(err);
    }

    console.log("===========================");
  }
}

run();

setInterval(
  run,
  15 * 60 * 1000
);