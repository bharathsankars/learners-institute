import { DeleteConfirmationDialog } from "../components/DeleteConfirmationDialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, CircleCheck, GraduationCap, Pencil, Phone, Plus, RefreshCw, Search, Trash2, UserCheck, UserMinus, X } from "lucide-react";
import { createStudent, deleteStudent, fetchStudents, updateStudent, type CreateStudentInput, type Student, type UpdateStudentInput } from "../../api/students";
import { AddStudentModal } from "../components/AddStudentModal";
import { StudentDetailsDialog } from "../components/StudentDetailsDialog";
import { filterStudents, paginateStudents, studentCounts, studentDate, studentName, studentStatusLabels, type StudentFilter, type StudentSort } from "../utils/students";
import "../styles/AdminDirectory.css";

const cards = [
  { key: "ALL", label: "All students", description: "Registered student records", icon: GraduationCap, tone: "blue" },
  { key: "ACTIVE", label: "Active", description: "Currently learning", icon: UserCheck, tone: "green" },
  { key: "INACTIVE", label: "Inactive", description: "Not currently active", icon: UserMinus, tone: "amber" },
  { key: "COMPLETED", label: "Completed", description: "Learning completed", icon: CircleCheck, tone: "slate" },
] as const;
export function StudentsPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["students"], queryFn: fetchStudents, refetchInterval: 30000 });
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StudentFilter>("ALL");
  const [sort, setSort] = useState<StudentSort>("NEWEST");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<Student | null>(null);
  const students = query.data ?? [];
  const counts = studentCounts(students);
  const filtered = filterStudents(students, { search, status: filter, sort });
  const pagination = paginateStudents(filtered, page);
  const loaded = query.data !== undefined;
  const hasFilters = !!search.trim() || filter !== "ALL";
  const selected = students.find(student => student.id === profileId);
  const saveSuccess = async (student: Student, action: string) => {
    queryClient.setQueryData<Student[]>(["students"], records => records ? [student, ...records.filter(record => record.id !== student.id)] : [student]);
    setFormOpen(false); setEditing(null); setFormError(""); setNotice(`${studentName(student)} ${action}.`);
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["students"] }),
      queryClient.invalidateQueries({ queryKey: ["fee-plans"] }),
      queryClient.invalidateQueries({ queryKey: ["payments"] }),
    ]);
  };
  const createMutation = useMutation({ mutationFn: createStudent, onSuccess: student => saveSuccess(student, "added successfully"), onError: error => setFormError(error.message) });
  const updateMutation = useMutation({ mutationFn: ({ id, input }: { id: string; input: UpdateStudentInput }) => updateStudent(id, input), onSuccess: student => saveSuccess(student, "updated successfully"), onError: error => setFormError(error.message) });
  const deleteMutation = useMutation({ mutationFn: deleteStudent, onSuccess: async (_data, id) => { setDeleting(null); queryClient.setQueryData<Student[]>(["students"], records => records?.filter(record => record.id !== id)); setNotice("Student record deleted."); await queryClient.invalidateQueries({ queryKey: ["students"] }); } });
  const saving = createMutation.isPending || updateMutation.isPending;
  const busy = saving || deleteMutation.isPending;
  const openForm = (student: Student | null = null) => { if (busy) return; setProfileId(null); setEditing(student); setFormError(""); setFormOpen(true); };
  const resetFilters = () => { setSearch(""); setFilter("ALL"); setPage(1); };
  const selectFilter = (status: StudentFilter) => { setFilter(status); setPage(1); };
  const handleDelete = (student: Student) => {
    if (busy) return;
    deleteMutation.reset(); setProfileId(null); setNotice(""); setDeleting(student);
  };
  const handleCreate = async (input: CreateStudentInput) => { setFormError(""); await createMutation.mutateAsync(input); };
  const handleUpdate = async (id: string, input: UpdateStudentInput) => { setFormError(""); await updateMutation.mutateAsync({ id, input }); };
  return <div className="admin-directory">
    <header className="admin-directory-heading"><div><span className="admin-directory-eyebrow">Student management</span><h1>Students</h1><p>Your student directory. Keep profiles, contact details and learning status up to date.</p></div><div className="admin-directory-heading__actions"><button className="admin-directory-button" disabled={query.isFetching} onClick={() => void query.refetch()} aria-label="Refresh students"><RefreshCw size={15} aria-hidden="true" />Refresh</button><button className="admin-directory-button admin-directory-button--primary" disabled={busy} onClick={() => openForm()}><Plus size={16} aria-hidden="true" />Add student</button></div></header>
    <section className="admin-directory-summary" aria-label="Student status overview">{cards.map(({ key, label, description, icon: Icon, tone }) => <button key={key} className={`admin-directory-summary-card admin-directory-summary-card--${tone}${filter === key ? " admin-directory-summary-card--selected" : ""}`} aria-pressed={filter === key} onClick={() => selectFilter(key)}><div><span>{label}</span><span className="admin-directory-summary-icon"><Icon size={18} aria-hidden="true" /></span></div><strong>{loaded ? counts[key] : "—"}</strong><small>{description}</small></button>)}</section>
    {query.isError && <div className="admin-directory-notice admin-directory-notice--error" role="alert">{query.error.message}{loaded ? " Showing previously loaded records. Refresh to try again." : " Use Refresh to try again."}</div>}
    {notice && <div className="admin-directory-notice" role="status"><CircleCheck size={17} aria-hidden="true" /><span>{notice}</span><button aria-label="Dismiss confirmation" onClick={() => setNotice("")}><X size={16} /></button></div>}
    {!deleting && deleteMutation.isError && <div className="admin-directory-notice admin-directory-notice--error" role="alert"><span>{deleteMutation.error.message}</span><button aria-label="Dismiss error" onClick={() => deleteMutation.reset()}><X size={16} /></button></div>}
    <section className="admin-directory-register" aria-label="Student register"><div className="admin-directory-register__heading"><div><h2>Student register</h2><p>{loaded ? `${filtered.length} ${filtered.length === 1 ? "student" : "students"}${hasFilters ? " matching your filters" : " registered"}` : "Loading your student records"}</p></div><span className="admin-directory-auto-refresh"><span />Updates every 30 seconds</span></div>
      <div className="admin-directory-toolbar"><label className="admin-directory-search"><span className="admin-directory-sr-only">Search students</span><Search size={17} aria-hidden="true" /><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search name, admission number, phone or email" /></label><label className="admin-directory-filter"><span>Sort by</span><select value={sort} onChange={event => { setSort(event.target.value as StudentSort); setPage(1); }}><option value="NEWEST">Newest first</option><option value="OLDEST">Oldest first</option><option value="NAME">Name A–Z</option><option value="ADMISSION">Admission number</option></select></label></div>
      <div className="admin-directory-tabs" role="group" aria-label="Filter by student status">{cards.map(({ key, label }) => <button key={key} aria-pressed={filter === key} className={filter === key ? "admin-directory-tab--active" : ""} onClick={() => selectFilter(key)}>{key === "ALL" ? "All" : label}<span>{loaded ? counts[key] : "—"}</span></button>)}{hasFilters && <button className="admin-directory-clear" onClick={resetFilters}><X size={13} aria-hidden="true" />Clear filters</button>}</div>
      {query.isPending ? <div className="admin-directory-empty" role="status"><GraduationCap size={28} aria-hidden="true" /><h3>Loading students…</h3><p>Your student records will appear here.</p></div> : !loaded ? <div className="admin-directory-empty"><h3>Unable to load students</h3><p>Refresh to retrieve your student records.</p></div> : !filtered.length ? <div className="admin-directory-empty"><GraduationCap size={28} aria-hidden="true" /><h3>{hasFilters ? "No matching students" : "Start your student register"}</h3><p>{hasFilters ? "Try another search or clear your filters." : "Add a student to manage their profile and contact information. Admission numbers are assigned automatically."}</p><button className="admin-directory-button admin-directory-button--primary" onClick={hasFilters ? resetFilters : () => openForm()}>{hasFilters ? "Clear filters" : "Add your first student"}</button></div> : <div className="admin-directory-table-scroll"><table className="admin-directory-table"><thead><tr><th>Student / admission no.</th><th>Contact details</th><th>Status</th><th>Added</th><th><span className="admin-directory-sr-only">Actions</span></th></tr></thead><tbody>{pagination.records.map(student => <tr key={student.id}><td><div className="admin-directory-identity"><span className="admin-directory-avatar" aria-hidden="true">{student.firstName.slice(0, 1).toUpperCase()}</span><div><button className="admin-directory-name" disabled={busy} onClick={() => setProfileId(student.id)}>{studentName(student)}</button><span>{student.admissionNumber}</span></div></div></td><td><a className="admin-directory-phone" href={`tel:${student.phone.replace(/[^+\d]/g, "")}`}><Phone size={12} aria-hidden="true" />{student.phone}</a>{student.email ? <a className="admin-directory-email" href={`mailto:${student.email}`}>{student.email}</a> : <span className="admin-directory-email">No email provided</span>}</td><td><span className={`admin-directory-badge admin-directory-badge--${student.status.toLowerCase()}`}>{studentStatusLabels[student.status]}</span></td><td><time dateTime={student.createdAt}>{studentDate(student.createdAt)}</time></td><td><div className="admin-directory-row-actions"><button className="admin-directory-view" disabled={busy} onClick={() => setProfileId(student.id)} aria-label={`View ${studentName(student)}`}>View<ArrowRight size={13} aria-hidden="true" /></button><button className="admin-directory-icon-button" disabled={busy} aria-label={`Edit ${studentName(student)}`} onClick={() => openForm(student)}><Pencil size={15} /></button><button className="admin-directory-icon-button admin-directory-icon-button--delete" disabled={busy} aria-label={`Delete ${studentName(student)}`} onClick={() => handleDelete(student)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>}
      {loaded && filtered.length > 0 && <footer className="admin-directory-pagination"><span>Showing {pagination.start}–{pagination.end} of {filtered.length} students</span><div><button className="admin-directory-page-button" disabled={pagination.currentPage === 1} aria-label="Previous page" onClick={() => setPage(pagination.currentPage - 1)}><ChevronLeft size={17} /></button><span>Page {pagination.currentPage} of {pagination.pageCount}</span><button className="admin-directory-page-button" disabled={pagination.currentPage === pagination.pageCount} aria-label="Next page" onClick={() => setPage(pagination.currentPage + 1)}><ChevronRight size={17} /></button></div></footer>}
    </section>
    {selected && <StudentDetailsDialog student={selected} onClose={() => setProfileId(null)} onEdit={() => openForm(selected)} />}
    {deleting && <DeleteConfirmationDialog entity="student" name={studentName(deleting)} reference={deleting.admissionNumber} isDeleting={deleteMutation.isPending} error={deleteMutation.error?.message} onClose={() => { if (!deleteMutation.isPending) { setDeleting(null); deleteMutation.reset(); } }} onConfirm={() => { if (!busy) deleteMutation.mutate(deleting.id); }} />}
    <AddStudentModal open={formOpen} student={editing} isSubmitting={saving} serverError={formError} onClose={() => { if (!saving) { setFormOpen(false); setEditing(null); setFormError(""); } }} onCreate={handleCreate} onUpdate={handleUpdate} />
  </div>;
}
