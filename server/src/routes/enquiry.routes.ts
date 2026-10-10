import { Router } from "express";
import { requireAuthenticated } from "../middleware/session.js";
import { admitEnquiryController, createEnquiryController, getEnquiriesController, updateEnquiryController } from "../controllers/enquiry.controller.js";
export const enquiryRouter = Router();
enquiryRouter.post("/", createEnquiryController);
enquiryRouter.get("/", requireAuthenticated, getEnquiriesController);
enquiryRouter.patch("/:id", requireAuthenticated, updateEnquiryController);

enquiryRouter.post("/:id/admit", requireAuthenticated, admitEnquiryController);
