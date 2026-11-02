import { DeleteConfirmationDialog } from "../components/DeleteConfirmationDialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, BookOpen, ChevronLeft, ChevronRight, CircleCheck, Pencil, Plus, RefreshCw, Search, Trash2, X } from "lucide-react";
import { createCourse, deleteCourse, fetchCourses, updateCourse, type Course, type CreateCourseInput, type UpdateCourseInput } from "../../api/courses";
import { CourseModal } from "../components/CourseModal";
import { CourseDetailsDialog } from "../components/CourseDetailsDialog";
import { courseCategory, courseCounts, filterCourses, paginateCourses, type CourseFilter, type CourseSort } from "../utils/courses";
import { usePermissions } from "../auth/usePermissions";
import "../styles/AdminDirectory.css";
import "../styles/CourseDirectory.css";
import "../styles/AdminRecords.css";

const statusTabs = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "INACTIVE", label: "Inactive" },
] as const;

export function CoursesPage() {
  const queryClient = useQueryClient();
  const { canManage } = usePermissions();
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
  return <div className="course-directory records-page">
    <header className="records-header">
      <div>
        <span className="records-eyebrow">Courses & training</span>
        <h1>Courses</h1>
        <p>Organise your training catalogue, course content and availability.</p>
      </div>
      <div className="records-header__actions">
        <button className="records-button records-button--icon" type="button" disabled={query.isFetching} onClick={() => void query.refetch()} aria-label={query.isFetching ? "Refreshing courses" : "Refresh courses"} title="Refresh"><RefreshCw size={16} aria-hidden="true" className={query.isFetching ? "records-spin" : undefined} /></button>
        {canManage && <button className="records-button records-button--primary" type="button" disabled={busy} onClick={() => openForm()}><Plus size={17} aria-hidden="true" />Add course</button>}
      </div>
    </header>
    {query.isError && <div className="records-notice records-notice--error" role="alert"><span>{query.error.message}{loaded ? " Showing previously loaded courses. Refresh to try again." : " Use Refresh to try again."}</span></div>}
    {notice && <div className="records-notice records-notice--success" role="status"><CircleCheck size={18} aria-hidden="true" /><span>{notice}</span><button type="button" aria-label="Dismiss confirmation" onClick={() => setNotice("")}><X size={16} aria-hidden="true" /></button></div>}
    {!deleting && deleteMutation.isError && <div className="records-notice records-notice--error" role="alert"><span>{deleteMutation.error.message}</span><button type="button" aria-label="Dismiss error" onClick={() => deleteMutation.reset()}><X size={16} aria-hidden="true" /></button></div>}
    <section className="records-panel" aria-label="Course catalogue">
      <div className="records-tabs" role="group" aria-label="Filter by course status">{statusTabs.map(({ key, label }) => <button key={key} type="button" className={status === key ? "records-tab records-tab--active" : "records-tab"} aria-pressed={status === key} onClick={() => selectStatus(key)}>{label}<span className="records-tab__count">{loaded ? counts[key] : "·"}</span></button>)}</div>
      <div className="records-toolbar">
        <label className="records-search"><Search size={17} aria-hidden="true" /><span className="records-sr-only">Search courses</span><input type="search" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Search title, category, description or skill" />{search && <button type="button" aria-label="Clear search" onClick={() => { setSearch(""); setPage(1); }}><X size={16} aria-hidden="true" /></button>}</label>
        <label className="records-select"><span className="records-sr-only">Category</span><select value={category} onChange={event => { setCategory(event.target.value); setPage(1); }}><option value="">All categories</option>{categories.map(label => <option key={label} value={JSON.stringify(label)}>{label}</option>)}<option value="null">Uncategorised</option></select></label>
        <label className="records-select"><span className="records-sr-only">Sort by</span><select value={sort} onChange={event => { setSort(event.target.value as CourseSort); setPage(1); }}><option value="ORDER">Display order</option><option value="TITLE">Course title A–Z</option><option value="NEWEST">Newest first</option></select></label>
        {hasFilters && <button type="button" className="records-clear" onClick={resetFilters}><X size={14} aria-hidden="true" />Clear</button>}
      </div>
      {query.isPending ? <div className="records-list" role="status" aria-label="Loading courses">{Array.from({ length: 6 }, (_, row) => <div key={row} className="records-row records-row--skeleton"><span className="records-skeleton records-skeleton--avatar records-skeleton--square" /><span className="records-skeleton" style={{ width: "60%" }} /><span className="records-skeleton" style={{ width: "70%" }} /><span className="records-skeleton" style={{ width: "50%" }} /><span className="records-skeleton" style={{ width: "72px" }} /></div>)}</div>
        : !loaded ? <div className="records-empty"><BookOpen size={28} aria-hidden="true" /><h3>Unable to load courses</h3><p>Use Refresh to try again.</p></div>
        : !filtered.length ? <div className="records-empty"><BookOpen size={28} aria-hidden="true" /><h3>{hasFilters ? "No matching courses" : "Build your course catalogue"}</h3><p>{hasFilters ? "Try another search or clear your filters." : "Add a course with a description, skills and availability to get started."}</p>{(hasFilters || canManage) && <button type="button" className={hasFilters ? "records-button" : "records-button records-button--primary"} onClick={hasFilters ? resetFilters : () => openForm()}>{hasFilters ? "Clear filters" : "Add your first course"}</button>}</div>
        : <div className="records-list">
          <div className="records-columns records-columns--courses" aria-hidden="true"><span>Course</span><span>Category & skills</span><span>Order</span><span>Status</span><span /></div>
          {pagination.records.map(course => <article key={course.id} className="records-row records-row--courses">
            <div className="records-person">
              <span className="records-avatar records-avatar--square" aria-hidden="true"><BookOpen size={17} /></span>
              <div>
                <button type="button" className="records-name" disabled={busy} onClick={() => setProfileId(course.id)}>{course.title}</button>
                <span className={course.shortDescription ? "records-sub records-sub--clamp" : "records-sub records-sub--faint"} title={course.shortDescription ?? undefined}>{course.shortDescription || "No short description"}</span>
              </div>
            </div>
            <div className="records-detail">
              <strong>{courseCategory(course) || "Uncategorised"}</strong>
              <div className="records-skills">{course.skills.slice(0, 2).map((skill, index) => <span key={`${skill}-${index}`}>{skill}</span>)}{course.skills.length > 2 && <span>+{course.skills.length - 2}</span>}{!course.skills.length && <small>No skills listed</small>}</div>
            </div>
            <span className="records-order" title="Display order">{course.displayOrder}</span>
            <span className={`records-status records-status--${course.isActive ? "active" : "inactive"}`}>{course.isActive ? "Active" : "Inactive"}</span>
            <div className="records-actions">
              {canManage && <><button type="button" className="records-action records-action--icon" disabled={busy} onClick={() => openForm(course)} aria-label={`Edit ${course.title}`} title="Edit"><Pencil size={15} aria-hidden="true" /></button>
              <button type="button" className="records-action records-action--icon records-action--danger" disabled={busy} onClick={() => handleDelete(course)} aria-label={`Delete ${course.title}`} title="Delete"><Trash2 size={15} aria-hidden="true" /></button></>}
              <button type="button" className="records-action" disabled={busy} onClick={() => setProfileId(course.id)} aria-label={`View ${course.title}`}>View<ArrowRight size={15} aria-hidden="true" /></button>
            </div>
          </article>)}
        </div>}
      {loaded && filtered.length > 0 && <footer className="records-pagination"><span>Showing {pagination.start}–{pagination.end} of {filtered.length} {filtered.length === 1 ? "course" : "courses"} · {counts.CATEGORIES} {counts.CATEGORIES === 1 ? "category" : "categories"}<span className="records-live">Updates every 30 seconds</span></span><div><button type="button" className="records-page-button" disabled={pagination.currentPage === 1} aria-label="Previous page" onClick={() => setPage(pagination.currentPage - 1)}><ChevronLeft size={17} aria-hidden="true" /></button><strong>{pagination.currentPage} / {pagination.pageCount}</strong><button type="button" className="records-page-button" disabled={pagination.currentPage === pagination.pageCount} aria-label="Next page" onClick={() => setPage(pagination.currentPage + 1)}><ChevronRight size={17} aria-hidden="true" /></button></div></footer>}
    </section>
    {selected && <CourseDetailsDialog course={selected} onClose={() => setProfileId(null)} onEdit={() => openForm(selected)} canEdit={canManage} />}
    {deleting && <DeleteConfirmationDialog entity="course" name={deleting.title} reference={deleting.slug} isDeleting={deleteMutation.isPending} error={deleteMutation.error?.message} onClose={() => { if (!deleteMutation.isPending) { setDeleting(null); deleteMutation.reset(); } }} onConfirm={() => { if (!busy) deleteMutation.mutate(deleting.id); }} />}
    <CourseModal open={formOpen} course={editing} isSubmitting={saving} serverError={formError} onClose={() => { if (!saving) { setFormOpen(false); setEditing(null); setFormError(""); } }} onCreate={handleCreate} onUpdate={handleUpdate} />
  </div>;
}
