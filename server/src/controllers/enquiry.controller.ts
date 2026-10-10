import type { Request, Response } from "express";
import { ZodError } from "zod";
import { admitEnquiry, EnquiryNotFoundError, createEnquiry, EnquiryConflictError, getEnquiries, updateEnquiryStatus } from "../services/enquiry.service.js";
import { createStudentSchema } from "../validators/student.validator.js";
import { createEnquirySchema, enquiryIdSchema, updateEnquirySchema } from "../validators/enquiry.validator.js";

function sendError(error: unknown, res: Response) {
  if (error instanceof ZodError) { res.status(400).json({ success: false, message: "Please check your enquiry details.", errors: error.flatten().fieldErrors }); return; }
  if (error instanceof EnquiryNotFoundError) { res.status(404).json({ success: false, message: "Enquiry not found." }); return; }
  if (error instanceof EnquiryConflictError) { res.status(409).json({ success: false, message: error.message }); return; }
  if (typeof error === "object" && error !== null && "code" in error && error.code === "P2025") { res.status(404).json({ success: false, message: "Enquiry not found." }); return; }
  console.error("Enquiry request failed:", error);
  res.status(500).json({ success: false, message: "Unable to process your enquiry. Please try again." });
}
export async function createEnquiryController(req: Request, res: Response) {
  try {
    const enquiry = await createEnquiry(createEnquirySchema.parse(req.body));
    // The public response does not disclose other enquiries or internal statuses.
    res.status(201).json({ success: true, message: "Thank you. Your enquiry has been submitted.", data: { id: enquiry.id } });
  } catch (error) { sendError(error, res); }
}
export async function getEnquiriesController(_req: Request, res: Response) {
  try { res.json({ success: true, data: { enquiries: await getEnquiries() } }); } catch (error) { sendError(error, res); }
}
export async function updateEnquiryController(req: Request, res: Response) {
  try {
    const id = enquiryIdSchema.parse(req.params.id);
    const { status } = updateEnquirySchema.parse(req.body);
    res.json({ success: true, data: { enquiry: await updateEnquiryStatus(id, status) } });
  } catch (error) { sendError(error, res); }
}

export async function admitEnquiryController(req: Request, res: Response) {
  try {
    const id = enquiryIdSchema.parse(req.params.id);
    const input = createStudentSchema.parse(req.body);
    res.json({ success: true, data: await admitEnquiry(id, input) });
  } catch (error) { sendError(error, res); }
}
