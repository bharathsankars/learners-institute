import { logActivity } from "../services/activity.service.js";
import { Router } from "express";
import { ZodError } from "zod";
import { createPayment, getPayments, PaymentError } from "../services/payment.service.js";
import { createPaymentSchema } from "../validators/payment.validator.js";
export const paymentRouter = Router();
paymentRouter.get("/", async (_req, res, next) => {
  try { res.json({ success: true, data: { payments: await getPayments() } }); } catch (error) { next(error); }
});
paymentRouter.post("/", async (req, res, next) => {
  try {
    const payment = await createPayment(createPaymentSchema.parse(req.body));
    await logActivity(res, () => ({ action: "payment.recorded", entityType: "payment", entityId: payment.id, summary: `Recorded ₹${(payment.amountPaise / 100).toLocaleString("en-IN")} from ${payment.feePlan.enrollment.student.firstName} (receipt LCI-${String(payment.receiptNumber).padStart(6, "0")})` }));
    res.status(201).json({ success: true, data: { payment } });
  } catch (error) {
    if (error instanceof ZodError) { res.status(400).json({ success: false, message: "Invalid payment data.", errors: error.flatten().fieldErrors }); return; }
    if (error instanceof PaymentError) { res.status(error.status).json({ success: false, message: error.message }); return; }
    next(error);
  }
});
