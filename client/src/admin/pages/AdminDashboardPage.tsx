import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CircleCheck,
  FileText,
  GraduationCap,
  RefreshCw,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { fetchCourses } from "../../api/courses";
import { fetchEnquiries } from "../../api/enquiries";
import { fetchFeePlans, formatIndianRupees } from "../../api/fees";
import { fetchPayments, receiptNumber } from "../../api/payments";
import { fetchStudents } from "../../api/students";

import { useAdminAuth } from "../auth/useAdminAuth";

import {
  dashboardDateKey,
  feeBalance,
  financialSummary,
  isOverdue,
} from "../utils/dashboard";

import "../styles/AdminDashboard.css";

const INSTITUTE_TIME_ZONE = "Asia/Kolkata";

const statusLabels = {
  NEW: "New",
  CONTACTED: "Contacted",
  CLOSED: "Closed",
};

function greeting(now: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: INSTITUTE_TIME_ZONE,
      hour: "numeric",
      hourCycle: "h23",
    }).format(now),
  );

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";

  return "Good evening";
}

function Skeleton({ width }: { width: string }) {
  return (
    <span
      className="dashboard-skeleton"
      style={{ width }}
      aria-hidden="true"
    />
  );
}

type StatCardProps = {
  label: string;
  value?: string;
  detail?: string;
  icon: LucideIcon;
  to?: string;
  highlight?: boolean;
};

function StatCard({
  label,
  value,
  detail,
  icon: Icon,
  to,
  highlight = false,
}: StatCardProps) {
  const isLoading = value === undefined;

  const content = (
    <>
      <div className="dashboard-stat__top">
        <span>{label}</span>

        <span className="dashboard-stat__icon" aria-hidden="true">
          <Icon size={18} strokeWidth={1.9} />
        </span>
      </div>

      <strong className="dashboard-stat__value">
        {isLoading ? <Skeleton width="56%" /> : value}
      </strong>

      <p className="dashboard-stat__detail">
        {isLoading ? <Skeleton width="40%" /> : detail}
      </p>
    </>
  );

  const className = highlight
    ? "dashboard-stat dashboard-stat--highlight"
    : "dashboard-stat";

  if (to) {
    return (
      <Link className={className} to={to} aria-busy={isLoading}>
        {content}
      </Link>
    );
  }

  return (
    <div className={className} aria-busy={isLoading}>
      {content}
    </div>
  );
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="dashboard-empty">
      <CircleCheck size={28} aria-hidden="true" />

      <strong>{title}</strong>

      <p>{detail}</p>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="dashboard-table-skeleton" aria-hidden="true">
      {Array.from({ length: 4 }, (_, row) => (
        <div key={row}>
          <Skeleton width="32%" />
          <Skeleton width="26%" />
          <Skeleton width="14%" />
        </div>
      ))}
    </div>
  );
}

