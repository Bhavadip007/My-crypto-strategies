import mongoose from "mongoose";
import { ALLOWED_SYMBOLS } from "../config/symbols.js";

const BotSettingsSchema = new mongoose.Schema({
  botEnabled: {
    type: Boolean,
    default: false
  },

  symbol: {
    type: String,
    default: "ETHUSD",
    enum: ALLOWED_SYMBOLS,
  },

  lotSize: {
    type: Number,
    default: 10
  },

  timeframe: {
    type: String,
    default: "15m"
  }
});

export default mongoose.model(
  "BotSettings",
  BotSettingsSchema
);
