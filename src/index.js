import axios from "axios";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
const app = express();

import { getSignal, resetSignalState } from "./strategy.js";
import { placeMarketOrder, getOpenPosition } from "./delta.js";
import settingsRoutes from "../routes/settings.routes.js";
import { getBotSettings } from "../services/settings.service.js";
import { connectDB } from "../config/db.js";

dotenv.config();

app.use(express.json());

app.use(cors());

app.use("/api/settings", settingsRoutes);

await connectDB();

app.listen(5000, () => {
  console.log("API running on port 5000");
});

let currentPosition = null;
let lastExecutedSignal = null;
let isProcessingOrder = false;
let activeSymbol = null;

async function getCandles(symbol, timeframe) {
  const timeframeMap = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "30m": 1800,
    "1h": 3600,
    "4h": 14400,
  };

  const end = Math.floor(Date.now() / 1000);
  const start = end - 200 * timeframeMap[timeframe];

  const response = await axios.get(
    "https://api.india.delta.exchange/v2/history/candles",
    {
      params: {
        symbol,
        resolution: timeframe,
        start,
        end,
      },
    },
  );

  const candles = (response.data.result || [])
    .slice()
    .sort((a, b) => a.time - b.time);

  return candles;
}

async function run() {
  try {
    await syncPosition();

    const settings = await getBotSettings();

    if (!settings.botEnabled) {
      console.log("Bot Disabled");
      return;
    }

    if (isProcessingOrder) {
      console.log("Order already in progress...");
      return;
    }

    if (activeSymbol !== settings.symbol) {
      console.log(
        `Currency changed to ${settings.symbol}. New orders will use this pair from now.`,
      );
      resetSignalState();
      lastExecutedSignal = null;
      currentPosition = null;
      activeSymbol = settings.symbol;
      await syncPosition();
    }

    const candles = await getCandles(settings.symbol, settings.timeframe);

    if (!candles.length) {
      console.log("No candles received");
      return;
    }

    const closes = candles.map((candle) => Number(candle.close));
    const signal = getSignal(closes);

    console.log("\n==============================");
    console.log("Time:", new Date().toISOString());
    console.log("Symbol:", settings.symbol);
    console.log("Latest Close:", closes[closes.length - 1]);
    console.log("Signal:", signal);
    console.log("Current Position:", currentPosition);
    console.log("Last Executed Signal:", lastExecutedSignal);

    if (signal === "HOLD") {
      console.log("No new signal yet. Waiting...");
      console.log("==============================\n");
      return;
    }

    if (
      signal === "BUY" &&
      lastExecutedSignal !== "BUY" &&
      currentPosition !== "LONG"
    ) {
      isProcessingOrder = true;

      try {
        if (currentPosition === "SHORT") {
          console.log("Closing SHORT...");
          await placeMarketOrder("buy", settings.lotSize, settings.symbol);
          currentPosition = null;
          console.log("SHORT Closed");
        }

        console.log("Opening LONG on crossover...");

        const result = await placeMarketOrder(
          "buy",
          settings.lotSize,
          settings.symbol,
        );

        currentPosition = "LONG";
        lastExecutedSignal = "BUY";

        console.log("LONG ENTRY");
        console.dir(result, { depth: null });
      } finally {
        isProcessingOrder = false;
      }
    }

    // SELL only on a new bearish crossover, once
    if (
      signal === "SELL" &&
      lastExecutedSignal !== "SELL" &&
      currentPosition !== "SHORT"
    ) {
      isProcessingOrder = true;

      try {
        if (currentPosition === "LONG") {
          console.log("Closing LONG...");
          await placeMarketOrder("sell", settings.lotSize, settings.symbol);
          currentPosition = null;
          console.log("LONG Closed");
        }

        console.log("Opening SHORT on crossover...");

        const result = await placeMarketOrder(
          "sell",
          settings.lotSize,
          settings.symbol,
        );

        currentPosition = "SHORT";
        lastExecutedSignal = "SELL";

        console.log("SHORT ENTRY");
        console.dir(result, { depth: null });
      } finally {
        isProcessingOrder = false;
      }
    }

    console.log("==============================\n");
  } catch (err) {
    isProcessingOrder = false;

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
    const response = await getOpenPosition();
    const settings = await getBotSettings();

    const position = response.result?.find(
      (p) => p.product_symbol === settings.symbol && Number(p.size) !== 0,
    );

    if (!position) {
      currentPosition = null;
      return;
    }

    currentPosition = Number(position.size) > 0 ? "LONG" : "SHORT";
    lastExecutedSignal = currentPosition === "LONG" ? "BUY" : "SELL";

    console.log("Synced Position:", currentPosition);
  } catch (err) {
    console.dir(err.response?.data, { depth: null });
  }
}

async function start() {
  console.log("🚀 MACD Bhavadip Delta Bot Started");

  setInterval(run, 10 * 1000);
}

start();
