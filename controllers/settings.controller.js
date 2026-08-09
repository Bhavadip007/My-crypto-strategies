import BotSettings from "../models/BotSettings.js";

export const getSettings =
async (req, res) => {

  let settings =
    await BotSettings.findOne();

  if (!settings) {
    settings =
      await BotSettings.create({});
  }

  res.json(settings);
};

export const updateSettings =
async (req, res) => {

  let settings =
    await BotSettings.findOne();

  settings =
    await BotSettings.findByIdAndUpdate(
      settings._id,
      req.body,
      { new: true }
    );

  res.json(settings);
};