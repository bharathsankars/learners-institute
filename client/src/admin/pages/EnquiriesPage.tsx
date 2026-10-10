import { AddStudentModal } from "../components/AddStudentModal";
import type { CreateStudentInput } from "../../api/students";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, CircleCheck, Clock3, FileText, MessageSquare, Phone, RefreshCw, Search, X } from "lucide-react";
import { admitEnquiry, fetchEnquiries, updateEnquiryStatus, type Enquiry, type EnquiryStatus } from "../../api/enquiries";
import { EnquiryDetailsDialog } from "../components/EnquiryDetailsDialog";
import { enquiryStatusLabels, formatEnquiryDate, enquiryCounts, filterEnquiries, paginateEnquiries, type EnquiryFilter, type EnquirySort } from "../utils/enquiries";
import "../styles/Enquiries.css";

const summaryCards = [
  { key: "ALL", label: "All enquiries", description: "Website requests", icon: FileText, tone: "blue" },
  { key: "NEW", label: "Awaiting contact", description: "Ready for follow-up", icon: Clock3, tone: "amber" },
  { key: "CONTACTED", label: "Contacted", description: "Conversations in progress", icon: MessageSquare, tone: "green" },
  { key: "CLOSED", label: "Closed", description: "Follow-up completed", icon: CircleCheck, tone: "slate" },
] as const;

