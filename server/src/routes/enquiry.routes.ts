import { Router } from "express";
import { requireAuthenticated, requireManager } from "../middleware/session.js";
import { admitEnquiryController, createEnquiryController, getEnquiriesController, updateEnquiryController } from "../controllers/enquiry.controller.js";
export const enquiryRouter = Router();
enquiryRouter.post("/", createEnquiryController);
enquiryRouter.get("/", requireAuthenticated, getEnquiriesController);
// Lecturers can read enquiries and admit them, but not change their status.
enquiryRouter.patch("/:id", requireAuthenticated, requireManager, updateEnquiryController);

enquiryRouter.post("/:id/admit", requireAuthenticated, admitEnquiryController);
