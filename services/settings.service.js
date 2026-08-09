import BotSettings
from "../models/BotSettings.js";

export async function
getBotSettings() {

  return await BotSettings.findOne();
}