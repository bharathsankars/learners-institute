import { DeleteConfirmationDialog } from "../components/DeleteConfirmationDialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, CircleCheck, FolderOpen, PauseCircle, Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { createCourse, deleteCourse, fetchCourses, updateCourse, type Course, type CreateCourseInput, type UpdateCourseInput } from "../../api/courses";
import { CourseModal } from "../components/CourseModal";
import { CourseDetailsDialog } from "../components/CourseDetailsDialog";
import { courseCategory, courseCounts, filterCourses, paginateCourses, type CourseFilter, type CourseSort } from "../utils/courses";
import "../styles/AdminDirectory.css";
import "../styles/CourseDirectory.css";

const summaryCards = [
  { key: "ALL", label: "All courses", description: "Your training catalogue", icon: BookOpen, tone: "blue" },
  { key: "ACTIVE", label: "Active", description: "Currently available", icon: CircleCheck, tone: "green" },
  { key: "INACTIVE", label: "Inactive", description: "Not currently available", icon: PauseCircle, tone: "amber" },
] as const;
export function CoursesPage() {
  const queryClient = useQueryClient();
  const query = useQuery({ queryKey: ["courses"], queryFn: fetchCourses, refetchInterval: 30000 });
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CourseFilter>("ALL");
  const [category, setCategory] = useState("");
  const [sort, setSort] = useState<CourseSort>("ORDER");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<Course | null>(null);
  const courses = query.data ?? [];
  const counts = courseCounts(courses);
  const categories = [...new Set(courses.map(courseCategory).filter((value): value is string => value !== null))].sort((a, b) => a.localeCompare(b));
  const filtered = filterCourses(courses, { search, status, category: category ? JSON.parse(category) as string | null : undefined, sort });
  const pagination = paginateCourses(filtered, page);
  const loaded = query.data !== undefined;
  const hasFilters = !!search.trim() || status !== "ALL" || !!category;
  const selected = courses.find(course => course.id === profileId);
  const saveSuccess = async (course: Course, action: string) => {
    queryClient.setQueryData<Course[]>(["courses"], records => records ? [course, ...records.filter(record => record.id !== course.id)] : [course]);
    setFormOpen(false); setEditing(null); setFormError(""); setNotice(`${course.title} ${action}.`);
    await Promise.all([queryClient.invalidateQueries({ queryKey: ["courses"] }), queryClient.invalidateQueries({ queryKey: ["public-courses"] }), queryClient.invalidateQueries({ queryKey: ["fee-plans"] }), queryClient.invalidateQueries({ queryKey: ["payments"] })]);
  };
  const createMutation = useMutation({ mutationFn: createCourse, onSuccess: course => saveSuccess(course, "added successfully"), onError: error => setFormError(error.message) });
  const updateMutation = useMutation({ mutationFn: ({ id, input }: { id: string; input: UpdateCourseInput }) => updateCourse(id, input), onSuccess: course => saveSuccess(course, "updated successfully"), onError: error => setFormError(error.message) });
  const deleteMutation = useMutation({ mutationFn: deleteCourse, onSuccess: async (_data, id) => { setDeleting(null); queryClient.setQueryData<Course[]>(["courses"], records => records?.filter(record => record.id !== id)); setNotice("Course deleted."); await Promise.all([queryClient.invalidateQueries({ queryKey: ["courses"] }), queryClient.invalidateQueries({ queryKey: ["public-courses"] })]); } });
  const saving = createMutation.isPending || updateMutation.isPending;
  const busy = saving || deleteMutation.isPending;
  const openForm = (course: Course | null = null) => { if (busy) return; setProfileId(null); setEditing(course); setFormError(""); setFormOpen(true); };
  const resetFilters = () => { setSearch(""); setStatus("ALL"); setCategory(""); setPage(1); };
  const selectStatus = (filter: CourseFilter) => { setStatus(filter); setPage(1); };
  const handleDelete = (course: Course) => {
    if (busy) return;
    deleteMutation.reset(); setProfileId(null); setNotice(""); setDeleting(course);
  };
  const handleCreate = async (input: CreateCourseInput) => { setFormError(""); await createMutation.mutateAsync(input); };
  const handleUpdate = async (id: string, input: UpdateCourseInput) => { setFormError(""); await updateMutation.mutateAsync({ id, input }); };
  return <div className="admin-directory course-directory">
    <header className="admin-directory-heading"><div><span className="admin-directory-eyebrow">Courses & training</span><h1>Courses</h1><p>Organise your training catalogue, course content and availability.</p></div><div className="admin-directory-heading__actions"><button className="admin-directory-button" disabled={query.isFetching} onClick={() => void query.refetch()}><RefreshCw size={15} aria-hidden="true" />Refresh</button><button className="admin-directory-button admin-directory-button--primary" disabled={busy} onClick={() => openForm()}><Plus size={16} aria-hidden="true" />Add course</button></div></header>
    <section className="admin-directory-summary" aria-label="Course overview">{summaryCards.map(({ key, label, description, icon: Icon, tone }) => <button key={key} className={`admin-directory-summary-card admin-directory-summary-card--${tone}${status === key ? " admin-directory-summary-card--selected" : ""}`} aria-pressed={status === key} onClick={() => selectStatus(key)}><div><span>{label}</span><span className="admin-directory-summary-icon"><Icon size={18} aria-hidden="true" /></span></div><strong>{loaded ? counts[key] : "—"}</strong><small>{description}</small></button>)}<div className="admin-directory-summary-card admin-directory-summary-card--slate course-category-summary"><div><span>Categories</span><span className="admin-directory-summary-icon"><FolderOpen size={18} aria-hidden="true" /></span></div><strong>{loaded ? counts.CATEGORIES : "—"}</strong><small>Groups in your catalogue</small></div></section>
    {query.isError && <div className="admin-directory-notice admin-directory-notice--error" role="alert">{query.error.message}{loaded ? " Showing previously loaded courses. Refresh to try again." : " Use Refresh to try again."}</div>}
    {notice && <div className="admin-directory-notice" role="status"><CircleCheck size={17} aria-hidden="true" /><span>{notice}</span><button aria-label="Dismiss confirmation" onClick={() => setNotice("")}><X size={16} /></button></div>}
    {!deleting && deleteMutation.isError && <div className="admin-directory-notice admin-directory-notice--error" role="alert"><span>{deleteMutation.error.message}</span><button aria-label="Dismiss error" onClick={() => deleteMutation.reset()}><X size={16} /></button></div>}
    <section className="admin-directory-register" aria-label="Course catalogue"><div className="admin-directory-register__heading"><div><h2>Course catalogue</h2><p>{loaded ? `${filtered.length} ${filtered.length === 1 ? "course" : "courses"}${hasFilters ? " matching your filters" : " in the catalogue"}` : "Loading your courses"}</p></div><span className="admin-directory-auto-refresh"><span />Updates every 30 seconds</span></div>
      <div className="admin-directory-toolbar course-directory-toolbar"><label className="admin-directory-search"><span className="admin-directory-sr-only">Search courses</span><Search size={17} aria-hidden="true" /><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search title, category, description or skill" /></label><label className="admin-directory-filter"><span>Category</span><select value={category} onChange={event => { setCategory(event.target.value); setPage(1); }}><option value="">All categories</option>{categories.map(label => <option key={label} value={JSON.stringify(label)}>{label}</option>)}<option value="null">Uncategorised</option></select></label><label className="admin-directory-filter"><span>Sort by</span><select value={sort} onChange={event => { setSort(event.target.value as CourseSort); setPage(1); }}><option value="ORDER">Display order</option><option value="TITLE">Course title A–Z</option><option value="NEWEST">Newest first</option></select></label></div>
      <div className="admin-directory-tabs" role="group" aria-label="Filter by course status">{summaryCards.map(({ key, label }) => <button key={key} aria-pressed={status === key} className={status === key ? "admin-directory-tab--active" : ""} onClick={() => selectStatus(key)}>{key === "ALL" ? "All" : label}<span>{loaded ? counts[key] : "—"}</span></button>)}{hasFilters && <button className="admin-directory-clear" onClick={resetFilters}><X size={13} aria-hidden="true" />Clear filters</button>}</div>
      {query.isPending ? <div className="admin-directory-empty" role="status"><BookOpen size={28} aria-hidden="true" /><h3>Loading courses…</h3><p>Your training catalogue will appear here.</p></div> : !loaded ? <div className="admin-directory-empty"><h3>Unable to load courses</h3><p>Refresh to retrieve your catalogue.</p></div> : !filtered.length ? <div className="admin-directory-empty"><BookOpen size={28} aria-hidden="true" /><h3>{hasFilters ? "No matching courses" : "Build your course catalogue"}</h3><p>{hasFilters ? "Try another search or clear your filters." : "Add a course with a description, skills and availability to get started."}</p><button className="admin-directory-button admin-directory-button--primary" onClick={hasFilters ? resetFilters : () => openForm()}>{hasFilters ? "Clear filters" : "Add your first course"}</button></div> : <div className="admin-directory-table-scroll"><table className="admin-directory-table course-directory-table"><thead><tr><th>Course</th><th>Category & skills</th><th>Status</th><th>Order</th><th><span className="admin-directory-sr-only">Actions</span></th></tr></thead><tbody>{pagination.records.map(course => <tr key={course.id}><td><div className="admin-directory-identity"><span className="admin-directory-avatar course-directory-icon" aria-hidden="true"><BookOpen size={18} /></span><div><button className="admin-directory-name" disabled={busy} onClick={() => setProfileId(course.id)}>{course.title}</button><span>{course.slug}</span></div></div><p className="course-directory-description">{course.shortDescription || "No short description provided"}</p></td><td><span className="course-category-label">{courseCategory(course) || "Uncategorised"}</span><div className="course-directory-skills">{course.skills.slice(0, 2).map((skill, index) => <span key={`${skill}-${index}`}>{skill}</span>)}{course.skills.length > 2 && <span>+{course.skills.length - 2} more</span>}{!course.skills.length && <small>No skills listed</small>}</div></td><td><span className={`admin-directory-badge admin-directory-badge--${course.isActive ? "active" : "inactive"}`}>{course.isActive ? "Active" : "Inactive"}</span></td><td><span className="course-order">{course.displayOrder}</span></td><td><div className="admin-directory-row-actions"><button className="admin-directory-view" disabled={busy} onClick={() => setProfileId(course.id)} aria-label={`View ${course.title}`}>View<ArrowRight size={13} aria-hidden="true" /></button><button className="admin-directory-icon-button" disabled={busy} aria-label={`Edit ${course.title}`} onClick={() => openForm(course)}><Pencil size={15} /></button><button className="admin-directory-icon-button admin-directory-icon-button--delete" disabled={busy} aria-label={`Delete ${course.title}`} onClick={() => handleDelete(course)}><Trash2 size={15} /></button></div></td></tr>)}</tbody></table></div>}
      {loaded && filtered.length > 0 && <footer className="admin-directory-pagination"><span>Showing {pagination.start}–{pagination.end} of {filtered.length} courses</span><div><button className="admin-directory-page-button" disabled={pagination.currentPage === 1} aria-label="Previous page" onClick={() => setPage(pagination.currentPage - 1)}><ChevronLeft size={17} /></button><span>Page {pagination.currentPage} of {pagination.pageCount}</span><button className="admin-directory-page-button" disabled={pagination.currentPage === pagination.pageCount} aria-label="Next page" onClick={() => setPage(pagination.currentPage + 1)}><ChevronRight size={17} /></button></div></footer>}
    </section>
    {selected && <CourseDetailsDialog course={selected} onClose={() => setProfileId(null)} onEdit={() => openForm(selected)} />}
    {deleting && <DeleteConfirmationDialog entity="course" name={deleting.title} reference={deleting.slug} isDeleting={deleteMutation.isPending} error={deleteMutation.error?.message} onClose={() => { if (!deleteMutation.isPending) { setDeleting(null); deleteMutation.reset(); } }} onConfirm={() => { if (!busy) deleteMutation.mutate(deleting.id); }} />}
    <CourseModal open={formOpen} course={editing} isSubmitting={saving} serverError={formError} onClose={() => { if (!saving) { setFormOpen(false); setEditing(null); setFormError(""); } }} onCreate={handleCreate} onUpdate={handleUpdate} />
  </div>;
}
