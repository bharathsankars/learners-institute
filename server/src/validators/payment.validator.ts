import { z } from "zod";
export const createPaymentSchema = z.object({
  requestId: z.string().uuid(),
  feePlanId: z.string().uuid(),
  amountPaise: z.number().int().positive().max(2147483647),
  method: z.enum(["CASH", "UPI", "BANK_TRANSFER", "CARD"]),
  paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }, "Enter a valid payment date."),
  reference: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type CreatePaymentInput = z.infer<typeof createPaymentSchema>;
