import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, BookOpen, CircleCheck, Clock3, FileText, GraduationCap, RefreshCw, Wallet, type LucideIcon } from "lucide-react";
import { fetchCourses } from "../../api/courses";
import { fetchEnquiries } from "../../api/enquiries";
import { fetchFeePlans, formatIndianRupees } from "../../api/fees";
import { fetchPayments, receiptNumber } from "../../api/payments";
import { fetchStudents } from "../../api/students";
import { useAdminAuth } from "../auth/useAdminAuth";
import { dashboardDateKey, enquiryWeek, feeBalance, financialSummary, isOverdue } from "../utils/dashboard";
import "../styles/AdminDashboard.css";

const statusLabels = { NEW: "New", CONTACTED: "Contacted", CLOSED: "Closed" };
function StatCard({ label, value, detail, icon: Icon, to, tone = "blue" }: { label: string; value: string; detail: string; icon: LucideIcon; to?: string; tone?: string }) {
  const content = <><div className="dashboard-stat__top"><span>{label}</span><span className="dashboard-stat__icon"><Icon size={19} aria-hidden="true" /></span></div><strong>{value}</strong><div className="dashboard-stat__bottom"><span>{detail}</span>{to && <ArrowUpRight size={16} aria-hidden="true" />}</div></>;
  return to ? <Link className={`dashboard-stat dashboard-stat--${tone}`} to={to}>{content}</Link> : <div className={`dashboard-stat dashboard-stat--${tone}`}>{content}</div>;
}
function EmptyState({ title, detail }: { title: string; detail: string }) {
  return <div className="dashboard-empty"><CircleCheck size={25} aria-hidden="true" /><strong>{title}</strong><p>{detail}</p></div>;
}
export function AdminDashboardPage() {
  const { user } = useAdminAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const refreshInterval = 30000;
  const students = useQuery({ queryKey: ["students"], queryFn: fetchStudents, refetchInterval: refreshInterval });
  const courses = useQuery({ queryKey: ["courses"], queryFn: fetchCourses, refetchInterval: refreshInterval });
  const enquiries = useQuery({ queryKey: ["enquiries"], queryFn: fetchEnquiries, refetchInterval: refreshInterval });
  const fees = useQuery({ queryKey: ["fee-plans"], queryFn: fetchFeePlans, enabled: isSuperAdmin, refetchInterval: refreshInterval });
  const payments = useQuery({ queryKey: ["payments"], queryFn: fetchPayments, enabled: isSuperAdmin, refetchInterval: refreshInterval });
  const queries = [students, courses, enquiries, ...(isSuperAdmin ? [fees, payments] : [])];
  const refreshing = queries.some(query => query.isFetching);
  const errors = [["Students", students.isError], ["Courses", courses.isError], ["Enquiries", enquiries.isError], ...(isSuperAdmin ? [["Fees", fees.isError], ["Payments", payments.isError]] : [])].filter(([, failed]) => failed).map(([name]) => name);
  const today = dashboardDateKey(new Date());
  const newEnquiries = (enquiries.data ?? []).filter(enquiry => enquiry.status === "NEW");
  const week = enquiryWeek(enquiries.data ?? [], today);
  const weekTotal = week.reduce((sum, day) => sum + day.count, 0);
  const maxDaily = Math.max(1, ...week.map(day => day.count));
  const finance = financialSummary(fees.data ?? [], today);
  const overduePlans = (fees.data ?? []).filter(plan => isOverdue(plan, today)).sort((a, b) => (a.dueDate ?? "").localeCompare(b.dueDate ?? ""));
  const currentMonth = today.slice(0, 7);
  const monthlyPayments = (payments.data ?? []).filter(payment => payment.paidAt.slice(0, 7) === currentMonth).reduce((sum, payment) => sum + payment.amountPaise, 0);
  const ready = (query: { isPending: boolean; isError: boolean }) => !query.isPending && !query.isError;
  const statusDetail = (query: { isPending: boolean; isError: boolean }, detail: string) => query.isError ? "Unable to load · retry below" : query.isPending ? "Loading records…" : detail;
  const lastUpdated = Math.min(...queries.map(query => query.dataUpdatedAt));
  const quickActions = [
    { label: "Student records", detail: "Admissions & profiles", to: "/admin/students", icon: GraduationCap },
    { label: "Follow up enquiries", detail: "Review website requests", to: "/admin/enquiries", icon: FileText },
    { label: "Manage courses", detail: "Courses & availability", to: "/admin/courses", icon: BookOpen },
  ];
  return <div className="admin-dashboard">
    <header className="dashboard-heading"><div><span className="dashboard-eyebrow">Institute overview</span><h1>Welcome back{user?.firstName ? `, ${user.firstName}` : ""}.</h1><p>Here’s what’s happening at Learners.</p></div><div className="dashboard-heading__controls"><span className="dashboard-date">{new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", weekday: "short", day: "numeric", month: "short", year: "numeric" }).format(new Date())}</span><button onClick={() => { void Promise.allSettled(queries.map(query => query.refetch())); }} disabled={refreshing}><RefreshCw size={15} className={refreshing ? "dashboard-spin" : ""} aria-hidden="true" />{refreshing ? "Refreshing" : "Refresh"}</button></div></header>
    {errors.length > 0 && <div className="dashboard-error" role="alert">Unable to load {errors.join(", ")}. Use Refresh to try again.</div>}
    <section className={`dashboard-stats ${isSuperAdmin ? "dashboard-stats--four" : ""}`} aria-label="Institute summary">
      <StatCard label="Total students" value={ready(students) ? String(students.data?.length ?? 0) : "—"} detail={statusDetail(students, `${students.data?.filter(student => student.status === "ACTIVE").length ?? 0} active students`)} icon={GraduationCap} to="/admin/students" />
      <StatCard label="Active courses" value={ready(courses) ? String(courses.data?.filter(course => course.isActive).length ?? 0) : "—"} detail={statusDetail(courses, `${courses.data?.length ?? 0} courses in the catalogue`)} icon={BookOpen} to="/admin/courses" tone="green" />
      <StatCard label="New enquiries" value={ready(enquiries) ? String(newEnquiries.length) : "—"} detail={statusDetail(enquiries, "Awaiting first contact")} icon={FileText} to="/admin/enquiries" tone="amber" />
      {isSuperAdmin && <StatCard label="Outstanding fees" value={ready(fees) ? formatIndianRupees(finance.outstanding) : "—"} detail={statusDetail(fees, `${overduePlans.length} overdue fee plans`)} icon={Wallet} tone="violet" />}
    </section>
    <section className="dashboard-actions" aria-label="Quick actions">{quickActions.map(({ label, detail, to, icon: Icon }) => <Link key={to} to={to}><Icon size={20} aria-hidden="true" /><div><strong>{label}</strong><span>{detail}</span></div><ArrowUpRight size={16} aria-hidden="true" /></Link>)}</section>
    <div className="dashboard-main-grid">
      <section className="dashboard-panel"><div className="dashboard-panel__header"><div><h2>Recent enquiries</h2><p>Latest requests from your website</p></div><Link to="/admin/enquiries">View all<ArrowRight size={14} aria-hidden="true" /></Link></div>
        {!ready(enquiries) ? <div className="dashboard-panel-state">{enquiries.isError ? "Enquiries could not be loaded." : "Loading enquiries…"}</div> : !enquiries.data?.length ? <EmptyState title="Ready for your next enquiry" detail="New course requests will appear here when visitors submit the form." /> : <div className="dashboard-table-scroll"><table className="dashboard-table"><thead><tr><th>Prospective student</th><th>Course</th><th>Status</th></tr></thead><tbody>{enquiries.data.slice(0, 5).map(enquiry => <tr key={enquiry.id}><td><strong>{enquiry.name}</strong><a href={`tel:${enquiry.phone.replace(/[^+\d]/g, "")}`}>{enquiry.phone}</a></td><td>{enquiry.course}</td><td><span className={`dashboard-badge dashboard-badge--${enquiry.status.toLowerCase()}`}>{statusLabels[enquiry.status]}</span></td></tr>)}</tbody></table></div>}
      </section>
      <section className="dashboard-panel dashboard-week"><div className="dashboard-panel__header"><div><h2>Enquiry activity</h2><p>Last 7 calendar days · includes today</p></div><FileText size={18} aria-hidden="true" /></div>
        {!ready(enquiries) ? <div className="dashboard-panel-state">{enquiries.isError ? "Activity could not be loaded." : "Loading activity…"}</div> : <><div className="dashboard-week__total"><strong>{weekTotal}</strong><span>enquiries received</span></div><div className="dashboard-bars" role="img" aria-label={week.map(day => `${day.key}: ${day.count} enquiries`).join("; ")}>{week.map(day => <div className="dashboard-bar" key={day.key}><span>{day.count}</span><div className="dashboard-bar__track"><div style={{ height: `${day.count / maxDaily * 100}%` }} /></div><span>{day.label}</span></div>)}</div>{weekTotal === 0 && <p className="dashboard-chart-note">No enquiries received in this period.</p>}</>}
      </section>
    </div>
    <section className="dashboard-panel dashboard-attention"><div className="dashboard-panel__header"><div><h2>Needs attention</h2><p>Keep follow-ups and collections moving</p></div><Clock3 size={18} aria-hidden="true" /></div><div className="dashboard-attention__grid"><Link to="/admin/enquiries"><span className="dashboard-attention__icon"><FileText size={21} aria-hidden="true" /></span><div><strong>{ready(enquiries) ? `${newEnquiries.length} enquiries awaiting contact` : "Enquiry follow-ups"}</strong><p>{ready(enquiries) ? newEnquiries.length ? "Reach out to prospective students about courses and admissions." : "All enquiries have been contacted or closed." : "Open enquiries to review requests."}</p></div><ArrowRight size={18} aria-hidden="true" /></Link></div></section>
    {isSuperAdmin && <>
      <section className="dashboard-finance"><div className="dashboard-finance__intro"><span className="dashboard-eyebrow">Financial overview</span><h2>A clearer view of collections.</h2><p>Balances reflect recorded payments and discounts.</p></div><div className="dashboard-finance__metrics"><div><span>Total collected</span><strong>{ready(fees) ? formatIndianRupees(finance.collected) : "—"}</strong><small>Across all fee plans</small></div><div><span>Collected this month</span><strong>{ready(payments) ? formatIndianRupees(monthlyPayments) : "—"}</strong><small>By payment date</small></div><div className="dashboard-collection"><div><span>Active plan collection</span><strong>{ready(fees) ? `${finance.collectionPercent}%` : "—"}</strong></div><div className="dashboard-progress" role="progressbar" aria-label="Collection progress for active fee plans" aria-valuemin={0} aria-valuemax={100} {...(ready(fees) ? { "aria-valuenow": finance.collectionPercent } : {})}><span style={{ width: `${ready(fees) ? finance.collectionPercent : 0}%` }} /></div><small>{ready(fees) ? `${formatIndianRupees(finance.effective)} in active fees after discounts` : statusDetail(fees, "")}</small></div></div></section>
      <div className="dashboard-main-grid">
        <section className="dashboard-panel"><div className="dashboard-panel__header"><div><h2>Recent payments</h2><p>Latest recorded collections</p></div></div>{!ready(payments) ? <div className="dashboard-panel-state">{payments.isError ? "Payments could not be loaded." : "Loading payments…"}</div> : !payments.data?.length ? <EmptyState title="No payments recorded yet" detail="Record your first collection to see it here." /> : <div className="dashboard-table-scroll"><table className="dashboard-table"><thead><tr><th>Student / receipt</th><th>Date</th><th>Amount</th></tr></thead><tbody>{payments.data.slice(0, 5).map(payment => <tr key={payment.id}><td><strong>{payment.feePlan.enrollment.student.firstName} {payment.feePlan.enrollment.student.lastName}</strong><span>{receiptNumber(payment)}</span></td><td>{new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(payment.paidAt))}</td><td className="dashboard-table__amount">{formatIndianRupees(payment.amountPaise)}</td></tr>)}</tbody></table></div>}</section>
        <section className="dashboard-panel"><div className="dashboard-panel__header"><div><h2>Overdue balances</h2><p>Oldest due dates first</p></div></div>{!ready(fees) ? <div className="dashboard-panel-state">{fees.isError ? "Fee balances could not be loaded." : "Loading balances…"}</div> : !overduePlans.length ? <EmptyState title="No overdue fee plans" detail="Active plans with unpaid balances past their due date will appear here." /> : <ul className="dashboard-overdue">{overduePlans.slice(0, 4).map(plan => <li key={plan.id}><div><strong>{plan.enrollment.student.firstName} {plan.enrollment.student.lastName}</strong><p>{plan.enrollment.course.title}</p><span>Due {new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(plan.dueDate!))}</span></div><strong>{formatIndianRupees(feeBalance(plan))}</strong></li>)}</ul>}</section>
      </div>
    </>}
    <footer className="dashboard-update-note"><span className="dashboard-status-dot" />{refreshing ? "Updating dashboard…" : errors.length ? "Some data could not be loaded" : lastUpdated ? `Updated ${new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }).format(new Date(lastUpdated))} · Refreshes every 30 seconds` : "Waiting for data"}</footer>
  </div>;
}
