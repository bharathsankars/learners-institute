import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, IndianRupee, LoaderCircle, Pencil, ReceiptText, X } from "lucide-react";

import { cancelFeePlan, formatIndianRupees, type FeePlan } from "../../api/fees";
import { fetchPayments, receiptNumber, type Payment } from "../../api/payments";
import { effectiveFee, feeState, instituteToday, outstandingBalance, paidAmount, paymentMethodLabels, studentFullName } from "../utils/fees";

import "../styles/AddStudentModal.css";
import "../styles/FeesPayments.css";

type Props = {
  plan: FeePlan;
  onClose: () => void;
  onEdit: () => void;
  onRecordPayment: () => void;
  onViewReceipt: (payment: Payment) => void;
  onCancelled: (message: string) => void;
};

const day = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

const stateLabels = { OVERDUE: "Overdue", DUE: "Due", PAID: "Paid", CANCELLED: "Cancelled" } as const;

export function FeePlanDetailsDialog({ plan, onClose, onEdit, onRecordPayment, onViewReceipt, onCancelled }: Props) {
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const payments = useQuery({ queryKey: ["payments"], queryFn: fetchPayments });
  const state = feeState(plan, instituteToday());
  const fee = effectiveFee(plan);
  const paid = paidAmount(plan);
  const history = (payments.data ?? []).filter((payment) => payment.feePlanId === plan.id);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const cancel = useMutation({
    mutationFn: () => cancelFeePlan(plan.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["fee-plans"] });
      onCancelled(`The fee plan for ${studentFullName(plan.enrollment.student)} was cancelled. Recorded payments are kept.`);
    },
  });

  return (
    <dialog
      ref={dialogRef}
      className="student-modal fee-details"
      aria-labelledby="fee-details-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!cancel.isPending) onClose();
      }}
    >
      <header className="student-modal__header">
        <div className="student-modal__heading">
          <span className="student-modal__heading-icon" aria-hidden="true">
            <IndianRupee size={21} />
          </span>
          <div>
            <span className="student-modal__eyebrow">Fee plan</span>
            <h2 id="fee-details-title">{studentFullName(plan.enrollment.student)}</h2>
            <p>
              {plan.enrollment.student.admissionNumber} · {plan.enrollment.course.title}
            </p>
          </div>
        </div>
        <button className="student-modal__close" type="button" onClick={onClose} disabled={cancel.isPending} aria-label="Close">
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <div className="student-modal__body">
        <div className="fee-details__summary">
          <span className={`records-status records-status--fee-${state.toLowerCase()}`}>{stateLabels[state]}</span>
          <dl>
            <div>
              <dt>Total fee</dt>
              <dd>{formatIndianRupees(plan.totalFeePaise)}</dd>
            </div>
            <div>
              <dt>Discount</dt>
              <dd>{plan.discountPaise ? `− ${formatIndianRupees(plan.discountPaise)}` : "None"}</dd>
            </div>
            <div>
              <dt>Paid</dt>
              <dd>{formatIndianRupees(paid)}</dd>
            </div>
            <div>
              <dt>Balance</dt>
              <dd className="fee-details__balance">{formatIndianRupees(outstandingBalance(plan))}</dd>
            </div>
          </dl>
          <span className="fee-progress" aria-label={`${fee ? Math.round((paid / fee) * 100) : 100}% paid`}>
            <span style={{ width: `${fee ? Math.min(100, (paid / fee) * 100) : 100}%` }} />
          </span>
          <p className="fee-details__meta">
            {plan.dueDate ? `Due ${day.format(new Date(plan.dueDate))}` : "No due date"}
            {plan.notes && ` · ${plan.notes}`}
          </p>
        </div>

        <section className="fee-details__history" aria-label="Payment history">
          <h3>Payments</h3>
          {payments.isPending ? (
            <p className="fee-details__empty">Loading payments…</p>
          ) : !history.length ? (
            <p className="fee-details__empty">No payments recorded yet.</p>
          ) : (
            <ul>
              {history.map((payment) => (
                <li key={payment.id}>
                  <div>
                    <strong>{formatIndianRupees(payment.amountPaise)}</strong>
                    <span>
                      {day.format(new Date(payment.paidAt))} · {paymentMethodLabels[payment.method]}
                      {payment.reference && ` · ${payment.reference}`}
                    </span>
                  </div>
                  <button type="button" className="records-action" onClick={() => onViewReceipt(payment)}>
                    <ReceiptText size={14} aria-hidden="true" />
                    {receiptNumber(payment)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {confirmCancel && (
          <div className="fee-details__confirm" role="alert">
            <p>
              Cancel this fee plan? No more payments can be recorded against it. The {history.length}{" "}
              {history.length === 1 ? "payment" : "payments"} already recorded stay on file.
            </p>
            <div>
              <button type="button" className="records-button" onClick={() => setConfirmCancel(false)} disabled={cancel.isPending}>
                Keep plan
              </button>
              <button type="button" className="records-button fee-details__danger" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
                {cancel.isPending ? <LoaderCircle size={15} className="student-modal__spinner" aria-hidden="true" /> : <Ban size={15} aria-hidden="true" />}
                Cancel plan
              </button>
            </div>
          </div>
        )}

        {cancel.isError && (
          <div className="student-modal__server-error" role="alert">
            {cancel.error.message}
          </div>
        )}
      </div>

      <footer className="student-modal__actions">
        <div className="fee-details__secondary">
          {plan.status === "ACTIVE" && (
            <>
              <button type="button" className="student-modal__cancel" onClick={onEdit} disabled={cancel.isPending}>
                <Pencil size={15} aria-hidden="true" />
                Edit plan
              </button>
              {!confirmCancel && (
                <button type="button" className="records-clear" onClick={() => setConfirmCancel(true)}>
                  Cancel plan
                </button>
              )}
            </>
          )}
        </div>
        {plan.status === "ACTIVE" && outstandingBalance(plan) > 0 && (
          <button type="button" className="student-modal__submit" onClick={onRecordPayment} disabled={cancel.isPending}>
            <IndianRupee size={15} aria-hidden="true" />
            Record payment
          </button>
        )}
      </footer>
    </dialog>
  );
}
