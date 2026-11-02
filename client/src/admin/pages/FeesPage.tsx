import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, CircleCheck, IndianRupee, Plus, RefreshCw, Search, Wallet, X } from "lucide-react";

import { fetchCourses } from "../../api/courses";
import {
  createFeePlan,
  fetchFeePlans,
  formatIndianRupees,
  updateFeePlan,
  type CreateFeePlanInput,
  type FeePlan,
  type UpdateFeePlanInput,
} from "../../api/fees";
import type { Payment } from "../../api/payments";
import { fetchStudents } from "../../api/students";
import { FeePlanDetailsDialog } from "../components/FeePlanDetailsDialog";
import { FeePlanModal } from "../components/FeePlanModal";
import { ReceiptDialog } from "../components/ReceiptDialog";
import { RecordPaymentDialog } from "../components/RecordPaymentDialog";
import { paginateCourses as paginate } from "../utils/courses";
import {
  effectiveFee,
  feeCounts,
  feeState,
  feeTotals,
  filterFeePlans,
  instituteToday,
  outstandingBalance,
  paidAmount,
  studentFullName,
  type FeeFilter,
  type FeeSort,
} from "../utils/fees";

import "../styles/AdminRecords.css";
import "../styles/FeesPayments.css";

const tabs: { key: FeeFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "OUTSTANDING", label: "Outstanding" },
  { key: "OVERDUE", label: "Overdue" },
  { key: "PAID", label: "Paid" },
  { key: "CANCELLED", label: "Cancelled" },
];

const stateLabels = { OVERDUE: "Overdue", DUE: "Due", PAID: "Paid", CANCELLED: "Cancelled" } as const;
const due = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });

function initials(student: { firstName: string; lastName: string | null }) {
  return [student.firstName, student.lastName]
    .filter(Boolean)
    .map((part) => part!.trim()[0]?.toUpperCase() ?? "")
    .join("");
}

