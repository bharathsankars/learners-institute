type FeeRecord = {
  totalFeePaise: number;
  discountPaise: number;
  payments: { amountPaise: number }[];
  status: string;
  dueDate: string | null;
};

const dashboardDateFormatter = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" });
export function dashboardDateKey(date: Date): string {
  const parts = dashboardDateFormatter.formatToParts(date);
  return ["year", "month", "day"].map(type => parts.find(part => part.type === type)?.value).join("-");
}
export function feeBalance(plan: FeeRecord): number {
  return Math.max(0, plan.totalFeePaise - plan.discountPaise - plan.payments.reduce((sum, payment) => sum + payment.amountPaise, 0));
}
export function isOverdue(plan: FeeRecord, today: string): boolean {
  return plan.status === "ACTIVE" && !!plan.dueDate && plan.dueDate.slice(0, 10) < today && feeBalance(plan) > 0;
}
export function financialSummary(plans: FeeRecord[], today: string) {
  const active = plans.filter(plan => plan.status === "ACTIVE");
  const effective = active.reduce((sum, plan) => sum + Math.max(0, plan.totalFeePaise - plan.discountPaise), 0);
  const paid = active.reduce((sum, plan) => sum + plan.payments.reduce((total, payment) => total + payment.amountPaise, 0), 0);
  return {
    collected: plans.reduce((sum, plan) => sum + plan.payments.reduce((total, payment) => total + payment.amountPaise, 0), 0),
    outstanding: active.reduce((sum, plan) => sum + feeBalance(plan), 0),
    overdue: active.filter(plan => isOverdue(plan, today)).reduce((sum, plan) => sum + feeBalance(plan), 0),
    effective,
    collectionPercent: effective > 0 ? Math.min(100, Math.round(paid / effective * 100)) : 0,
  };
}
export function enquiryWeek(enquiries: { createdAt: string }[], today: string) {
  const counts = new Map<string, number>();
  for (const enquiry of enquiries) {
    const key = dashboardDateKey(new Date(enquiry.createdAt));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    const key = date.toISOString().slice(0, 10);
    return {
      key,
      label: new Intl.DateTimeFormat("en", { weekday: "short", timeZone: "UTC" }).format(date),
      count: counts.get(key) ?? 0,
    };
  });
}
