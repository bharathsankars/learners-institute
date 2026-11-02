import type { FeePlan } from "../../api/fees";
import type { Payment, PaymentMethod } from "../../api/payments";

type Money = Pick<FeePlan, "totalFeePaise" | "discountPaise" | "payments">;

// Same rules as the API helpers, kept here so this module stays pure.
export function paidAmount(plan: Pick<FeePlan, "payments">): number {
  return plan.payments.reduce((sum, payment) => sum + payment.amountPaise, 0);
}

export function outstandingBalance(plan: Money): number {
  return Math.max(0, plan.totalFeePaise - plan.discountPaise - paidAmount(plan));
}

// Dates at the institute are Indian time.
export function instituteToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(now);
}

export type FeeState = "OVERDUE" | "DUE" | "PAID" | "CANCELLED";
export type FeeFilter = "ALL" | "OUTSTANDING" | "OVERDUE" | "PAID" | "CANCELLED";
export type FeeSort = "DUE" | "BALANCE" | "NEWEST" | "NAME";

export const paymentMethodLabels: Record<PaymentMethod, string> = {
  CASH: "Cash",
  UPI: "UPI",
  BANK_TRANSFER: "Bank transfer",
  CARD: "Card",
};

export function effectiveFee(plan: Pick<FeePlan, "totalFeePaise" | "discountPaise">): number {
  return Math.max(0, plan.totalFeePaise - plan.discountPaise);
}

export function feeState(plan: FeePlan, today = instituteToday()): FeeState {
  if (plan.status === "CANCELLED") return "CANCELLED";
  if (outstandingBalance(plan) === 0) return "PAID";
  if (plan.dueDate && plan.dueDate.slice(0, 10) < today) return "OVERDUE";

  return "DUE";
}

export function studentFullName(student: { firstName: string; lastName: string | null }): string {
  return [student.firstName, student.lastName].filter(Boolean).join(" ");
}

export function feeCounts(plans: FeePlan[], today = instituteToday()) {
  const counts = { ALL: plans.length, OUTSTANDING: 0, OVERDUE: 0, PAID: 0, CANCELLED: 0 };

  for (const plan of plans) {
    const state = feeState(plan, today);

    if (state === "OVERDUE") counts.OVERDUE++;
    if (state === "OVERDUE" || state === "DUE") counts.OUTSTANDING++;
    if (state === "PAID") counts.PAID++;
    if (state === "CANCELLED") counts.CANCELLED++;
  }

  return counts;
}

export function feeTotals(plans: FeePlan[], today = instituteToday()) {
  const active = plans.filter((plan) => plan.status === "ACTIVE");
  const overdue = active.filter((plan) => feeState(plan, today) === "OVERDUE");

  return {
    billed: active.reduce((sum, plan) => sum + effectiveFee(plan), 0),
    // Collections count even on plans cancelled later.
    collected: plans.reduce((sum, plan) => sum + paidAmount(plan), 0),
    outstanding: active.reduce((sum, plan) => sum + outstandingBalance(plan), 0),
    overdue: overdue.reduce((sum, plan) => sum + outstandingBalance(plan), 0),
    overdueCount: overdue.length,
  };
}

export function filterFeePlans(
  plans: FeePlan[],
  criteria: { search: string; filter: FeeFilter; sort: FeeSort },
  today = instituteToday(),
): FeePlan[] {
  const search = criteria.search.trim().toLowerCase();

  return plans
    .filter((plan) => {
      const state = feeState(plan, today);
      const { student, course } = plan.enrollment;
      const matchesFilter =
        criteria.filter === "ALL" ||
        (criteria.filter === "OUTSTANDING" ? state === "DUE" || state === "OVERDUE" : state === criteria.filter);

      return (
        matchesFilter &&
        (!search ||
          `${studentFullName(student)} ${student.admissionNumber} ${student.phone} ${course.title}`
            .toLowerCase()
            .includes(search))
      );
    })
    .sort((a, b) => {
      if (criteria.sort === "BALANCE") return outstandingBalance(b) - outstandingBalance(a);
      if (criteria.sort === "NEWEST") return b.createdAt.localeCompare(a.createdAt);
      if (criteria.sort === "NAME") {
        return studentFullName(a.enrollment.student).localeCompare(studentFullName(b.enrollment.student), "en", { sensitivity: "base" });
      }

      // Soonest due first; plans without a due date after, then by name.
      const dueA = a.dueDate ?? "9999";
      const dueB = b.dueDate ?? "9999";

      return dueA.localeCompare(dueB) || studentFullName(a.enrollment.student).localeCompare(studentFullName(b.enrollment.student));
    });
}

export type PaymentPeriod = "ALL" | "TODAY" | "MONTH";

export function paymentTotals(payments: Payment[], today = instituteToday()) {
  const sum = (list: Payment[]) => list.reduce((total, payment) => total + payment.amountPaise, 0);
  const todays = payments.filter((payment) => payment.paidAt.slice(0, 10) === today);
  const months = payments.filter((payment) => payment.paidAt.slice(0, 7) === today.slice(0, 7));

  return {
    today: sum(todays),
    todayCount: todays.length,
    month: sum(months),
    monthCount: months.length,
    all: sum(payments),
    allCount: payments.length,
  };
}

export function filterPayments(
  payments: Payment[],
  criteria: { search: string; period: PaymentPeriod; method: PaymentMethod | "" },
  today = instituteToday(),
): Payment[] {
  const search = criteria.search.trim().toLowerCase();

  return payments.filter((payment) => {
    const day = payment.paidAt.slice(0, 10);
    const { student, course } = payment.feePlan.enrollment;
    const receipt = `LCI-${String(payment.receiptNumber).padStart(6, "0")}`.toLowerCase();

    return (
      (criteria.period === "ALL" || (criteria.period === "TODAY" ? day === today : day.slice(0, 7) === today.slice(0, 7))) &&
      (!criteria.method || payment.method === criteria.method) &&
      (!search ||
        `${studentFullName(student)} ${student.admissionNumber} ${course.title} ${receipt} ${payment.reference ?? ""}`
          .toLowerCase()
          .includes(search))
    );
  });
}

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function belowHundred(value: number): string {
  return value < 20 ? ONES[value]! : `${TENS[Math.floor(value / 10)]}${value % 10 ? ` ${ONES[value % 10]}` : ""}`;
}

function belowThousand(value: number): string {
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;

  return [hundreds && `${ONES[hundreds]} Hundred`, rest && belowHundred(rest)].filter(Boolean).join(" ");
}

// 452050 paise -> "Rupees Four Thousand Five Hundred Twenty and Fifty Paise Only",
// using the Indian crore / lakh / thousand grouping.
export function amountInWords(paise: number): string {
  const rupees = Math.floor(paise / 100);
  const remainder = paise % 100;

  const parts: string[] = [];
  const crore = Math.floor(rupees / 10_000_000);
  const lakh = Math.floor((rupees % 10_000_000) / 100_000);
  const thousand = Math.floor((rupees % 100_000) / 1000);
  const rest = rupees % 1000;

  if (crore) parts.push(`${belowThousand(crore)} Crore`);
  if (lakh) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand) parts.push(`${belowHundred(thousand)} Thousand`);
  if (rest) parts.push(belowThousand(rest));

  const words = parts.join(" ") || "Zero";

  return `Rupees ${words}${remainder ? ` and ${belowHundred(remainder)} Paise` : ""} Only`;
}