export function FeesPage() {
  const queryClient = useQueryClient();
  const today = instituteToday();

  const query = useQuery({ queryKey: ["fee-plans"], queryFn: fetchFeePlans, refetchInterval: 30000 });
  const students = useQuery({ queryKey: ["students"], queryFn: fetchStudents });
  const courses = useQuery({ queryKey: ["courses"], queryFn: fetchCourses });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FeeFilter>("ALL");
  const [sort, setSort] = useState<FeeSort>("DUE");
  const [page, setPage] = useState(1);
  const [notice, setNotice] = useState("");

  const [detailsId, setDetailsId] = useState<string | null>(null);
  const [paying, setPaying] = useState<{ planId: string | null } | null>(null);
  const [receipt, setReceipt] = useState<{ payment: Payment; justRecorded: boolean } | null>(null);
  const [form, setForm] = useState<{ plan: FeePlan | null } | null>(null);
  const [formError, setFormError] = useState("");

  const plans = query.data ?? [];
  const loaded = query.data !== undefined;
  const counts = feeCounts(plans, today);
  const totals = feeTotals(plans, today);
  const filtered = filterFeePlans(plans, { search, filter, sort }, today);
  const pagination = paginate(filtered, page);
  const details = plans.find((plan) => plan.id === detailsId);
  const hasFilters = Boolean(search.trim()) || filter !== "ALL";

  const save = useMutation({
    mutationFn: ({ planId, create, update }: { planId?: string; create?: CreateFeePlanInput; update?: UpdateFeePlanInput }) =>
      planId && update ? updateFeePlan(planId, update) : createFeePlan(create!),
    onSuccess: async (plan, { planId }) => {
      setForm(null);
      setFormError("");
      setNotice(`Fee plan ${planId ? "updated" : "created"} for ${studentFullName(plan.enrollment.student)}.`);
      await queryClient.invalidateQueries({ queryKey: ["fee-plans"] });
    },
    onError: (error) => setFormError(error.message),
  });

  const resetFilters = () => {
    setSearch("");
    setFilter("ALL");
    setPage(1);
  };

  return (
    <div className="fees-admin records-page">
      <header className="records-header">
        <div>
          <span className="records-eyebrow">Fees &amp; payments</span>
          <h1>Fees</h1>
          <p>Each student’s course fee, what they have paid and what is still due.</p>
        </div>
        <div className="records-header__actions">
          <button
            className="records-button records-button--icon"
            type="button"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
            aria-label="Refresh fees"
            title="Refresh"
          >
            <RefreshCw size={16} aria-hidden="true" className={query.isFetching ? "records-spin" : undefined} />
          </button>
          <button className="records-button" type="button" onClick={() => setPaying({ planId: null })} disabled={!loaded}>
            <IndianRupee size={16} aria-hidden="true" />
            Record payment
          </button>
          <button
            className="records-button records-button--primary"
            type="button"
            onClick={() => {
              setFormError("");
              setForm({ plan: null });
            }}
          >
            <Plus size={17} aria-hidden="true" />
            New fee plan
          </button>
        </div>
      </header>

      <section className="money-stats" aria-label="Fee totals">
        <div className="money-stat">
          <span>Billed</span>
          <strong>{loaded ? formatIndianRupees(totals.billed) : "—"}</strong>
          <small>Active fee plans after discounts</small>
        </div>
        <div className="money-stat money-stat--good">
          <span>Collected</span>
          <strong>{loaded ? formatIndianRupees(totals.collected) : "—"}</strong>
          <small>All payments recorded</small>
        </div>
        <div className="money-stat">
          <span>Outstanding</span>
          <strong>{loaded ? formatIndianRupees(totals.outstanding) : "—"}</strong>
          <small>{counts.OUTSTANDING} {counts.OUTSTANDING === 1 ? "plan" : "plans"} with a balance</small>
        </div>
        <button
          type="button"
          className={totals.overdueCount ? "money-stat money-stat--alert" : "money-stat"}
          onClick={() => {
            setFilter("OVERDUE");
            setPage(1);
          }}
        >
          <span>Overdue</span>
          <strong>{loaded ? formatIndianRupees(totals.overdue) : "—"}</strong>
          <small>
            {totals.overdueCount} past the due date{totals.overdueCount ? " · show" : ""}
          </small>
        </button>
      </section>

      {query.isError && (
        <div className="records-notice records-notice--error" role="alert">
          <span>{query.error.message}</span>
        </div>
      )}

      {notice && (
        <div className="records-notice records-notice--success" role="status">
          <CircleCheck size={18} aria-hidden="true" />
          <span>{notice}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setNotice("")}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <section className="records-panel" aria-label="Fee plans">
        <div className="records-tabs" role="group" aria-label="Filter fee plans">
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={filter === key ? "records-tab records-tab--active" : "records-tab"}
              aria-pressed={filter === key}
              onClick={() => {
                setFilter(key);
                setPage(1);
              }}
            >
              {label}
              <span className={key === "OVERDUE" && counts.OVERDUE ? "records-tab__count records-tab__count--alert" : "records-tab__count"}>
                {loaded ? counts[key] : "·"}
              </span>
            </button>
          ))}
        </div>

        <div className="records-toolbar">
          <label className="records-search">
            <Search size={17} aria-hidden="true" />
            <span className="records-sr-only">Search fee plans</span>
            <input
              type="search"
              value={search}
              placeholder="Search by student, admission number, phone or course"
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
            <span className="records-sr-only">Sort by</span>
            <select value={sort} onChange={(event) => setSort(event.target.value as FeeSort)}>
              <option value="DUE">Due date</option>
              <option value="BALANCE">Highest balance</option>
              <option value="NEWEST">Newest first</option>
              <option value="NAME">Student name A–Z</option>
            </select>
          </label>
          {hasFilters && (
            <button type="button" className="records-clear" onClick={resetFilters}>
              <X size={14} aria-hidden="true" />
              Clear
            </button>
          )}
        </div>

        {query.isPending ? (
          <div className="records-list" role="status" aria-label="Loading fee plans">
            {Array.from({ length: 6 }, (_, row) => (
              <div key={row} className="records-row records-row--skeleton">
                <span className="records-skeleton records-skeleton--avatar" />
                <span className="records-skeleton" style={{ width: "60%" }} />
                <span className="records-skeleton" style={{ width: "70%" }} />
                <span className="records-skeleton" style={{ width: "50%" }} />
                <span className="records-skeleton" style={{ width: "72px" }} />
              </div>
            ))}
          </div>
        ) : !filtered.length ? (
          <div className="records-empty">
            <Wallet size={28} aria-hidden="true" />
            <h3>{plans.length ? "No matching fee plans" : "No fee plans yet"}</h3>
            <p>
              {plans.length
                ? "Try another search or tab."
                : "Set a fee when admitting a student, or create a fee plan here."}
            </p>
            {plans.length ? (
              <button type="button" className="records-button" onClick={resetFilters}>
                Clear filters
              </button>
            ) : (
              <button type="button" className="records-button records-button--primary" onClick={() => setForm({ plan: null })}>
                New fee plan
              </button>
            )}
          </div>
        ) : (
          <div className="records-list">
            <div className="records-columns records-columns--fees" aria-hidden="true">
              <span>Student</span>
              <span>Course &amp; fee</span>
              <span>Paid</span>
              <span>Balance</span>
              <span>Status</span>
              <span />
            </div>

            {pagination.records.map((plan) => {
              const state = feeState(plan, today);
              const fee = effectiveFee(plan);
              const paid = paidAmount(plan);
              const balance = outstandingBalance(plan);

              return (
                <article key={plan.id} className="records-row records-row--fees">
                  <div className="records-person">
                    <span className="records-avatar" aria-hidden="true">
                      {initials(plan.enrollment.student)}
                    </span>
                    <div>
                      <button type="button" className="records-name" onClick={() => setDetailsId(plan.id)}>
                        {studentFullName(plan.enrollment.student)}
                      </button>
                      <span className="records-sub records-sub--mono">{plan.enrollment.student.admissionNumber}</span>
                    </div>
                  </div>

                  <div className="records-detail">
                    <strong>{plan.enrollment.course.title}</strong>
                    <span className="records-sub">
                      {formatIndianRupees(fee)}
                      {plan.discountPaise > 0 && ` · ${formatIndianRupees(plan.discountPaise)} off`}
                    </span>
                  </div>

                  <div className="fee-paid">
                    <span>
                      <strong>{formatIndianRupees(paid)}</strong>
                    </span>
                    <span className="fee-progress" aria-hidden="true">
                      <span style={{ width: `${fee ? Math.min(100, (paid / fee) * 100) : 100}%` }} />
                    </span>
                  </div>

                  <div className="records-date fee-balance">
                    <strong className={state === "OVERDUE" ? "fee-balance__amount fee-balance__amount--overdue" : "fee-balance__amount"}>
                      {formatIndianRupees(balance)}
                    </strong>
                    {state !== "PAID" && state !== "CANCELLED" && (
                      <span>{plan.dueDate ? `due ${due.format(new Date(plan.dueDate))}` : "no due date"}</span>
                    )}
                  </div>

                  <span className={`records-status records-status--fee-${state.toLowerCase()}`}>{stateLabels[state]}</span>

                  <div className="records-actions">
                    {plan.status === "ACTIVE" && balance > 0 && (
                      <button
                        type="button"
                        className="records-action records-action--icon"
                        onClick={() => setPaying({ planId: plan.id })}
                        aria-label={`Record payment for ${studentFullName(plan.enrollment.student)}`}
                        title="Record payment"
                      >
                        <IndianRupee size={15} aria-hidden="true" />
                      </button>
                    )}
                    <button type="button" className="records-action" onClick={() => setDetailsId(plan.id)}>
                      View
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {loaded && filtered.length > 0 && (
          <footer className="records-pagination">
            <span>
              Showing {pagination.start}–{pagination.end} of {filtered.length} fee {filtered.length === 1 ? "plan" : "plans"}
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

      {details && !paying && !receipt && !form && (
        <FeePlanDetailsDialog
          plan={details}
          onClose={() => setDetailsId(null)}
          onEdit={() => {
            setFormError("");
            setForm({ plan: details });
          }}
          onRecordPayment={() => setPaying({ planId: details.id })}
          onViewReceipt={(payment) => setReceipt({ payment, justRecorded: false })}
          onCancelled={(message) => {
            setDetailsId(null);
            setNotice(message);
          }}
        />
      )}

      {paying && (
        <RecordPaymentDialog
          plans={plans}
          initialPlanId={paying.planId}
          onClose={() => setPaying(null)}
          onRecorded={(payment) => {
            setPaying(null);
            setReceipt({ payment, justRecorded: true });
          }}
        />
      )}

      {receipt && (
        <ReceiptDialog
          payment={receipt.payment}
          plan={plans.find((plan) => plan.id === receipt.payment.feePlanId)}
          justRecorded={receipt.justRecorded}
          onClose={() => setReceipt(null)}
        />
      )}

      <FeePlanModal
        open={Boolean(form)}
        feePlan={form?.plan ?? null}
        students={students.data ?? []}
        courses={courses.data ?? []}
        isSubmitting={save.isPending}
        serverError={formError}
        onClose={() => {
          if (!save.isPending) {
            setForm(null);
            setFormError("");
          }
        }}
        onCreate={async (input) => {
          await save.mutateAsync({ create: input });
        }}
        onUpdate={async (planId, input) => {
          await save.mutateAsync({ planId, update: input });
        }}
      />
    </div>
  );
}
