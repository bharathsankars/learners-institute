import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
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

const statusLabels = {
  NEW: "New",
  CONTACTED: "Contacted",
  CLOSED: "Closed",
};

type SummaryCardProps = {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  to?: string;
};

function SummaryCard({
  label,
  value,
  detail,
  icon: Icon,
  to,
}: SummaryCardProps) {
  const content = (
    <>
      <div className="dashboard-summary__icon" aria-hidden="true">
        <Icon size={24} strokeWidth={1.8} />
      </div>

      <div className="dashboard-summary__content">
        <span>{label}</span>
        <strong>{value}</strong>
        <p>{detail}</p>
      </div>

      {to && (
        <ArrowRight
          className="dashboard-summary__arrow"
          size={20}
          aria-hidden="true"
        />
      )}
    </>
  );

  if (to) {
    return (
      <Link className="dashboard-summary" to={to}>
        {content}
      </Link>
    );
  }

  return <div className="dashboard-summary">{content}</div>;
}

function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="dashboard-empty">
      <CircleCheck size={32} aria-hidden="true" />

      <strong>{title}</strong>

      <p>{detail}</p>
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

  const today = dashboardDateKey(new Date());

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

  const quickActions = [
    {
      label: "Students",
      detail: "View student records and admissions",
      to: "/admin/students",
      icon: GraduationCap,
    },
    {
      label: "Enquiries",
      detail: "Follow up website enquiries",
      to: "/admin/enquiries",
      icon: FileText,
    },
    {
      label: "Courses",
      detail: "Manage available courses",
      to: "/admin/courses",
      icon: BookOpen,
    },
  ];

  return (
    <div className="admin-dashboard">
      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="dashboard-header">
        <div>
          <span className="dashboard-eyebrow">Learners Admin</span>

          <h1>
            Welcome
            {user ? `, ${user.firstName} ${user.lastName}`.trimEnd() : ""}
          </h1>

          <p>Choose what you would like to manage today.</p>
        </div>

        <div className="dashboard-header__right">
          <span className="dashboard-date">
            {new Intl.DateTimeFormat("en-GB", {
              timeZone: "Europe/Berlin",
              weekday: "long",
              day: "numeric",
              month: "long",
            }).format(new Date())}
          </span>

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
              size={18}
              className={refreshing ? "dashboard-spin" : ""}
              aria-hidden="true"
            />

            <span className="dashboard-refresh-button__text">
              {refreshing ? "Refreshing..." : "Refresh"}
            </span>
          </button>
        </div>
      </header>

      {errors.length > 0 && (
        <div className="dashboard-error" role="alert">
          Some information could not be loaded: {errors.join(", ")}. Please
          press Refresh.
        </div>
      )}

      {/* =====================================================
          PRIMARY ACTIONS
          ===================================================== */}

      <section
        className="dashboard-section"
        aria-labelledby="dashboard-actions-title"
      >
        <div className="dashboard-section__heading">
          <div>
            <h2 id="dashboard-actions-title">What would you like to do?</h2>

            <p>Select an area to open and manage it.</p>
          </div>
        </div>

        <div className="dashboard-actions">
          {quickActions.map(({ label, detail, to, icon: Icon }) => (
            <Link key={to} to={to} className="dashboard-action">
              <span className="dashboard-action__icon" aria-hidden="true">
                <Icon size={30} strokeWidth={1.8} />
              </span>

              <div>
                <strong>{label}</strong>

                <span>{detail}</span>
              </div>

              <ArrowRight size={22} aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      {/* =====================================================
          AT A GLANCE
          ===================================================== */}

      <section
        className="dashboard-section"
        aria-labelledby="dashboard-summary-title"
      >
        <div className="dashboard-section__heading">
          <div>
            <h2 id="dashboard-summary-title">At a glance</h2>

            <p>Current institute information.</p>
          </div>
        </div>

        <div className="dashboard-summary-grid">
          <SummaryCard
            label="Students"
            value={ready(students) ? String(students.data?.length ?? 0) : "—"}
            detail={ready(students) ? `${activeStudents} active` : "Loading..."}
            icon={GraduationCap}
            to="/admin/students"
          />

          <SummaryCard
            label="New enquiries"
            value={ready(enquiries) ? String(newEnquiries.length) : "—"}
            detail={
              ready(enquiries)
                ? newEnquiries.length === 1
                  ? "Needs follow-up"
                  : "Need follow-up"
                : "Loading..."
            }
            icon={FileText}
            to="/admin/enquiries"
          />

          <SummaryCard
            label="Active courses"
            value={ready(courses) ? String(activeCourses) : "—"}
            detail={
              ready(courses)
                ? `${courses.data?.length ?? 0} total courses`
                : "Loading..."
            }
            icon={BookOpen}
            to="/admin/courses"
          />

          {isSuperAdmin && (
            <SummaryCard
              label="Outstanding fees"
              value={
                ready(fees) ? formatIndianRupees(finance.outstanding) : "—"
              }
              detail={
                ready(fees) ? `${overduePlans.length} overdue` : "Loading..."
              }
              icon={Wallet}
            />
          )}
        </div>
      </section>

      {/* =====================================================
          NEEDS ATTENTION
          ===================================================== */}

      <section
        className="dashboard-section"
        aria-labelledby="dashboard-attention-title"
      >
        <div className="dashboard-section__heading">
          <div>
            <h2 id="dashboard-attention-title">Needs your attention</h2>

            <p>Items that may need action.</p>
          </div>
        </div>

        <Link
          to="/admin/enquiries"
          className={
            newEnquiries.length > 0
              ? "dashboard-alert dashboard-alert--attention"
              : "dashboard-alert"
          }
        >
          <span className="dashboard-alert__icon" aria-hidden="true">
            <FileText size={28} strokeWidth={1.8} />
          </span>

          <div>
            <strong>
              {ready(enquiries)
                ? newEnquiries.length > 0
                  ? `${newEnquiries.length} new ${
                      newEnquiries.length === 1 ? "enquiry" : "enquiries"
                    } waiting`
                  : "No new enquiries waiting"
                : "Checking enquiries..."}
            </strong>

            <p>
              {ready(enquiries)
                ? newEnquiries.length > 0
                  ? "Open enquiries and contact these prospective students."
                  : "All enquiries have already been contacted or closed."
                : "Please wait while enquiry information loads."}
            </p>
          </div>

          <span className="dashboard-alert__action">
            Open enquiries
            <ArrowRight size={18} aria-hidden="true" />
          </span>
        </Link>
      </section>

      {/* =====================================================
          RECENT ENQUIRIES
          ===================================================== */}

      <section
        className="dashboard-section dashboard-panel"
        aria-labelledby="recent-enquiries-title"
      >
        <div className="dashboard-panel__header">
          <div>
            <h2 id="recent-enquiries-title">Latest enquiries</h2>

            <p>Most recent requests from the website.</p>
          </div>

          <Link to="/admin/enquiries" className="dashboard-view-all">
            View all enquiries
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </div>

        {!ready(enquiries) ? (
          <div className="dashboard-panel-state">
            {enquiries.isError
              ? "Enquiries could not be loaded."
              : "Loading enquiries..."}
          </div>
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

      {/* =====================================================
          FINANCE — SUPER ADMIN ONLY
          ===================================================== */}

      {isSuperAdmin && (
        <section
          className="dashboard-section dashboard-finance"
          aria-labelledby="finance-title"
        >
          <div className="dashboard-section__heading">
            <div>
              <h2 id="finance-title">Financial summary</h2>

              <p>Simple overview of recorded fee collections.</p>
            </div>
          </div>

          <div className="dashboard-finance__grid">
            <div className="dashboard-finance-card">
              <span>Total collected</span>

              <strong>
                {ready(fees) ? formatIndianRupees(finance.collected) : "—"}
              </strong>
            </div>

            <div className="dashboard-finance-card">
              <span>Collected this month</span>

              <strong>
                {ready(payments) ? formatIndianRupees(monthlyPayments) : "—"}
              </strong>
            </div>

            <div className="dashboard-finance-card dashboard-finance-card--attention">
              <span>Outstanding</span>

              <strong>
                {ready(fees) ? formatIndianRupees(finance.outstanding) : "—"}
              </strong>

              <small>
                {ready(fees)
                  ? `${overduePlans.length} overdue fee ${
                      overduePlans.length === 1 ? "plan" : "plans"
                    }`
                  : "Loading..."}
              </small>
            </div>
          </div>

          {ready(payments) && (payments.data?.length ?? 0) > 0 && (
            <div className="dashboard-finance__recent">
              <h3>Latest payment</h3>

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

          {ready(fees) && overduePlans.length > 0 && (
            <div className="dashboard-finance__recent">
              <h3>Oldest overdue fee</h3>

              {overduePlans.slice(0, 1).map((plan) => (
                <div className="dashboard-payment" key={plan.id}>
                  <div>
                    <strong>
                      {plan.enrollment.student.firstName}{" "}
                      {plan.enrollment.student.lastName}
                    </strong>

                    <span>{plan.enrollment.course.title}</span>
                  </div>

                  <strong>{formatIndianRupees(feeBalance(plan))}</strong>
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
        <span className="dashboard-status-dot" aria-hidden="true" />

        {refreshing
          ? "Updating information..."
          : errors.length
            ? "Some information could not be loaded."
            : lastUpdated
              ? `Updated at ${new Intl.DateTimeFormat("en-GB", {
                   timeZone: "Asia/Kolkata",
                   hour: "2-digit",
                   minute: "2-digit",
                 }).format(new Date(lastUpdated))} IST`
              : "Waiting for information"}
      </footer>
    </div>
  );
}
