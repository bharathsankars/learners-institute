import { Router } from "express";

import { getActivityController, getExportController } from "../controllers/tools.controller.js";

// Mounted behind requireSuperAdmin in app.ts.
export const activityRouter = Router();
activityRouter.get("/", getActivityController);

export const exportRouter = Router();
exportRouter.get("/:dataset", getExportController);
