import BotSettings from "../models/BotSettings.js";
import { ALLOWED_SYMBOLS, isAllowedSymbol } from "../config/symbols.js";

export const getSymbols = (req, res) => {
  res.json({ symbols: ALLOWED_SYMBOLS });
};

export const getSettings = async (req, res) => {
  let settings = await BotSettings.findOne();

  if (!settings) {
    settings = await BotSettings.create({});
  }

  res.json(settings);
};

export const updateSettings = async (req, res) => {
  const { symbol } = req.body;

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

  settings = await BotSettings.findByIdAndUpdate(settings._id, req.body, {
    new: true,
    runValidators: true,
  });

  res.json(settings);
};