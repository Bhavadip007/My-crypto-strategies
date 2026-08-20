import axios from "axios";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
const app = express();

import { getSignal } from "./strategy.js";
import { placeMarketOrder, getOpenPosition } from "./delta.js";
import settingsRoutes from "../routes/settings.routes.js";
import { getBotSettings } from "../services/settings.service.js";
import { connectDB } from "../config/db.js";
import { setSignalState } from "./signal-state.js";

dotenv.config();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({ ok: true, service: "macd-bhavadip-bot" });
});

app.use("/api/settings", settingsRoutes);

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`API running on port ${PORT}`);
});

connectDB().catch((err) => {
  console.error("MongoDB is not connected yet:", err.message);
});

let currentPosition = null;
let lastExecutedSignal = null;
let lastClosedCandleTime = null;
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

  const seconds = timeframeMap[timeframe];
  const end = Math.floor(Date.now() / 1000);
  const start = end - 500 * seconds;

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

async function executeSignal(signal, settings) {
  if (signal === "BUY" && currentPosition !== "LONG") {
    isProcessingOrder = true;

    try {
      if (currentPosition === "SHORT") {
        console.log("Closing SHORT...");
        await placeMarketOrder("buy", settings.lotSize, settings.symbol);
        currentPosition = null;
        console.log("SHORT Closed");
      }

      console.log("Opening LONG on hist crossover...");

      const result = await placeMarketOrder(
        "buy",
        settings.lotSize,
        settings.symbol,
      );

      currentPosition = "LONG";
      lastExecutedSignal = "BUY";

      console.log("LONG ENTRY");
      console.dir(result, { depth: null });
      return true;
    } finally {
      isProcessingOrder = false;
    }
  }

  if (signal === "SELL" && currentPosition !== "SHORT") {
    isProcessingOrder = true;

    try {
      if (currentPosition === "LONG") {
        console.log("Closing LONG...");
        await placeMarketOrder("sell", settings.lotSize, settings.symbol);
        currentPosition = null;
        console.log("LONG Closed");
      }

      console.log("Opening SHORT on hist crossover...");

      const result = await placeMarketOrder(
        "sell",
        settings.lotSize,
        settings.symbol,
      );

      currentPosition = "SHORT";
      lastExecutedSignal = "SELL";

      console.log("SHORT ENTRY");
      console.dir(result, { depth: null });
      return true;
    } finally {
      isProcessingOrder = false;
    }
  }

  return false;
}

async function run() {
  try {
    await syncPosition();

    const settings = await getBotSettings();

    if (!settings.botEnabled) {
      setSignalState({ waitingFor: "bot enable", position: currentPosition });
      console.log("Bot Disabled");
      return;
    }

    if (isProcessingOrder) {
      console.log("Order already in progress...");
      return;
    }

    if (activeSymbol !== settings.symbol) {
      console.log(
        `Currency changed to ${settings.symbol}. Waiting for next candle close.`,
      );
      lastExecutedSignal = null;
      lastClosedCandleTime = null;
      currentPosition = null;
      activeSymbol = settings.symbol;
      await syncPosition();
    }

    const candles = await getCandles(settings.symbol, settings.timeframe);

    if (candles.length < 50) {
      console.log("Not enough candles received");
      return;
    }

    // Ignore the forming candle. Pine alerts fire once per bar close.
    const closedCandles = candles.slice(0, -1);
    const latestClosed = closedCandles[closedCandles.length - 1];
    const closedCloses = closedCandles.map((candle) => Number(candle.close));
    const { signal, histPrev, histCurr } = getSignal(closedCloses);

    setSignalState({
      signal,
      histPrev,
      histCurr,
      candleTime: latestClosed.time,
      symbol: settings.symbol,
      timeframe: settings.timeframe,
      position: currentPosition,
      waitingFor:
        lastClosedCandleTime === latestClosed.time
          ? "next candle close"
          : "signal check",
    });

    console.log("\n==============================");
    console.log("Time:", new Date().toISOString());
    console.log("Symbol:", settings.symbol);
    console.log(
      "Closed candle:",
      new Date(latestClosed.time * 1000).toISOString(),
    );
    console.log("Closed close:", closedCloses[closedCloses.length - 1]);
    console.log("Hist prev:", histPrev);
    console.log("Hist curr:", histCurr);
    console.log("Signal:", signal);
    console.log("Current Position:", currentPosition);

    if (lastClosedCandleTime === null) {
      lastClosedCandleTime = latestClosed.time;
      console.log("Armed on current closed candle. Waiting for next close...");
      console.log("==============================\n");
      return;
    }

    if (latestClosed.time === lastClosedCandleTime) {
      console.log("Waiting for candle close...");
      console.log("==============================\n");
      return;
    }

    if (signal === "HOLD") {
      lastClosedCandleTime = latestClosed.time;
      console.log("Candle closed. No crossover.");
      console.log("==============================\n");
      return;
    }

    if (lastExecutedSignal === signal) {
      lastClosedCandleTime = latestClosed.time;
      console.log("Same side as current trade. Skip.");
      console.log("==============================\n");
      return;
    }

    const placed = await executeSignal(signal, settings);

    if (placed) {
      lastClosedCandleTime = latestClosed.time;
    } else {
      lastClosedCandleTime = latestClosed.time;
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
