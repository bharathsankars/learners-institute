import { Router } from "express";

import {
  createAdminUserController,
  deleteAdminUserController,
  getAdminUsersController,
  updateAdminUserController,
} from "../controllers/admin-user.controller.js";

import {
  requireSuperAdmin,
} from "../middleware/session.js";

export const adminUserRouter =
  Router();

// Every endpoint below is
// SUPER_ADMIN only.
adminUserRouter.use(
  requireSuperAdmin,
);

adminUserRouter.get(
  "/",
  getAdminUsersController,
);

adminUserRouter.post(
  "/",
  createAdminUserController,
);

adminUserRouter.patch(
  "/:id",
  updateAdminUserController,
);

adminUserRouter.delete(
  "/:id",
  deleteAdminUserController,
);
