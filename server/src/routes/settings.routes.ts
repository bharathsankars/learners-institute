import { Router } from "express";

import {
  getInstituteSettingsController,
  updateInstituteSettingsController,
} from "../controllers/settings.controller.js";

export const settingsRouter =
  Router();

settingsRouter.get(
  "/",
  getInstituteSettingsController,
);

settingsRouter.patch(
  "/",
  updateInstituteSettingsController,
);
