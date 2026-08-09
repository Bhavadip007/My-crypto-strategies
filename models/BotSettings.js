import mongoose from "mongoose";

const BotSettingsSchema = new mongoose.Schema({
  botEnabled: {
    type: Boolean,
    default: false
  },

  symbol: {
    type: String,
    default: "ETHUSD"
  },

  lotSize: {
    type: Number,
    default: 10
  },

  stopLoss: {
    type: Number,
    default: 15
  },

  trailingStop: {
    type: Number,
    default: 5
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