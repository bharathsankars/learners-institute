import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  GraduationCap,
  Mail,
  Pencil,
  Phone,
  Plus,
  FileSpreadsheet,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useState } from "react";

import {
  createStudent,
  fetchStudents,
  updateStudent,
  type CreateStudentInput,
  type Student,
  type UpdateStudentInput,
} from "../../api/students";

import { createAdmission, type AdmissionInput } from "../../api/admissions";
import { useAdminAuth } from "../auth/useAdminAuth";
import { usePermissions } from "../auth/usePermissions";
import { AddStudentModal } from "../components/AddStudentModal";
import { admissionSourceLabels } from "../utils/admissions";
import { StudentImportDialog } from "../components/StudentImportDialog";
import { StudentDetailsDialog } from "../components/StudentDetailsDialog";

import {
  filterStudents,
  paginateStudents,
  studentCounts,
  studentDate,
  studentName,
  studentStatusLabels,
  type StudentFilter,
  type StudentSort,
} from "../utils/students";

import "../styles/AdminDirectory.css";
import "../styles/StudentsPage.css";
import "../styles/AdminRecords.css";
import "../styles/Admissions.css";

const statusTabs = [
  { key: "ALL", label: "All" },
  { key: "RECENT", label: "Recently admitted" },
  { key: "ACTIVE", label: "Active" },
  { key: "INACTIVE", label: "Inactive" },
  { key: "COMPLETED", label: "Completed" },
] as const;

function initials(student: Student) {
  return [student.firstName, student.lastName]
    .filter(Boolean)
    .map((part) => part?.trim()[0]?.toUpperCase() ?? "")
    .join("");
}

