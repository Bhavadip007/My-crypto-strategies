import express from "express";

import {
  getSettings,
  updateSettings
} from "../controllers/settings.controller.js";

const router = express.Router();

router.get("/", getSettings);

router.put("/", updateSettings);

export default router;