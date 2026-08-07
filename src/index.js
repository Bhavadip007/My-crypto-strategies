import axios from "axios";
import dotenv from "dotenv";

import { getSignal } from "./strategy.js";
import { placeMarketOrder } from "./delta.js";

dotenv.config();

let currentPosition = null;
let lastProcessedCandle = null;

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

  return candles;
}

async function run() {
  try {
    const candles = await getCandles();

    if (!candles.length) {
      console.log("No candles received");
      return;
    }

    const latestCandle =
      candles[candles.length - 1];

    if (
      latestCandle.time ===
      lastProcessedCandle
    ) {
      console.log(
        new Date().toISOString(),
        "No new candle yet..."
      );
      return;
    }

    lastProcessedCandle =
      latestCandle.time;

    console.log(
      "\n=============================="
    );

    console.log(
      "New Candle:",
      new Date(
        latestCandle.time * 1000
      ).toISOString()
    );

    const closes = candles.map(
      candle => Number(candle.close)
    );

    console.log(
      "Candles:",
      closes.length
    );

    console.log(
      "Latest Close:",
      closes[closes.length - 1]
    );

    const signal = getSignal(closes);

    console.log(
      "Signal:",
      signal
    );

    console.log(
      "Current Position:",
      currentPosition
    );

    if (
      signal === "BUY" &&
      currentPosition !== "LONG"
    ) {
      console.log(
        "Opening LONG..."
      );

      const result =
        await placeMarketOrder(
          "buy",
          10
        );

      console.dir(result, {
        depth: null
      });

      currentPosition = "LONG";
    }

    if (
      signal === "SELL" &&
      currentPosition !== "SHORT"
    ) {
      console.log(
        "Opening SHORT..."
      );

      const result =
        await placeMarketOrder(
          "sell",
          10
        );

      console.dir(result, {
        depth: null
      });

      currentPosition = "SHORT";
    }

    console.log(
      "==============================\n"
    );
  } catch (err) {
    console.log(
      "\n========== ERROR =========="
    );

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

    console.log(
      "===========================\n"
    );
  }
}

console.log(
  "🚀 MACDBhav Delta Bot Started"
);

run();

setInterval(
  run,
  30 * 1000
);