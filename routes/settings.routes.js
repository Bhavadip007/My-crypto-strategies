import express from "express";

import {
  getSettings,
  updateSettings,
  getSymbols,
  getSignalStatus,
} from "../controllers/settings.controller.js";

const router = express.Router();

router.get("/symbols", getSymbols);

router.get("/signal", getSignalStatus);

router.get("/", getSettings);

router.put("/", updateSettings);

export default router;