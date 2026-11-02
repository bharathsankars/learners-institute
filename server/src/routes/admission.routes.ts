import { Router } from "express";
import { requireAuthenticated } from "../middleware/session.js";

import { createAdmissionController } from "../controllers/admission.controller.js";

export const admissionRouter = Router();

// One-step admission. Every signed-in role can admit students; fees are
// checked per request. Admitted students are listed by GET /api/students.
admissionRouter.use(requireAuthenticated);

admissionRouter.post("/", createAdmissionController);
