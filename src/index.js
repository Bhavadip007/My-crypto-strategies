import axios from "axios";
import dotenv from "dotenv";
import express from "express";
const app = express();

import { getSignal } from "./strategy.js";
import { placeMarketOrder, placeStopLossOrder, getOpenPosition } from "./delta.js";
import settingsRoutes
from "../routes/settings.routes.js";
import { connectDB } from "../config/db.js";


dotenv.config();

app.use(express.json());

app.use(
  "/api/settings",
  settingsRoutes
);

await connectDB();

app.listen(5000, () => {
  console.log("API running on port 5000");
});

let currentPosition = null;
let lastProcessedCandle = null;

let entryPrice = null;
let trailingStop = null;

const POSITION_SIZE = Number(
  process.env.POSITION_SIZE || 10
);

async function getCandles() {
  const end = Math.floor(Date.now() / 1000);
  const start = end - 200 * 15 * 60;

  const response = await axios.get(
    "https://api.india.delta.exchange/v2/history/candles",
    {
      params: {
        symbol: "ETHUSD",
        resolution: "15m",
        start,
        end,
      },
    },
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

    const latestCandle = candles[candles.length - 1];

    if (latestCandle.time === lastProcessedCandle) {
      console.log(new Date().toISOString(), "No new candle yet...");
      return;
    }

    lastProcessedCandle = latestCandle.time;

    console.log("\n==============================");

    console.log(
      "New Candle:",
      new Date(latestCandle.time * 1000).toISOString(),
    );

    const closes = candles.map((candle) => Number(candle.close));

    const currentPrice = closes[closes.length - 1];

    console.log("Candles:", closes.length);

    console.log("Latest Close:", currentPrice);

    // =========================
    // TRAILING STOP MANAGEMENT
    // =========================

    if (currentPosition === "LONG" && trailingStop !== null) {
      trailingStop = Math.max(trailingStop, currentPrice - 5);

      console.log("LONG Trail:", trailingStop);

      if (currentPrice <= trailingStop) {
        console.log("LONG STOP HIT");

        const exit = await placeMarketOrder("sell", POSITION_SIZE);

        console.dir(exit, {
          depth: null,
        });

        currentPosition = null;
        entryPrice = null;
        trailingStop = null;

        return;
      }
    }

    if (currentPosition === "SHORT" && trailingStop !== null) {
      trailingStop = Math.min(trailingStop, currentPrice + 5);

      console.log("SHORT Trail:", trailingStop);

      if (currentPrice >= trailingStop) {
        console.log("SHORT STOP HIT");

        const exit = await placeMarketOrder("buy", POSITION_SIZE);

        console.dir(exit, {
          depth: null,
        });

        currentPosition = null;
        entryPrice = null;
        trailingStop = null;

        return;
      }
    }

    const signal = getSignal(closes);

    console.log("Signal:", signal);

    console.log("Current Position:", currentPosition);

    // =========================
    // BUY ENTRY
    // =========================

    if (signal === "BUY" && currentPosition !== "LONG") {
      console.log("Opening LONG...");

      const result = await placeMarketOrder("buy", POSITION_SIZE);

      console.dir(result, {
        depth: null,
      });

      currentPosition = "LONG";

      entryPrice = Number(result.result.average_fill_price);

      // Native Delta SL
      const stopPrice = entryPrice - 15;

      await placeStopLossOrder("sell", stopPrice, POSITION_SIZE);

      trailingStop = entryPrice - 15;

      console.log("Entry:", entryPrice);

      console.log("Delta SL:", stopPrice);

      console.log("Initial Trail:", trailingStop);
    }

    // =========================
    // SELL ENTRY
    // =========================

    if (signal === "SELL" && currentPosition !== "SHORT") {
      console.log("Opening SHORT...");

      const result = await placeMarketOrder("sell", POSITION_SIZE);

      console.dir(result, {
        depth: null,
      });

      currentPosition = "SHORT";

      entryPrice = Number(result.result.average_fill_price);

      // Native Delta SL
      const stopPrice = entryPrice + 15;

      await placeStopLossOrder("buy", stopPrice, POSITION_SIZE);

      trailingStop = entryPrice + 15;

      console.log("Entry:", entryPrice);

      console.log("Delta SL:", stopPrice);

      console.log("Initial Trail:", trailingStop);
    }

    console.log("==============================\n");
  } catch (err) {
    console.log("\n========== ERROR ==========");

    if (err.response) {
      console.log("Status:", err.response.status);

      console.dir(err.response.data, { depth: null });
    } else {
      console.log(err);
    }

    console.log("===========================\n");
  }
}

async function syncPosition() {
  try {
    const response =
      await getOpenPosition();

    console.dir(response, {
      depth: null
    });

  } catch (err) {
    console.log(
      "Position Sync Error"
    );

    console.log(
      err.response?.data ||
      err.message
    );
  }
}

async function start() {
  console.log("🚀 MACD Bhavadip Delta Bot Started");

  await syncPosition();

  await run();

  setInterval(run, 30 * 1000);
}

start();