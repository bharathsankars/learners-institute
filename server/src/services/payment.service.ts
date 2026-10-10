import { prisma } from "../config/database.js";
import type { CreatePaymentInput } from "../validators/payment.validator.js";
export class PaymentError extends Error {
  constructor(message: string, public status = 409) { super(message); }
}
const include = { feePlan: { include: { enrollment: { include: { student: true, course: true } } } } };
export const getPayments = () => prisma.payment.findMany({ include, orderBy: { receiptNumber: "desc" } });
export async function createPayment(input: CreatePaymentInput) {
  return prisma.$transaction(async tx => {
    // Serialize collections and fee edits for the same plan.
    await tx.$queryRaw`SELECT id FROM fee_plans WHERE id = ${input.feePlanId}::uuid FOR UPDATE`;
    const existing = await tx.payment.findUnique({ where: { requestId: input.requestId }, include });
    if (existing) {
      if (existing.feePlanId !== input.feePlanId || existing.amountPaise !== input.amountPaise || existing.method !== input.method || existing.paidAt.toISOString().slice(0, 10) !== input.paidAt || (existing.reference ?? "") !== (input.reference ?? "") || (existing.notes ?? "") !== (input.notes ?? "")) throw new PaymentError("This submission ID was already used for another payment.");
      return existing;
    }
    const plan = await tx.feePlan.findUnique({ where: { id: input.feePlanId } });
    if (!plan) throw new PaymentError("Fee plan not found.", 404);
    if (plan.status !== "ACTIVE") throw new PaymentError("Payments cannot be recorded against cancelled fee plans.");
    const total = await tx.payment.aggregate({ where: { feePlanId: plan.id }, _sum: { amountPaise: true } });
    const balance = plan.totalFeePaise - plan.discountPaise - (total._sum.amountPaise ?? 0);
    if (input.amountPaise > balance) throw new PaymentError("Payment exceeds the outstanding balance. Refresh and try again.");
    return tx.payment.create({ data: { ...input, reference: input.reference ?? null, notes: input.notes ?? null, paidAt: new Date(`${input.paidAt}T00:00:00.000Z`) }, include });
  });
}
