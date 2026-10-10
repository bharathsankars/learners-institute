import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { fetchFeePlans, formatIndianRupees, outstandingBalance } from "../../api/fees";
import { createPayment, fetchPayments, receiptNumber, type Payment, type PaymentMethod } from "../../api/payments";
import "../styles/Fees.css";
import "../styles/Payments.css";

const methods: PaymentMethod[] = ["CASH", "UPI", "BANK_TRANSFER", "CARD"];
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};
const studentName = (payment: Payment) => [payment.feePlan.enrollment.student.firstName, payment.feePlan.enrollment.student.lastName].filter(Boolean).join(" ");

export function PaymentsPage() {
  const queryClient = useQueryClient();
  const plans = useQuery({ queryKey: ["fee-plans"], queryFn: fetchFeePlans });
  const payments = useQuery({ queryKey: ["payments"], queryFn: fetchPayments });
  const [feePlanId, setFeePlanId] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [paidAt, setPaidAt] = useState(today);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [search, setSearch] = useState("");
  const [receipt, setReceipt] = useState<Payment | null>(null);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [validationError, setValidationError] = useState("");
  const selected = plans.data?.find(plan => plan.id === feePlanId);
  const available = plans.data?.filter(plan => plan.status === "ACTIVE" && outstandingBalance(plan) > 0) ?? [];
  const mutation = useMutation({
    mutationFn: createPayment,
    onSuccess: async payment => {
      setReceipt(payment); setAmount(""); setReference(""); setNotes(""); setFeePlanId("");
      setRequestId(crypto.randomUUID());
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
        queryClient.invalidateQueries({ queryKey: ["fee-plans"] }),
      ]);
    },
  });
  function changed() { setRequestId(crypto.randomUUID()); mutation.reset(); setValidationError(""); }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (mutation.isPending) return;
    const amountPaise = Math.round(Number(amount) * 100);
    if (!/^\d+(\.\d{1,2})?$/.test(amount) || !Number.isSafeInteger(amountPaise) || amountPaise <= 0 || !selected || amountPaise > outstandingBalance(selected)) {
      setValidationError("Enter an amount greater than zero and within the outstanding balance, using up to two decimal places."); return;
    }
    setValidationError("");
    mutation.mutate({ requestId, feePlanId, amountPaise, method, paidAt, reference, notes });
  }
  const filtered = (payments.data ?? []).filter(payment => `${studentName(payment)} ${payment.feePlan.enrollment.student.admissionNumber} ${payment.feePlan.enrollment.course.title} ${receiptNumber(payment)} ${payment.reference ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  return <div className="fees-page payments-page">
    <header className="fees-page__heading"><div><span className="fees-page__eyebrow">Financial Administration</span><h1>Payments</h1><p>Record fee collections, track balances, and print receipts.</p></div></header>
    {(plans.isError || payments.isError) && <p role="alert">{plans.error?.message ?? payments.error?.message} <button onClick={() => { void plans.refetch(); void payments.refetch(); }}>Retry</button></p>}
    <section className="payment-panel"><h2>Record payment</h2>
      {plans.isPending ? <p>Loading fee plans…</p> : !plans.isError && available.length === 0 ? <p>No active fee plans with an outstanding balance.</p> : null}
      <form onSubmit={submit}>
        <fieldset disabled={mutation.isPending || plans.isPending || plans.isError || available.length === 0} className="payment-form">
          <label className="payment-form__wide">Fee plan<select required value={feePlanId} onChange={event => { changed(); setFeePlanId(event.target.value); }}><option value="">Select student and course</option>{available.map(plan => <option value={plan.id} key={plan.id}>{plan.enrollment.student.admissionNumber} — {plan.enrollment.student.firstName} {plan.enrollment.student.lastName} — {plan.enrollment.course.title} ({formatIndianRupees(outstandingBalance(plan))} due)</option>)}</select></label>
          <label>Amount (₹)<input required type="number" min="0.01" step="0.01" max={selected ? outstandingBalance(selected) / 100 : undefined} value={amount} onChange={event => { changed(); setAmount(event.target.value); }} /></label>
          <label>Payment method<select value={method} onChange={event => { changed(); setMethod(event.target.value as PaymentMethod); }}>{methods.map(value => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
          <label>Payment date<input required type="date" value={paidAt} onChange={event => { changed(); setPaidAt(event.target.value); }} /></label>
          <label>Reference (optional)<input maxLength={200} value={reference} onChange={event => { changed(); setReference(event.target.value); }} /></label>
          <label className="payment-form__wide">Notes (optional)<textarea maxLength={1000} value={notes} onChange={event => { changed(); setNotes(event.target.value); }} /></label>
          {selected && <p>Outstanding balance: <strong>{formatIndianRupees(outstandingBalance(selected))}</strong></p>}
          <button className="fees-page__add-button" type="submit">{mutation.isPending ? "Recording…" : "Record payment"}</button>
        </fieldset>
        {(validationError || mutation.error) && <p role="alert">{validationError || mutation.error?.message}</p>}
      </form>
    </section>
    <section className="payment-panel"><h2>Payment history</h2><label className="payment-search">Search payments<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Student, course, receipt or reference" /></label>
      {payments.isPending ? <p>Loading payments…</p> : !payments.isError && filtered.length === 0 ? <p>No payments found.</p> : <div className="fees-table-wrapper"><table className="fees-table"><thead><tr><th>Receipt</th><th>Student</th><th>Course</th><th>Date</th><th>Method</th><th>Amount</th><th>Receipt</th></tr></thead><tbody>{filtered.map(payment => <tr key={payment.id}><td>{receiptNumber(payment)}</td><td>{studentName(payment)}<br />{payment.feePlan.enrollment.student.admissionNumber}</td><td>{payment.feePlan.enrollment.course.title}</td><td>{payment.paidAt.slice(0, 10)}</td><td>{payment.method.replaceAll("_", " ")}</td><td>{formatIndianRupees(payment.amountPaise)}</td><td><button onClick={() => setReceipt(payment)}>View receipt</button></td></tr>)}</tbody></table></div>}
    </section>
    {receipt && <div className="payment-receipt-backdrop"><section className="payment-receipt" role="dialog" aria-modal="true" aria-label="Payment receipt"><div className="payment-receipt__actions"><button onClick={() => window.print()}>Print / Save PDF</button><button autoFocus onClick={() => setReceipt(null)}>Close</button></div><h2>Learners Commercial Institute</h2><p>Thirunakkara, Kottayam, Kerala</p><h3>Payment receipt · {receiptNumber(receipt)}</h3><dl><dt>Student</dt><dd>{studentName(receipt)}</dd><dt>Admission number</dt><dd>{receipt.feePlan.enrollment.student.admissionNumber}</dd><dt>Course</dt><dd>{receipt.feePlan.enrollment.course.title}</dd><dt>Payment date</dt><dd>{receipt.paidAt.slice(0, 10)}</dd><dt>Amount received</dt><dd>{formatIndianRupees(receipt.amountPaise)}</dd><dt>Method</dt><dd>{receipt.method.replaceAll("_", " ")}</dd>{receipt.reference && <><dt>Reference</dt><dd>{receipt.reference}</dd></>}</dl><p>Receipt generated from the institute’s payment record.</p></section></div>}
  </div>;
}
