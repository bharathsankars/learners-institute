import { useEffect, useRef, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, IndianRupee, LoaderCircle, Search, X } from "lucide-react";

import { formatIndianRupees, type FeePlan } from "../../api/fees";
import { createPayment, type Payment, type PaymentMethod } from "../../api/payments";
import {
  effectiveFee,
  feeState,
  instituteToday,
  outstandingBalance,
  paidAmount,
  paymentMethodLabels,
  studentFullName,
} from "../utils/fees";

import "../styles/AddStudentModal.css";
import "../styles/FeesPayments.css";

type Props = {
  plans: FeePlan[];
  initialPlanId?: string | null;
  onClose: () => void;
  onRecorded: (payment: Payment) => void;
};

const methods = Object.keys(paymentMethodLabels) as PaymentMethod[];

const referenceLabels: Record<PaymentMethod, string> = {
  CASH: "Reference (optional)",
  UPI: "UPI transaction ID",
  BANK_TRANSFER: "Transaction / UTR number",
  CARD: "Card slip number",
};

const dueFormat = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

export function RecordPaymentDialog({ plans, initialPlanId = null, onClose, onRecorded }: Props) {
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const today = instituteToday();

  // Only active plans with something left to pay can take a payment.
  const payable = plans.filter((plan) => plan.status === "ACTIVE" && outstandingBalance(plan) > 0);

  const [planId, setPlanId] = useState(initialPlanId && payable.some((plan) => plan.id === initialPlanId) ? initialPlanId : "");
  const [search, setSearch] = useState("");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [paidAt, setPaidAt] = useState(today);
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  // A new ID whenever the details change, so a retried click is not a duplicate.
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const plan = payable.find((item) => item.id === planId);
  const balance = plan ? outstandingBalance(plan) : 0;
  const amountPaise = Math.round(Number(amount) * 100);
  const validAmount = /^\d+(\.\d{1,2})?$/.test(amount) && amountPaise > 0 && amountPaise <= balance;

  const term = search.trim().toLowerCase();
  const matches = term
    ? payable
        .filter((item) => {
          const { student, course } = item.enrollment;
          return `${studentFullName(student)} ${student.admissionNumber} ${student.phone} ${course.title}`.toLowerCase().includes(term);
        })
        .slice(0, 6)
    : payable.slice(0, 6);

  const mutation = useMutation({
    mutationFn: createPayment,
    onSuccess: async (payment) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["payments"] }),
        queryClient.invalidateQueries({ queryKey: ["fee-plans"] }),
      ]);
      onRecorded(payment);
    },
  });

  const changed = () => {
    setRequestId(crypto.randomUUID());
    setError("");
    mutation.reset();
  };

  const close = () => {
    if (!mutation.isPending) onClose();
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();

    if (!plan) {
      setError("Choose the student's fee plan.");
      return;
    }

    if (!validAmount) {
      setError(`Enter an amount between ₹1 and ${formatIndianRupees(balance)}, with at most two decimal places.`);
      return;
    }

    mutation.mutate({
      requestId,
      feePlanId: plan.id,
      amountPaise,
      method,
      paidAt,
      ...(reference.trim() && { reference: reference.trim() }),
      ...(notes.trim() && { notes: notes.trim() }),
    });
  };

  return (
    <dialog
      ref={dialogRef}
      className="student-modal pay-dialog"
      aria-labelledby="pay-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
    >
      <header className="student-modal__header">
        <div className="student-modal__heading">
          <span className="student-modal__heading-icon" aria-hidden="true">
            <IndianRupee size={21} />
          </span>
          <div>
            <span className="student-modal__eyebrow">Fees &amp; payments</span>
            <h2 id="pay-dialog-title">Record payment</h2>
            <p>A receipt is created as soon as the payment is saved.</p>
          </div>
        </div>
        <button className="student-modal__close" type="button" onClick={close} disabled={mutation.isPending} aria-label="Close">
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <form className="student-modal__form" onSubmit={submit}>
        <div className="student-modal__body">
          <fieldset className="pay-dialog__fields" disabled={mutation.isPending}>
            {!plan ? (
              <div className="pay-dialog__picker">
                <span className="pay-dialog__label">Whose fee is this?</span>
                <label className="records-search">
                  <Search size={17} aria-hidden="true" />
                  <span className="records-sr-only">Find a fee plan</span>
                  <input
                    type="search"
                    value={search}
                    placeholder="Search student, admission number, phone or course"
                    onChange={(event) => setSearch(event.target.value)}
                    autoFocus
                  />
                </label>
                {!payable.length ? (
                  <p className="pay-dialog__empty">No fee plans have a balance to collect.</p>
                ) : !matches.length ? (
                  <p className="pay-dialog__empty">No fee plan matches “{search}”.</p>
                ) : (
                  <ul className="pay-dialog__options">
                    {matches.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            changed();
                            setPlanId(item.id);
                          }}
                        >
                          <span>
                            <strong>{studentFullName(item.enrollment.student)}</strong>
                            <small>
                              {item.enrollment.student.admissionNumber} · {item.enrollment.course.title}
                            </small>
                          </span>
                          <span className={feeState(item, today) === "OVERDUE" ? "pay-dialog__due pay-dialog__due--overdue" : "pay-dialog__due"}>
                            {formatIndianRupees(outstandingBalance(item))} due
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <>
                <div className="pay-dialog__plan">
                  <div>
                    <strong>{studentFullName(plan.enrollment.student)}</strong>
                    <span>
                      {plan.enrollment.student.admissionNumber} · {plan.enrollment.course.title}
                    </span>
                  </div>
                  {!initialPlanId && (
                    <button
                      type="button"
                      className="records-clear"
                      onClick={() => {
                        changed();
                        setPlanId("");
                        setAmount("");
                      }}
                    >
                      Change
                    </button>
                  )}
                  <dl>
                    <div>
                      <dt>Fee</dt>
                      <dd>{formatIndianRupees(effectiveFee(plan))}</dd>
                    </div>
                    <div>
                      <dt>Paid</dt>
                      <dd>{formatIndianRupees(paidAmount(plan))}</dd>
                    </div>
                    <div>
                      <dt>Balance</dt>
                      <dd className="pay-dialog__balance">{formatIndianRupees(balance)}</dd>
                    </div>
                    {plan.dueDate && (
                      <div>
                        <dt>Due</dt>
                        <dd className={feeState(plan, today) === "OVERDUE" ? "pay-dialog__overdue" : undefined}>
                          {dueFormat.format(new Date(plan.dueDate))}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                <div className="pay-dialog__grid">
                  <label className="pay-dialog__field">
                    <span>Amount received (₹)</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min="1"
                      step="0.01"
                      max={balance / 100}
                      value={amount}
                      placeholder="0"
                      onChange={(event) => {
                        changed();
                        setAmount(event.target.value);
                      }}
                      autoFocus
                    />
                    <span className="pay-dialog__chips">
                      <button
                        type="button"
                        onClick={() => {
                          changed();
                          setAmount(String(balance / 100));
                        }}
                      >
                        Full balance · {formatIndianRupees(balance)}
                      </button>
                    </span>
                  </label>

                  <label className="pay-dialog__field">
                    <span>Payment date</span>
                    <input
                      type="date"
                      value={paidAt}
                      max={today}
                      onChange={(event) => {
                        changed();
                        setPaidAt(event.target.value);
                      }}
                      required
                    />
                  </label>

                  <div className="pay-dialog__field pay-dialog__field--wide">
                    <span id="pay-method-label">Payment method</span>
                    <div className="pay-dialog__methods" role="group" aria-labelledby="pay-method-label">
                      {methods.map((value) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={method === value}
                          onClick={() => {
                            changed();
                            setMethod(value);
                          }}
                        >
                          {paymentMethodLabels[value]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <label className="pay-dialog__field">
                    <span>{referenceLabels[method]}</span>
                    <input
                      maxLength={200}
                      value={reference}
                      onChange={(event) => {
                        changed();
                        setReference(event.target.value);
                      }}
                    />
                  </label>

                  <label className="pay-dialog__field">
                    <span>Notes (optional)</span>
                    <input
                      maxLength={1000}
                      value={notes}
                      onChange={(event) => {
                        changed();
                        setNotes(event.target.value);
                      }}
                    />
                  </label>
                </div>
              </>
            )}
          </fieldset>

          {(error || mutation.error) && (
            <div className="student-modal__server-error" role="alert">
              {error || mutation.error?.message}
            </div>
          )}
        </div>

        <footer className="student-modal__actions">
          <span className="student-modal__save-note">
            {plan && validAmount
              ? `Balance after this payment: ${formatIndianRupees(balance - amountPaise)}`
              : "Payments cannot exceed the balance."}
          </span>
          <div>
            <button className="student-modal__cancel" type="button" onClick={close} disabled={mutation.isPending}>
              Cancel
            </button>
            <button className="student-modal__submit" type="submit" disabled={mutation.isPending || !plan}>
              {mutation.isPending ? (
                <LoaderCircle size={16} className="student-modal__spinner" aria-hidden="true" />
              ) : (
                <ArrowRight size={16} aria-hidden="true" />
              )}
              {mutation.isPending ? "Recording…" : validAmount ? `Record ${formatIndianRupees(amountPaise)}` : "Record payment"}
            </button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}
