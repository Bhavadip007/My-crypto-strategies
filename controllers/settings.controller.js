import BotSettings from "../models/BotSettings.js";
import { ALLOWED_SYMBOLS, isAllowedSymbol } from "../config/symbols.js";
import { signalState } from "../src/signal-state.js";

export const getSymbols = (req, res) => {
  res.json({ symbols: ALLOWED_SYMBOLS });
};

export const getSignalStatus = (req, res) => {
  res.json(signalState);
};

export const getSettings = async (req, res) => {
  try {
    let settings = await BotSettings.findOne();

    if (!settings) {
      settings = await BotSettings.create({});
    }

    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to load settings" });
  }
};

function toBoolean(value) {
  if (value === true || value === "true" || value === 1 || value === "1") {
    return true;
  }

  if (value === false || value === "false" || value === 0 || value === "0") {
    return false;
  }

  return null;
}

export const updateSettings = async (req, res) => {
  try {
    const body = req.body || {};
    const symbol = typeof body.symbol === "string" ? body.symbol.trim() : "";
    const botEnabled = toBoolean(body.botEnabled);
    const lotSize = Number(body.lotSize);
    const timeframe =
      typeof body.timeframe === "string" ? body.timeframe.trim() : "";

    if (symbol && !isAllowedSymbol(symbol)) {
      return res.status(400).json({
        error: "Unsupported currency pair",
        allowedSymbols: ALLOWED_SYMBOLS,
      });
    }

    let settings = await BotSettings.findOne();

    if (!settings) {
      settings = await BotSettings.create({});
    }

    const update = {};

    if (botEnabled !== null) {
      update.botEnabled = botEnabled;
    }

    if (symbol) {
      update.symbol = symbol;
    }

    if (Number.isFinite(lotSize) && lotSize > 0) {
      update.lotSize = lotSize;
    }

    if (timeframe) {
      update.timeframe = timeframe;
    }

    settings = await BotSettings.findByIdAndUpdate(settings._id, update, {
      returnDocument: "after",
      runValidators: true,
    });

    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Failed to save settings" });
  }
};
