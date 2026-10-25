import {
  Router,
} from "express";

import {
  completeSuperAdminPasswordResetController,
  createTemporaryRecoveryPasswordController,
  getRecoverySuperAdminController,
  recoveryLoginController,
  verifyTemporaryRecoveryPasswordController,
} from "../controllers/recovery.controller.js";

import {
  requireRecoveryAdmin,
} from "../middleware/session.js";

export const recoveryRouter =
  Router();

/*
 * Dedicated Recovery Admin login.
 */
recoveryRouter.post(
  "/login",
  recoveryLoginController,
);

/*
 * Public password-recovery endpoints.
 *
 * The temporary password itself is
 * the credential required here.
 */
recoveryRouter.post(
  "/verify-temporary-password",
  verifyTemporaryRecoveryPasswordController,
);

recoveryRouter.patch(
  "/complete-password-reset",
  completeSuperAdminPasswordResetController,
);

/*
 * Everything below requires the
 * Recovery Administrator account.
 */
recoveryRouter.use(
  requireRecoveryAdmin,
);

recoveryRouter.get(
  "/super-admin",
  getRecoverySuperAdminController,
);

recoveryRouter.post(
  "/temporary-password",
  createTemporaryRecoveryPasswordController,
);
