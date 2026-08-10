import axios from "axios";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
const app = express();

import { getSignal } from "./strategy.js";
import {
  placeMarketOrder,
  placeStopLossOrder,
  getOpenPosition,
} from "./delta.js";
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
let isProcessingOrder = false;

let entryPrice = null;
let trailingStop = null;

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

  const candles = response.data.result;

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

    const candles = await getCandles(settings.symbol, settings.timeframe);

    if (!candles.length) {
      console.log("No candles received");
      return;
    }

    console.log("\n==============================");

    const closes = candles.map((candle) => Number(candle.close));

    const currentPrice = closes[closes.length - 1];


    // =========================
    // TRAILING STOP MANAGEMENT
    // =========================

    if (currentPosition === "LONG" && trailingStop !== null) {
      trailingStop = Math.max(
        trailingStop,
        currentPrice - settings.trailingStop,
      );

      console.log("LONG Trail:", trailingStop);

      if (currentPrice <= trailingStop) {
        console.log("LONG STOP HIT");

        const exit = await placeMarketOrder("sell", settings.lotSize, settings.symbol);

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
      trailingStop = Math.min(
        trailingStop,
        currentPrice + settings.trailingStop,
      );

      console.log("SHORT Trail:", trailingStop);

      if (currentPrice >= trailingStop) {
        console.log("SHORT STOP HIT");

        const exit = await placeMarketOrder("buy", settings.lotSize, settings.symbol);

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

    console.log("Current Position:", currentPosition);

    // =========================
    // BUY ENTRY
    // =========================

// =========================
// BUY ENTRY
// =========================

if (
  signal === "BUY" &&
  currentPosition !== "LONG" &&
  !isProcessingOrder
) {
  isProcessingOrder = true;

  try {
    // Close SHORT first
    if (currentPosition === "SHORT") {
      console.log("Closing SHORT...");

      await placeMarketOrder(
        "buy",
        settings.lotSize,
        settings.symbol
      );

      currentPosition = null;

      console.log("SHORT Closed");
    }

    console.log("Opening LONG...");

    const result = await placeMarketOrder(
      "buy",
      settings.lotSize,
      settings.symbol
    );

    currentPosition = "LONG";

    entryPrice = Number(
      result.result.average_fill_price
    );

    const stopPrice =
      entryPrice - settings.stopLoss;

    try {
      await placeStopLossOrder(
        "sell",
        stopPrice,
        settings.lotSize,
        settings.symbol
      );

      console.log(
        "LONG Stop Loss Created:",
        stopPrice
      );
    } catch (err) {
      console.log(
        "LONG SL Creation Failed"
      );
    }

    trailingStop = stopPrice;

    console.log("LONG ENTRY:", entryPrice);
    console.log("LONG TRAIL:", trailingStop);

  } finally {
    isProcessingOrder = false;
  }
}
    // =========================
    // SELL ENTRY
    // =========================

// =========================
// SELL ENTRY
// =========================

if (
  signal === "SELL" &&
  currentPosition !== "SHORT" &&
  !isProcessingOrder
) {
  isProcessingOrder = true;

  try {
    // Close LONG first
    if (currentPosition === "LONG") {
      console.log("Closing LONG...");

      await placeMarketOrder(
        "sell",
        settings.lotSize,
        settings.symbol
      );

      currentPosition = null;

      console.log("LONG Closed");
    }

    console.log("Opening SHORT...");

    const result = await placeMarketOrder(
      "sell",
      settings.lotSize,
      settings.symbol
    );

    currentPosition = "SHORT";

    entryPrice = Number(
      result.result.average_fill_price
    );

    const stopPrice =
      entryPrice + settings.stopLoss;

    try {
      await placeStopLossOrder(
        "buy",
        stopPrice,
        settings.lotSize,
        settings.symbol
      );

      console.log(
        "SHORT Stop Loss Created:",
        stopPrice
      );
    } catch (err) {
      console.log(
        "SHORT SL Creation Failed"
      );
    }

    trailingStop = stopPrice;

    console.log("SHORT ENTRY:", entryPrice);
    console.log("SHORT TRAIL:", trailingStop);

  } finally {
    isProcessingOrder = false;
  }
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
    const response = await getOpenPosition();

   const settings =
  await getBotSettings();

const position =
  response.result?.find(
    p =>
      p.product_symbol === settings.symbol &&
      Number(p.size) !== 0
  );

    if (!position) {
  currentPosition = null;
  entryPrice = null;
  trailingStop = null;

  return;
}

    currentPosition =
  Number(position.size) > 0
    ? "LONG"
    : "SHORT";

    entryPrice =
  Number(position.entry_price);

  if (trailingStop === null) {
  trailingStop =
    currentPosition === "LONG"
      ? entryPrice - settings.stopLoss
      : entryPrice + settings.stopLoss;
}

console.log(
  "Synced Position:",
  currentPosition
);

console.log(
  "Entry Price:",
  entryPrice
);

console.log(
  "Trailing Stop:",
  trailingStop
);

  } catch (err) {
  console.dir(err.response?.data, { depth: null });
}
}

async function start() {
  console.log("🚀 MACD Bhavadip Delta Bot Started");
  setInterval(async () => {
  await run();
}, 10 * 1000);
}

start();