export function StudentsPage() {
  const queryClient = useQueryClient();
  const { user } = useAdminAuth();
  const { canManage } = usePermissions();

  const query = useQuery({
    queryKey: ["students"],
    queryFn: fetchStudents,
    refetchInterval: 30000,
  });

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<StudentFilter>("ALL");
  const [sort, setSort] = useState<StudentSort>("NEWEST");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Student | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const students = query.data ?? [];
  const counts = studentCounts(students);

  const filtered = filterStudents(students, {
    search,
    status: filter,
    sort,
  });

  const pagination = paginateStudents(filtered, page);

  const loaded = query.data !== undefined;

  const hasFilters =
    Boolean(search.trim()) ||
    filter !== "ALL";

  const selected = students.find(
    (student) => student.id === profileId,
  );

  const saveSuccess = async (
    student: Student,
    action: string,
  ) => {
    queryClient.setQueryData<Student[]>(
      ["students"],
      (records) =>
        records
          ? [
              student,
              ...records.filter(
                (record) =>
                  record.id !== student.id,
              ),
            ]
          : [student],
    );

    setFormOpen(false);
    setEditing(null);
    setFormError("");

    setNotice(
      `${studentName(student)} ${action}.`,
    );

    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["students"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["fee-plans"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["payments"],
      }),
    ]);
  };

  const createMutation = useMutation({
    mutationFn: createStudent,

    onSuccess: (student) =>
      saveSuccess(
        student,
        "added successfully",
      ),

    onError: (error) =>
      setFormError(error.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      input,
    }: {
      id: string;
      input: UpdateStudentInput;
    }) =>
      updateStudent(id, input),

    onSuccess: (student) =>
      saveSuccess(
        student,
        "updated successfully",
      ),

    onError: (error) =>
      setFormError(error.message),
  });

  // New students are admitted in one step with their course and batch.
  const admissionMutation = useMutation({
    mutationFn: (input: AdmissionInput) => createAdmission(input),

    onSuccess: async (admission) => {
      setFormOpen(false);
      setEditing(null);
      setFormError("");
      setNotice(
        `${studentName(admission)} admitted · ${admission.admissionNumber}${
          admission.batch ? ` · ${admission.batch.name}` : ""
        }.`,
      );

      await Promise.all(
        ["students", "batches", "batch-students", "fee-plans", "payments", "student-enrollments"].map(
          (key) => queryClient.invalidateQueries({ queryKey: [key] }),
        ),
      );
    },

    onError: (error) => setFormError(error.message),
  });

  const saving =
    createMutation.isPending ||
    updateMutation.isPending ||
    admissionMutation.isPending;

  const busy = saving;

  const openForm = (
    student: Student | null = null,
  ) => {
    if (busy) {
      return;
    }

    setProfileId(null);
    setEditing(student);
    setFormError("");
    setFormOpen(true);
  };

  const selectFilter = (
    status: StudentFilter,
  ) => {
    setFilter(status);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch("");
    setFilter("ALL");
    setPage(1);
  };

  const handleCreate = async (
    input: CreateStudentInput,
  ) => {
    setFormError("");

    await createMutation.mutateAsync(
      input,
    );
  };

  const handleUpdate = async (
    id: string,
    input: UpdateStudentInput,
  ) => {
    setFormError("");

    await updateMutation.mutateAsync({
      id,
      input,
    });
  };

  return (
    <div className="students-page records-page">
      <header className="records-header">
        <div>
          <span className="records-eyebrow">Student register</span>

          <h1>Students</h1>

          <p>
            Find students quickly, view their details and keep their
            information up to date.
          </p>
        </div>

        <div className="records-header__actions">
          <button
            className="records-button records-button--icon"
            type="button"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
            aria-label={query.isFetching ? "Refreshing students" : "Refresh students"}
            title="Refresh"
          >
            <RefreshCw
              size={16}
              aria-hidden="true"
              className={query.isFetching ? "records-spin" : undefined}
            />
          </button>

          {canManage && (
          <button
            className="records-button"
            type="button"
            disabled={busy}
            onClick={() => setImportOpen(true)}
          >
            <FileSpreadsheet size={16} aria-hidden="true" />
            Import
          </button>
          )}

          <button
            className="records-button records-button--primary"
            type="button"
            disabled={busy}
            onClick={() => openForm()}
          >
            <Plus size={17} aria-hidden="true" />
            Add student
          </button>
        </div>
      </header>

      {query.isError && (
        <div className="records-notice records-notice--error" role="alert">
          <span>
            {query.error.message}

            {loaded
              ? " Showing previously loaded student records."
              : " Use Refresh to try again."}
          </span>
        </div>
      )}

      {notice && (
        <div className="records-notice records-notice--success" role="status">
          <CircleCheck size={18} aria-hidden="true" />

          <span>{notice}</span>

          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setNotice("")}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <section className="records-panel" aria-label="Student list">
        <div className="records-tabs" role="group" aria-label="Filter by status">
          {statusTabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={
                filter === key ? "records-tab records-tab--active" : "records-tab"
              }
              aria-pressed={filter === key}
              onClick={() => selectFilter(key)}
            >
              {label}

              <span className="records-tab__count">
                {loaded ? counts[key] : "·"}
              </span>
            </button>
          ))}
        </div>

        <div className="records-toolbar">
          <label className="records-search">
            <Search size={17} aria-hidden="true" />

            <span className="records-sr-only">Search students</span>

            <input
              type="search"
              value={search}
              placeholder="Search by name, admission number, phone or email"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />

            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch("");
                  setPage(1);
                }}
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
          </label>

          <label className="records-select">
            <span className="records-sr-only">Sort by</span>

            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as StudentSort);
                setPage(1);
              }}
            >
              <option value="NEWEST">Newest first</option>
              <option value="OLDEST">Oldest first</option>
              <option value="NAME">Name A–Z</option>
              <option value="ADMISSION">Admission number</option>
            </select>
          </label>

          {hasFilters && (
            <button
              type="button"
              className="records-clear"
              onClick={resetFilters}
            >
              <X size={14} aria-hidden="true" />
              Clear
            </button>
          )}
        </div>

        {query.isPending ? (
          <div className="records-list" role="status" aria-label="Loading students">
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
        ) : !loaded ? (
          <div className="records-empty">
            <GraduationCap size={28} aria-hidden="true" />

            <h3>Unable to load students</h3>

            <p>Use Refresh to try again.</p>
          </div>
        ) : !filtered.length ? (
          <div className="records-empty">
            <GraduationCap size={28} aria-hidden="true" />

            <h3>{hasFilters ? "No matching students" : "No students yet"}</h3>

            <p>
              {hasFilters
                ? "Try another search or clear your filter."
                : "Add your first student to begin building the student register."}
            </p>

            <button
              type="button"
              className={
                hasFilters
                  ? "records-button"
                  : "records-button records-button--primary"
              }
              onClick={hasFilters ? resetFilters : () => openForm()}
            >
              {hasFilters ? "Clear filter" : "Add first student"}
            </button>
          </div>
        ) : (
          <div className="records-list">
            <div className="records-columns records-columns--students" aria-hidden="true">
              <span>Student</span>
              <span>Contact</span>
              <span>Admitted</span>
              <span>Status</span>
              <span />
            </div>

            {pagination.records.map((student) => (
              <article
                key={student.id}
                className="records-row records-row--students"
              >
                <div className="records-person">
                  <span className="records-avatar" aria-hidden="true">
                    {initials(student)}
                  </span>

                  <div>
                    <button
                      type="button"
                      className="records-name"
                      disabled={busy}
                      onClick={() => setProfileId(student.id)}
                    >
                      {studentName(student)}
                    </button>

                    <span className="records-sub records-sub--mono">
                      {student.admissionNumber}
                    </span>
                  </div>
                </div>

                <div className="records-detail">
                  <a
                    className="records-sub records-sub--strong"
                    href={`tel:${student.phone.replace(/[^+\d]/g, "")}`}
                  >
                    <Phone size={13} aria-hidden="true" />
                    {student.phone}
                  </a>

                  {student.email ? (
                    <a className="records-sub" href={`mailto:${student.email}`}>
                      <Mail size={13} aria-hidden="true" />
                      {student.email}
                    </a>
                  ) : (
                    <span className="records-sub records-sub--faint">
                      No email
                    </span>
                  )}
                </div>

                <div className="records-date">
                  {studentDate(student.createdAt)}
                  <span
                    className={`admission-source admission-source--${(student.admissionSource ?? "unrecorded").toLowerCase()}`}
                  >
                    {student.admissionSource ? admissionSourceLabels[student.admissionSource] : "Not recorded"}
                  </span>
                  {student.admittedBy && (
                    <span className="records-sub">
                      by {student.admittedBy.firstName} {student.admittedBy.lastName}
                    </span>
                  )}
                </div>

                <span
                  className={`records-status records-status--${student.status.toLowerCase()}`}
                >
                  {studentStatusLabels[student.status]}
                </span>

                <div className="records-actions">
                  {canManage && <button
                    type="button"
                    className="records-action records-action--icon"
                    disabled={busy}
                    onClick={() => openForm(student)}
                    aria-label={`Edit ${studentName(student)}`}
                    title="Edit"
                  >
                    <Pencil size={15} aria-hidden="true" />
                  </button>}

                  <button
                    type="button"
                    className="records-action"
                    disabled={busy}
                    onClick={() => setProfileId(student.id)}
                  >
                    View
                    <ArrowRight size={15} aria-hidden="true" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {loaded && filtered.length > 0 && (
          <footer className="records-pagination">
            <span>
              Showing {pagination.start}–{pagination.end} of {filtered.length}{" "}
              {filtered.length === 1 ? "student" : "students"}
              <span className="records-live">Updates every 30 seconds</span>
            </span>

            <div>
              <button
                type="button"
                className="records-page-button"
                disabled={pagination.currentPage === 1}
                onClick={() => setPage(pagination.currentPage - 1)}
                aria-label="Previous page"
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
                onClick={() => setPage(pagination.currentPage + 1)}
                aria-label="Next page"
              >
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            </div>
          </footer>
        )}
      </section>

      {selected && (
        <StudentDetailsDialog
          student={selected}
          onClose={() =>
            setProfileId(null)
          }
          onEdit={() =>
            openForm(selected)
          }
          canEdit={canManage}
        />
      )}

      <StudentImportDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
      />

      <AddStudentModal
        open={formOpen}
        student={editing}
        isSubmitting={saving}
        serverError={formError}
        onClose={() => {
          if (!saving) {
            setFormOpen(false);
            setEditing(null);
            setFormError("");
          }
        }}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onAdmit={async (input) => {
          setFormError("");
          await admissionMutation.mutateAsync(input);
        }}
        canSetFees={user?.role === "SUPER_ADMIN"}
      />
    </div>
  );
}