export function EnquiriesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<EnquiryFilter>("ALL");
  const [course, setCourse] = useState("");
  const [sort, setSort] = useState<EnquirySort>("NEWEST");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [admitting, setAdmitting] = useState<Enquiry | null>(null);
  const initialValues = useMemo(() => {
    if (!admitting) return undefined;
    const [firstName, ...rest] = admitting.name.trim().split(/\s+/);
    return { firstName, lastName: rest.join(" "), phone: admitting.phone };
  }, [admitting]);
  const [successMessage, setSuccessMessage] = useState("");
  const query = useQuery({ queryKey: ["enquiries"], queryFn: fetchEnquiries, refetchInterval: 30000 });
  const mutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: EnquiryStatus }) => updateEnquiryStatus(id, status),
    onSuccess: async updated => {
      queryClient.setQueryData<Enquiry[]>(["enquiries"], records => records?.map(record => record.id === updated.id ? updated : record));
      setSuccessMessage(`${updated.name} marked as ${enquiryStatusLabels[updated.status].toLowerCase()}.`);
      await queryClient.invalidateQueries({ queryKey: ["enquiries"] });
    },
  });
  const admission = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateStudentInput }) => admitEnquiry(id, input),
    onSuccess: async ({ student, enquiry }) => {
      queryClient.setQueryData<Enquiry[]>(["enquiries"], records => records?.map(record => record.id === enquiry.id ? enquiry : record));
      setAdmitting(null);
      setSuccessMessage(`${student.firstName} admitted successfully · ${student.admissionNumber}. The enquiry is closed.`);
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["enquiries"] }), queryClient.invalidateQueries({ queryKey: ["students"] })]);
    },
  });
  const enquiries = query.data ?? [];
  const counts = enquiryCounts(enquiries);
  const filtered = filterEnquiries(enquiries, { search, status: filter, course, sort });
  const paginated = paginateEnquiries(filtered, page);
  const courses = [...new Set(enquiries.map(enquiry => enquiry.course))].sort((a, b) => a.localeCompare(b));
  const selected = enquiries.find(enquiry => enquiry.id === selectedId);
  const hasFilters = !!search.trim() || filter !== "ALL" || !!course;
  const loaded = query.data !== undefined;
  const changeStatus = (id: string, status: EnquiryStatus) => { if (mutation.isPending) return; setSuccessMessage(""); mutation.mutate({ id, status }); };
  const selectFilter = (status: EnquiryFilter) => { setFilter(status); setPage(1); };
  const resetFilters = () => { setSearch(""); setFilter("ALL"); setCourse(""); setPage(1); };
  const openDetails = (id: string) => { if (mutation.isPending) return; mutation.reset(); setSelectedId(id); };
  return <div className="enquiries-page">
    <header className="enquiries-heading"><div><span className="enquiries-eyebrow">Admissions & follow-up</span><h1>Enquiries</h1><p>Turn interest into a conversation. Review requests and keep follow-ups moving.</p></div><button className="enquiries-button" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={15} aria-hidden="true" />{query.isFetching ? "Refreshing…" : "Refresh"}</button></header>
    <section className="enquiries-summary" aria-label="Enquiry status summary">{summaryCards.map(({ key, label, description, icon: Icon, tone }) => <button key={key} className={`enquiries-summary-card enquiries-summary-card--${tone}${filter === key ? " enquiries-summary-card--selected" : ""}`} aria-pressed={filter === key} onClick={() => selectFilter(key)}><div><span>{label}</span><span className="enquiries-summary-icon"><Icon size={18} aria-hidden="true" /></span></div><strong>{loaded ? counts[key] : "—"}</strong><small>{description}</small></button>)}</section>
    {query.isError && <div className="enquiries-notice enquiries-notice--error" role="alert">{query.error.message}{loaded ? " Showing previously loaded requests. Refresh to try again." : " Use Refresh to try again."}</div>}
    {successMessage && <div className="enquiries-notice" role="status"><CircleCheck size={17} aria-hidden="true" /><span>{successMessage}</span><button aria-label="Dismiss confirmation" onClick={() => setSuccessMessage("")}><X size={16} /></button></div>}
    {mutation.isError && !selected && <div className="enquiries-notice enquiries-notice--error" role="alert"><span>{mutation.error.message}</span><button aria-label="Dismiss error" onClick={() => mutation.reset()}><X size={16} /></button></div>}
    <section className="enquiries-inbox" aria-label="Enquiry inbox">
      <div className="enquiries-inbox__heading"><div><h2>Website requests</h2><p>{loaded ? `${filtered.length} ${filtered.length === 1 ? "enquiry" : "enquiries"}${hasFilters ? " matching your filters" : " received"}` : "Loading your inbox"}</p></div><span className="enquiries-auto-refresh"><span />Updates every 30 seconds</span></div>
      <div className="enquiries-toolbar"><label className="enquiries-search"><span className="enquiries-sr-only">Search enquiries</span><Search size={17} aria-hidden="true" /><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, phone, course or message" /></label><label className="enquiries-filter"><span>Course</span><select value={course} onChange={event => { setCourse(event.target.value); setPage(1); }}><option value="">All courses</option>{courses.map(title => <option key={title} value={title}>{title}</option>)}</select></label><label className="enquiries-filter"><span>Sort by</span><select value={sort} onChange={event => { setSort(event.target.value as EnquirySort); setPage(1); }}><option value="NEWEST">Newest first</option><option value="OLDEST">Oldest first</option><option value="NEW_FIRST">Awaiting contact first</option></select></label></div>
      <div className="enquiries-tabs" role="group" aria-label="Filter by status">{summaryCards.map(({ key, label }) => <button key={key} className={filter === key ? "enquiries-tab--active" : ""} aria-pressed={filter === key} onClick={() => selectFilter(key)}>{key === "ALL" ? "All" : label}<span>{loaded ? counts[key] : "—"}</span></button>)}{hasFilters && <button className="enquiries-clear" onClick={resetFilters}><X size={13} aria-hidden="true" />Clear filters</button>}</div>
      {query.isPending ? <div className="enquiries-empty" role="status"><FileText size={27} aria-hidden="true" /><h3>Loading enquiries…</h3><p>Your website requests will appear here.</p></div> : !loaded ? <div className="enquiries-empty"><FileText size={27} aria-hidden="true" /><h3>Unable to load enquiries</h3><p>Refresh to reconnect and retrieve your requests.</p></div> : !filtered.length ? <div className="enquiries-empty"><MessageSquare size={27} aria-hidden="true" /><h3>{hasFilters ? "No matching enquiries" : "Your inbox is ready"}</h3><p>{hasFilters ? "Try another search or clear your filters to see all requests." : "Enquiries submitted on the website will appear here for your team to follow up."}</p>{hasFilters && <button className="enquiries-button" onClick={resetFilters}>Clear filters</button>}</div> : <div className="enquiries-table-scroll"><table className="enquiries-table"><thead><tr><th>Applicant</th><th>Course & message</th><th>Received</th><th>Status</th><th><span className="enquiries-sr-only">Actions</span></th></tr></thead><tbody>{paginated.records.map(enquiry => <tr key={enquiry.id}><td data-label="Applicant"><div className="enquiries-applicant"><span className="enquiries-avatar" aria-hidden="true">{enquiry.name.trim().slice(0, 1).toUpperCase()}</span><div><button className="enquiries-name" disabled={mutation.isPending} onClick={() => openDetails(enquiry.id)}>{enquiry.name}</button><a href={`tel:${enquiry.phone.replace(/[^+\d]/g, "")}`}><Phone size={11} aria-hidden="true" />{enquiry.phone}</a></div></div></td><td data-label="Course & message"><strong className="enquiries-course-name">{enquiry.course}</strong><p className="enquiries-message-preview">{enquiry.message || "No additional message"}</p></td><td data-label="Received"><time dateTime={enquiry.createdAt}>{formatEnquiryDate(enquiry.createdAt)}</time></td><td data-label="Status"><span className={`enquiry-badge enquiry-badge--${enquiry.status.toLowerCase()}`}>{enquiryStatusLabels[enquiry.status]}</span>{enquiry.student && <small className="enquiries-admitted">Admitted · {enquiry.student.admissionNumber}</small>}</td><td className="enquiries-row-action"><button className="enquiries-view" disabled={mutation.isPending} onClick={() => openDetails(enquiry.id)} aria-label={`View enquiry from ${enquiry.name}`}>View<ArrowRight size={14} aria-hidden="true" /></button></td></tr>)}</tbody></table></div>}
      {loaded && filtered.length > 0 && <footer className="enquiries-pagination"><span>Showing {paginated.start}–{paginated.end} of {filtered.length} enquiries</span><div><button className="enquiries-page-button" disabled={paginated.currentPage === 1} aria-label="Previous page" onClick={() => setPage(paginated.currentPage - 1)}><ChevronLeft size={17} /></button><span>Page {paginated.currentPage} of {paginated.pageCount}</span><button className="enquiries-page-button" disabled={paginated.currentPage === paginated.pageCount} aria-label="Next page" onClick={() => setPage(paginated.currentPage + 1)}><ChevronRight size={17} /></button></div></footer>}
    </section>
    {selected && <EnquiryDetailsDialog enquiry={selected} isSaving={mutation.isPending} error={mutation.error?.message} onClose={() => setSelectedId(null)} onStatusChange={status => changeStatus(selected.id, status)} onAdmit={() => { admission.reset(); setSelectedId(null); setAdmitting(selected); }} />}
    {admitting && <AddStudentModal key={admitting.id} open initialValues={initialValues} isSubmitting={admission.isPending} serverError={admission.error?.message} onClose={() => { if (!admission.isPending) setAdmitting(null); }} onCreate={async input => { await admission.mutateAsync({ id: admitting.id, input }); }} onUpdate={async () => {}} />}
  </div>;
}
