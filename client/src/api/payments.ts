import type { FeePlan } from "./fees";
export type PaymentMethod = "CASH" | "UPI" | "BANK_TRANSFER" | "CARD";
export type Payment = {
  id: string; requestId: string; receiptNumber: number; feePlanId: string;
  amountPaise: number; method: PaymentMethod; paidAt: string;
  reference: string | null; notes: string | null; createdAt: string; feePlan: FeePlan;
};
export type CreatePaymentInput = {
  requestId: string; feePlanId: string; amountPaise: number; method: PaymentMethod;
  paidAt: string; reference?: string; notes?: string;
};
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
async function request(path: string, input?: CreatePaymentInput) {
  const response = await fetch(`${API_URL}/api/payments${path}`, {
    method: input ? "POST" : "GET", credentials: "include",
    ...(input && { headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) }),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(error?.message ?? "Unable to process payments.");
  }
  return response.json();
}
export async function fetchPayments(): Promise<Payment[]> { return (await request("")).data.payments; }
export async function createPayment(input: CreatePaymentInput): Promise<Payment> { return (await request("", input)).data.payment; }
export const receiptNumber = (payment: Payment) => `LCI-${String(payment.receiptNumber).padStart(6, "0")}`;
