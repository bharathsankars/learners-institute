import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ChevronLeft, ChevronRight, IndianRupee, ReceiptText, RefreshCw, Search, X } from "lucide-react";

import { fetchFeePlans, formatIndianRupees } from "../../api/fees";
import { fetchPayments, receiptNumber, type Payment, type PaymentMethod } from "../../api/payments";
import { ReceiptDialog } from "../components/ReceiptDialog";
import { RecordPaymentDialog } from "../components/RecordPaymentDialog";
import { paginateCourses as paginate } from "../utils/courses";
import {
  filterPayments,
  instituteToday,
  paymentMethodLabels,
  paymentTotals,
  studentFullName,
  type PaymentPeriod,
} from "../utils/fees";

import "../styles/AdminRecords.css";
import "../styles/FeesPayments.css";

const periodTabs: { key: PaymentPeriod; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "MONTH", label: "This month" },
  { key: "TODAY", label: "Today" },
];

const paidOn = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

export function PaymentsPage() {
  const today = instituteToday();
  const payments = useQuery({ queryKey: ["payments"], queryFn: fetchPayments, refetchInterval: 30000 });
  const plans = useQuery({ queryKey: ["fee-plans"], queryFn: fetchFeePlans });

  const [search, setSearch] = useState("");
  const [period, setPeriod] = useState<PaymentPeriod>("ALL");
  const [method, setMethod] = useState<PaymentMethod | "">("");
  const [page, setPage] = useState(1);
  const [paying, setPaying] = useState(false);
  const [receipt, setReceipt] = useState<{ payment: Payment; justRecorded: boolean } | null>(null);

  const all = payments.data ?? [];
  const loaded = payments.data !== undefined;
  const totals = paymentTotals(all, today);
  const counts = { ALL: totals.allCount, MONTH: totals.monthCount, TODAY: totals.todayCount };
  const filtered = filterPayments(all, { search, period, method }, today);
  const pagination = paginate(filtered, page);
  const filteredTotal = filtered.reduce((sum, payment) => sum + payment.amountPaise, 0);

  return (
    <div className="payments-admin records-page">
      <header className="records-header">
        <div>
          <span className="records-eyebrow">Fees &amp; payments</span>
          <h1>Payments</h1>
          <p>Every fee payment received, with a printable receipt for each.</p>
        </div>
        <div className="records-header__actions">
          <button
            className="records-button records-button--icon"
            type="button"
            disabled={payments.isFetching}
            onClick={() => void payments.refetch()}
            aria-label="Refresh payments"
            title="Refresh"
          >
            <RefreshCw size={16} aria-hidden="true" className={payments.isFetching ? "records-spin" : undefined} />
          </button>
          <button className="records-button records-button--primary" type="button" onClick={() => setPaying(true)} disabled={!plans.data}>
            <IndianRupee size={16} aria-hidden="true" />
            Record payment
          </button>
        </div>
      </header>

      <section className="money-stats money-stats--three" aria-label="Collection totals">
        <div className="money-stat money-stat--good">
          <span>Collected today</span>
          <strong>{loaded ? formatIndianRupees(totals.today) : "—"}</strong>
          <small>{totals.todayCount} {totals.todayCount === 1 ? "payment" : "payments"}</small>
        </div>
        <div className="money-stat">
          <span>This month</span>
          <strong>{loaded ? formatIndianRupees(totals.month) : "—"}</strong>
          <small>{totals.monthCount} {totals.monthCount === 1 ? "payment" : "payments"}</small>
        </div>
        <div className="money-stat">
          <span>All time</span>
          <strong>{loaded ? formatIndianRupees(totals.all) : "—"}</strong>
          <small>{totals.allCount} {totals.allCount === 1 ? "receipt" : "receipts"}</small>
        </div>
      </section>

      {payments.isError && (
        <div className="records-notice records-notice--error" role="alert">
          <span>{payments.error.message}</span>
        </div>
      )}

      <section className="records-panel" aria-label="Payments">
        <div className="records-tabs" role="group" aria-label="Filter by period">
          {periodTabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={period === key ? "records-tab records-tab--active" : "records-tab"}
              aria-pressed={period === key}
              onClick={() => {
                setPeriod(key);
                setPage(1);
              }}
            >
              {label}
              <span className="records-tab__count">{loaded ? counts[key] : "·"}</span>
            </button>
          ))}
        </div>

        <div className="records-toolbar">
          <label className="records-search">
            <Search size={17} aria-hidden="true" />
            <span className="records-sr-only">Search payments</span>
            <input
              type="search"
              value={search}
              placeholder="Search by student, course, receipt number or reference"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
            {search && (
              <button type="button" aria-label="Clear search" onClick={() => setSearch("")}>
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </label>
          <label className="records-select">
            <span className="records-sr-only">Payment method</span>
            <select
              value={method}
              onChange={(event) => {
                setMethod(event.target.value as PaymentMethod | "");
                setPage(1);
              }}
            >
              <option value="">All methods</option>
              {(Object.keys(paymentMethodLabels) as PaymentMethod[]).map((value) => (
                <option key={value} value={value}>
                  {paymentMethodLabels[value]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {payments.isPending ? (
          <div className="records-list" role="status" aria-label="Loading payments">
            {Array.from({ length: 6 }, (_, row) => (
              <div key={row} className="records-row records-row--skeleton">
                <span className="records-skeleton records-skeleton--avatar records-skeleton--square" />
                <span className="records-skeleton" style={{ width: "60%" }} />
                <span className="records-skeleton" style={{ width: "70%" }} />
                <span className="records-skeleton" style={{ width: "50%" }} />
                <span className="records-skeleton" style={{ width: "72px" }} />
              </div>
            ))}
          </div>
        ) : !filtered.length ? (
          <div className="records-empty">
            <ReceiptText size={28} aria-hidden="true" />
            <h3>{all.length ? "No matching payments" : "No payments yet"}</h3>
            <p>{all.length ? "Try another search, period or method." : "Recorded payments and their receipts will appear here."}</p>
          </div>
        ) : (
          <div className="records-list">
            <div className="records-columns records-columns--payments" aria-hidden="true">
              <span>Receipt</span>
              <span>Student</span>
              <span>Method</span>
              <span className="records-columns__right">Amount</span>
              <span />
            </div>

            {pagination.records.map((payment) => (
              <article key={payment.id} className="records-row records-row--payments">
                <div className="records-person">
                  <span className="records-avatar records-avatar--square" aria-hidden="true">
                    <ReceiptText size={16} />
                  </span>
                  <div>
                    <button type="button" className="records-name records-name--mono" onClick={() => setReceipt({ payment, justRecorded: false })}>
                      {receiptNumber(payment)}
                    </button>
                    <span className="records-sub">{paidOn.format(new Date(payment.paidAt))}</span>
                  </div>
                </div>

                <div className="records-detail">
                  <strong>{studentFullName(payment.feePlan.enrollment.student)}</strong>
                  <span className="records-sub">
                    {payment.feePlan.enrollment.student.admissionNumber} · {payment.feePlan.enrollment.course.title}
                  </span>
                </div>

                <div className="records-date">
                  <span className={`payment-method payment-method--${payment.method.toLowerCase()}`}>{paymentMethodLabels[payment.method]}</span>
                  {payment.reference && <span className="records-sub records-sub--mono">{payment.reference}</span>}
                </div>

                <strong className="payment-amount">{formatIndianRupees(payment.amountPaise)}</strong>

                <div className="records-actions">
                  <button type="button" className="records-action" onClick={() => setReceipt({ payment, justRecorded: false })}>
                    <ReceiptText size={15} aria-hidden="true" />
                    Receipt
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {loaded && filtered.length > 0 && (
          <footer className="records-pagination">
            <span>
              {filtered.length} {filtered.length === 1 ? "payment" : "payments"} · <strong className="payment-sum">{formatIndianRupees(filteredTotal)}</strong>
              <span className="records-live">Updates every 30 seconds</span>
            </span>
            <div>
              <button
                type="button"
                className="records-page-button"
                disabled={pagination.currentPage === 1}
                aria-label="Previous page"
                onClick={() => setPage(pagination.currentPage - 1)}
              >
                <ChevronLeft size={17} aria-hidden="true" />
              </button>
              <strong>
                {pagination.currentPage} / {pagination.pageCount}
              </strong>
              <button
                type="button"
                className="records-page-button"
                disabled={pagination.currentPage === pagination.pageCount}
                aria-label="Next page"
                onClick={() => setPage(pagination.currentPage + 1)}
              >
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            </div>
          </footer>
        )}
      </section>

      {paying && plans.data && (
        <RecordPaymentDialog
          plans={plans.data}
          onClose={() => setPaying(false)}
          onRecorded={(payment) => {
            setPaying(false);
            setReceipt({ payment, justRecorded: true });
          }}
        />
      )}

      {receipt && (
        <ReceiptDialog
          payment={receipt.payment}
          plan={plans.data?.find((plan) => plan.id === receipt.payment.feePlanId)}
          justRecorded={receipt.justRecorded}
          onClose={() => setReceipt(null)}
        />
      )}
    </div>
  );
}
