import BotSettings from "../models/BotSettings.js";

export async function getBotSettings() {
  let settings = await BotSettings.findOne();

  if (!settings) {
    settings = await BotSettings.create({});
  }

  return settings;
}