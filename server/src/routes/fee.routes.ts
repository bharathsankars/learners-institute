import { Router } from "express";

import {
  cancelFeePlanController,
  createFeePlanController,
  getFeePlanByIdController,
  getFeePlansController,
  updateFeePlanController,
} from "../controllers/fee.controller.js";

export const feeRouter = Router();

feeRouter.get("/", getFeePlansController);
feeRouter.get("/:id", getFeePlanByIdController);

feeRouter.post("/", createFeePlanController);
feeRouter.patch("/:id", updateFeePlanController);
feeRouter.patch("/:id/cancel", cancelFeePlanController);