export function AdminDashboardPage() {
  const { user } = useAdminAuth();

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const refreshInterval = 30000;

  const students = useQuery({
    queryKey: ["students"],
    queryFn: fetchStudents,
    refetchInterval: refreshInterval,
  });

  const courses = useQuery({
    queryKey: ["courses"],
    queryFn: fetchCourses,
    refetchInterval: refreshInterval,
  });

  const enquiries = useQuery({
    queryKey: ["enquiries"],
    queryFn: fetchEnquiries,
    refetchInterval: refreshInterval,
  });

  const fees = useQuery({
    queryKey: ["fee-plans"],
    queryFn: fetchFeePlans,
    enabled: isSuperAdmin,
    refetchInterval: refreshInterval,
  });

  const payments = useQuery({
    queryKey: ["payments"],
    queryFn: fetchPayments,
    enabled: isSuperAdmin,
    refetchInterval: refreshInterval,
  });

  const queries = [
    students,
    courses,
    enquiries,
    ...(isSuperAdmin ? [fees, payments] : []),
  ];

  const refreshing = queries.some((query) => query.isFetching);

  const errors = [
    ["Students", students.isError],
    ["Courses", courses.isError],
    ["Enquiries", enquiries.isError],

    ...(isSuperAdmin
      ? [
          ["Fees", fees.isError],
          ["Payments", payments.isError],
        ]
      : []),
  ]
    .filter(([, failed]) => failed)
    .map(([name]) => name);

  const ready = (query: { isPending: boolean; isError: boolean }) =>
    !query.isPending && !query.isError;

  const now = new Date();

  const today = dashboardDateKey(now);

  const activeStudents =
    students.data?.filter((student) => student.status === "ACTIVE").length ?? 0;

  const activeCourses =
    courses.data?.filter((course) => course.isActive).length ?? 0;

  const newEnquiries = (enquiries.data ?? []).filter(
    (enquiry) => enquiry.status === "NEW",
  );

  const finance = financialSummary(fees.data ?? [], today);

  const overduePlans = (fees.data ?? [])
    .filter((plan) => isOverdue(plan, today))
    .sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));

  const currentMonth = today.slice(0, 7);

  const monthlyPayments = (payments.data ?? [])
    .filter((payment) => payment.paidAt.slice(0, 7) === currentMonth)
    .reduce((sum, payment) => sum + payment.amountPaise, 0);

  const lastUpdated = Math.min(...queries.map((query) => query.dataUpdatedAt));

  const hasNewEnquiries = ready(enquiries) && newEnquiries.length > 0;

  const hasOverdueFees = isSuperAdmin && ready(fees) && overduePlans.length > 0;

  const attentionReady = ready(enquiries) && (!isSuperAdmin || ready(fees));

  return (
    <div className="admin-dashboard">
      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="dashboard-header">
        <div>
          <span className="dashboard-eyebrow">
            {new Intl.DateTimeFormat("en-GB", {
              timeZone: INSTITUTE_TIME_ZONE,
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            }).format(now)}
          </span>

          <h1>Institute overview</h1>

          <p>
            {greeting(now)}
            {user?.firstName ? `, ${user.firstName}` : ""}. Here’s what’s
            happening at Learners today.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-refresh-button"
          aria-label={refreshing ? "Refreshing dashboard" : "Refresh dashboard"}
          title={refreshing ? "Refreshing dashboard" : "Refresh dashboard"}
          onClick={() => {
            void Promise.allSettled(queries.map((query) => query.refetch()));
          }}
          disabled={refreshing}
        >
          <RefreshCw
            size={16}
            className={refreshing ? "dashboard-spin" : ""}
            aria-hidden="true"
          />

          <span className="dashboard-refresh-button__text">
            {refreshing ? "Refreshing..." : "Refresh"}
          </span>
        </button>
      </header>

      {errors.length > 0 && (
        <div className="dashboard-error" role="alert">
          Some information could not be loaded: {errors.join(", ")}. Please
          press Refresh.
        </div>
      )}

      {/* =====================================================
          KEY NUMBERS
          ===================================================== */}

      <section aria-label="Key numbers">
        <div className="dashboard-stats">
          <StatCard
            label="Students"
            value={ready(students) ? String(students.data?.length ?? 0) : undefined}
            detail={`${activeStudents} currently active`}
            icon={GraduationCap}
            to="/admin/students"
          />

          <StatCard
            label="New enquiries"
            value={ready(enquiries) ? String(newEnquiries.length) : undefined}
            detail={
              newEnquiries.length > 0
                ? "Waiting for follow-up"
                : "All followed up"
            }
            icon={FileText}
            to="/admin/enquiries"
            highlight={hasNewEnquiries}
          />

          <StatCard
            label="Active courses"
            value={ready(courses) ? String(activeCourses) : undefined}
            detail={`${courses.data?.length ?? 0} courses in total`}
            icon={BookOpen}
            to="/admin/courses"
          />

          {isSuperAdmin && (
            <StatCard
              label="Outstanding fees"
              value={
                ready(fees) ? formatIndianRupees(finance.outstanding) : undefined
              }
              detail={`${overduePlans.length} overdue ${
                overduePlans.length === 1 ? "plan" : "plans"
              }`}
              icon={Wallet}
              to="/admin/fees"
              highlight={hasOverdueFees}
            />
          )}
        </div>
      </section>

      {/* =====================================================
          ENQUIRIES + ATTENTION
          ===================================================== */}

      <div className="dashboard-columns">
        <section
          className="dashboard-panel"
          aria-labelledby="recent-enquiries-title"
        >
          <div className="dashboard-panel__header">
            <div>
              <h2 id="recent-enquiries-title">Latest enquiries</h2>

              <p>Most recent requests from the website.</p>
            </div>

            <Link to="/admin/enquiries" className="dashboard-view-all">
              View all
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          {enquiries.isError ? (
            <div className="dashboard-panel-state">
              Enquiries could not be loaded.
            </div>
          ) : !ready(enquiries) ? (
            <TableSkeleton />
          ) : !enquiries.data?.length ? (
            <EmptyState
              title="No enquiries yet"
              detail="New website enquiries will appear here."
            />
          ) : (
            <div className="dashboard-table-scroll">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Course</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {enquiries.data.slice(0, 5).map((enquiry) => (
                    <tr key={enquiry.id}>
                      <td>
                        <strong>{enquiry.name}</strong>

                        <a href={`tel:${enquiry.phone.replace(/[^+\d]/g, "")}`}>
                          {enquiry.phone}
                        </a>
                      </td>

                      <td>{enquiry.course}</td>

                      <td>
                        <span
                          className={`dashboard-badge dashboard-badge--${enquiry.status.toLowerCase()}`}
                        >
                          {statusLabels[enquiry.status]}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section
          className="dashboard-panel"
          aria-labelledby="dashboard-attention-title"
        >
          <div className="dashboard-panel__header">
            <div>
              <h2 id="dashboard-attention-title">Needs attention</h2>

              <p>Items waiting on someone at the institute.</p>
            </div>
          </div>

          {!attentionReady ? (
            <div className="dashboard-attention" aria-hidden="true">
              <Skeleton width="100%" />
              <Skeleton width="100%" />
            </div>
          ) : !hasNewEnquiries && !hasOverdueFees ? (
            <EmptyState
              title="All caught up"
              detail="Nothing needs follow-up right now."
            />
          ) : (
            <ul className="dashboard-attention">
              {hasNewEnquiries && (
                <li>
                  <Link to="/admin/enquiries" className="dashboard-task">
                    <span className="dashboard-task__icon" aria-hidden="true">
                      <FileText size={18} strokeWidth={1.9} />
                    </span>

                    <div>
                      <strong>
                        {newEnquiries.length} new{" "}
                        {newEnquiries.length === 1 ? "enquiry" : "enquiries"}
                      </strong>

                      <span>Contact these prospective students.</span>
                    </div>

                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </li>
              )}

              {hasOverdueFees && (
                <li>
                  <Link
                    to="/admin/fees"
                    className="dashboard-task dashboard-task--urgent"
                  >
                    <span className="dashboard-task__icon" aria-hidden="true">
                      <AlertTriangle size={18} strokeWidth={1.9} />
                    </span>

                    <div>
                      <strong>
                        {overduePlans.length} overdue fee{" "}
                        {overduePlans.length === 1 ? "plan" : "plans"}
                      </strong>

                      <span>
                        Oldest: {overduePlans[0].enrollment.student.firstName}{" "}
                        {overduePlans[0].enrollment.student.lastName} ·{" "}
                        {formatIndianRupees(feeBalance(overduePlans[0]))}
                      </span>
                    </div>

                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </li>
              )}
            </ul>
          )}
        </section>
      </div>

      {/* =====================================================
          FINANCE — SUPER ADMIN ONLY
          ===================================================== */}

      {isSuperAdmin && (
        <section className="dashboard-panel" aria-labelledby="finance-title">
          <div className="dashboard-panel__header">
            <div>
              <h2 id="finance-title">Fee collections</h2>

              <p>Recorded payments across all fee plans.</p>
            </div>

            <Link to="/admin/payments" className="dashboard-view-all">
              View payments
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>

          <dl className="dashboard-finance">
            <div>
              <dt>Total collected</dt>
              <dd>
                {ready(fees) ? (
                  formatIndianRupees(finance.collected)
                ) : (
                  <Skeleton width="60%" />
                )}
              </dd>
            </div>

            <div>
              <dt>Collected this month</dt>
              <dd>
                {ready(payments) ? (
                  formatIndianRupees(monthlyPayments)
                ) : (
                  <Skeleton width="60%" />
                )}
              </dd>
            </div>

            <div>
              <dt>Outstanding</dt>
              <dd className="dashboard-finance__outstanding">
                {ready(fees) ? (
                  formatIndianRupees(finance.outstanding)
                ) : (
                  <Skeleton width="60%" />
                )}
              </dd>
            </div>
          </dl>

          {ready(payments) && (payments.data?.length ?? 0) > 0 && (
            <div className="dashboard-latest-payment">
              <span>Latest payment</span>

              {payments.data?.slice(0, 1).map((payment) => (
                <div className="dashboard-payment" key={payment.id}>
                  <div>
                    <strong>
                      {payment.feePlan.enrollment.student.firstName}{" "}
                      {payment.feePlan.enrollment.student.lastName}
                    </strong>

                    <span>{receiptNumber(payment)}</span>
                  </div>

                  <strong>{formatIndianRupees(payment.amountPaise)}</strong>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* =====================================================
          UPDATE STATUS
          ===================================================== */}

      <footer className="dashboard-update-note">
        <span
          className={
            errors.length
              ? "dashboard-status-dot dashboard-status-dot--error"
              : "dashboard-status-dot"
          }
          aria-hidden="true"
        />

        {refreshing
          ? "Updating information..."
          : errors.length
            ? "Some information could not be loaded."
            : lastUpdated
              ? `Updated at ${new Intl.DateTimeFormat("en-GB", {
                  timeZone: INSTITUTE_TIME_ZONE,
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(new Date(lastUpdated))} IST · refreshes every 30 seconds`
              : "Waiting for information"}
      </footer>
    </div>
  );
}
