import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { CircleCheck, Printer, X } from "lucide-react";

import { formatIndianRupees, type FeePlan } from "../../api/fees";
import { fetchPublicInstitute } from "../../api/institute";
import { receiptNumber, type Payment } from "../../api/payments";
import { useContact } from "../../hooks/useContact";
import { amountInWords, effectiveFee, outstandingBalance, paidAmount, paymentMethodLabels, studentFullName } from "../utils/fees";

import "../styles/AddStudentModal.css";
import "../styles/FeesPayments.css";

type Props = {
  payment: Payment;
  // The plan as it stands now, for the fee summary.
  plan?: FeePlan | undefined;
  // Shown after recording, to confirm it was saved.
  justRecorded?: boolean;
  onClose: () => void;
};

const longDate = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "long", year: "numeric" });

export function ReceiptDialog({ payment, plan, justRecorded = false, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contact = useContact();
  const institute = useQuery({ queryKey: ["institute-public"], queryFn: fetchPublicInstitute, staleTime: 5 * 60_000 });
  const { student, course } = payment.feePlan.enrollment;

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="student-modal receipt-dialog"
      aria-label={`Receipt ${receiptNumber(payment)}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="receipt-dialog__bar">
        {justRecorded ? (
          <span className="receipt-dialog__saved">
            <CircleCheck size={17} aria-hidden="true" />
            Payment recorded
          </span>
        ) : (
          <span />
        )}
        <div>
          <button type="button" className="records-button records-button--primary" onClick={() => window.print()}>
            <Printer size={16} aria-hidden="true" />
            Print / Save PDF
          </button>
          <button type="button" className="records-button records-button--icon" onClick={onClose} aria-label="Close receipt" autoFocus>
            <X size={17} aria-hidden="true" />
          </button>
        </div>
      </div>

      <article className="receipt-sheet">
        <header className="receipt-sheet__letterhead">
          <img src="/learners-logo-mark.png" alt="" aria-hidden="true" />
          <div>
            <strong>{institute.data?.instituteName || "Learners Commercial Institute"}</strong>
            <span>{contact.address}</span>
            <span>{contact.phoneDisplay}</span>
            <span>{contact.supportEmail}</span>
          </div>
          <div className="receipt-sheet__number">
            <span>Receipt</span>
            <strong>{receiptNumber(payment)}</strong>
          </div>
        </header>

        <h2 className="receipt-sheet__title">Payment receipt</h2>

        <dl className="receipt-sheet__details">
          <div>
            <dt>Received from</dt>
            <dd>{studentFullName(student)}</dd>
          </div>
          <div>
            <dt>Admission no.</dt>
            <dd className="receipt-sheet__mono">{student.admissionNumber}</dd>
          </div>
          <div>
            <dt>Course</dt>
            <dd>{course.title}</dd>
          </div>
          <div>
            <dt>Date</dt>
            <dd>{longDate.format(new Date(payment.paidAt))}</dd>
          </div>
          <div>
            <dt>Paid by</dt>
            <dd>
              {paymentMethodLabels[payment.method]}
              {payment.reference && <span className="receipt-sheet__mono"> · {payment.reference}</span>}
            </dd>
          </div>
        </dl>

        <div className="receipt-sheet__amount">
          <span>Amount received</span>
          <strong>{formatIndianRupees(payment.amountPaise)}</strong>
          <em>{amountInWords(payment.amountPaise)}</em>
        </div>

        {plan && (
          <dl className="receipt-sheet__summary">
            <div>
              <dt>Course fee</dt>
              <dd>{formatIndianRupees(effectiveFee(plan))}</dd>
            </div>
            <div>
              <dt>Paid to date</dt>
              <dd>{formatIndianRupees(paidAmount(plan))}</dd>
            </div>
            <div>
              <dt>Balance</dt>
              <dd>{formatIndianRupees(outstandingBalance(plan))}</dd>
            </div>
          </dl>
        )}

        {payment.notes && <p className="receipt-sheet__notes">Note: {payment.notes}</p>}

        <footer className="receipt-sheet__footer">
          <span>Computer-generated receipt from the institute’s payment record.</span>
          <span className="receipt-sheet__sign">Authorised signatory</span>
        </footer>
      </article>
    </dialog>
  );
}
