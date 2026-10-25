import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  GraduationCap,
  Mail,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserCheck,
  UserMinus,
  Users,
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
  deleteStudent,
  fetchStudents,
  updateStudent,
  type CreateStudentInput,
  type Student,
  type UpdateStudentInput,
} from "../../api/students";

import { AddStudentModal } from "../components/AddStudentModal";
import { DeleteConfirmationDialog } from "../components/DeleteConfirmationDialog";
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

const cards = [
  {
    key: "ALL",
    label: "All students",
    description: "Everyone registered",
    icon: Users,
    tone: "blue",
  },
  {
    key: "ACTIVE",
    label: "Active",
    description: "Currently learning",
    icon: UserCheck,
    tone: "green",
  },
  {
    key: "INACTIVE",
    label: "Inactive",
    description: "Not currently active",
    icon: UserMinus,
    tone: "amber",
  },
  {
    key: "COMPLETED",
    label: "Completed",
    description: "Finished learning",
    icon: CheckCircle2,
    tone: "slate",
  },
] as const;

export function StudentsPage() {
  const queryClient = useQueryClient();

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
  const [editing, setEditing] = useState<Student | null>(null);
  const [profileId, setProfileId] = useState<string | null>(null);

  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<Student | null>(null);

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

  const deleteMutation = useMutation({
    mutationFn: deleteStudent,

    onSuccess: async (_data, id) => {
      setDeleting(null);

      queryClient.setQueryData<Student[]>(
        ["students"],
        (records) =>
          records?.filter(
            (record) =>
              record.id !== id,
          ),
      );

      setNotice(
        "Student record deleted.",
      );

      await queryClient.invalidateQueries({
        queryKey: ["students"],
      });
    },
  });

  const saving =
    createMutation.isPending ||
    updateMutation.isPending;

  const busy =
    saving ||
    deleteMutation.isPending;

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

  const handleDelete = (
    student: Student,
  ) => {
    if (busy) {
      return;
    }

    deleteMutation.reset();
    setProfileId(null);
    setNotice("");
    setDeleting(student);
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
    <div className="students-page">

      <header className="students-header">
        <div>
          <span className="students-eyebrow">
            Student management
          </span>

          <h1>
            Students
          </h1>

          <p>
            Find students quickly,
            view their details and
            keep their information
            up to date.
          </p>
        </div>

        <div className="students-header__actions">
          <button
            className="students-button"
            type="button"
            disabled={query.isFetching}
            onClick={() =>
              void query.refetch()
            }
          >
            <RefreshCw
              size={18}
              aria-hidden="true"
              className={
                query.isFetching
                  ? "students-spin"
                  : undefined
              }
            />

            Refresh
          </button>

          <button
            className="students-button students-button--primary"
            type="button"
            disabled={busy}
            onClick={() => openForm()}
          >
            <Plus
              size={19}
              aria-hidden="true"
            />

            Add student
          </button>
        </div>
      </header>

      <section
        className="students-overview"
        aria-label="Student status overview"
      >
        {cards.map(
          ({
            key,
            label,
            description,
            icon: Icon,
            tone,
          }) => (
            <button
              key={key}
              type="button"
              className={`students-overview-card students-overview-card--${tone}${
                filter === key
                  ? " students-overview-card--selected"
                  : ""
              }`}
              aria-pressed={
                filter === key
              }
              onClick={() =>
                selectFilter(key)
              }
            >
              <div className="students-overview-card__top">
                <span className="students-overview-card__icon">
                  <Icon
                    size={22}
                    aria-hidden="true"
                  />
                </span>

                <strong>
                  {loaded
                    ? counts[key]
                    : "—"}
                </strong>
              </div>

              <span className="students-overview-card__label">
                {label}
              </span>

              <small>
                {description}
              </small>
            </button>
          ),
        )}
      </section>

      {query.isError && (
        <div
          className="students-notice students-notice--error"
          role="alert"
        >
          <span>
            {query.error.message}

            {loaded
              ? " Showing previously loaded student records."
              : " Use Refresh to try again."}
          </span>
        </div>
      )}

      {notice && (
        <div
          className="students-notice students-notice--success"
          role="status"
        >
          <CircleCheck
            size={19}
            aria-hidden="true"
          />

          <span>
            {notice}
          </span>

          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() =>
              setNotice("")
            }
          >
            <X
              size={18}
              aria-hidden="true"
            />
          </button>
        </div>
      )}

      {!deleting &&
        deleteMutation.isError && (
          <div
            className="students-notice students-notice--error"
            role="alert"
          >
            <span>
              {
                deleteMutation.error
                  .message
              }
            </span>

            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() =>
                deleteMutation.reset()
              }
            >
              <X
                size={18}
                aria-hidden="true"
              />
            </button>
          </div>
        )}

      <section className="students-search-panel">
        <div className="students-section-heading">
          <div>
            <h2>
              Find a student
            </h2>

            <p>
              Search by name,
              admission number,
              phone number or email.
            </p>
          </div>
        </div>

        <div className="students-search-controls">
          <label className="students-search-box">
            <Search
              size={20}
              aria-hidden="true"
            />

            <span className="students-sr-only">
              Search students
            </span>

            <input
              type="search"
              value={search}
              placeholder="Search students..."
              onChange={(event) => {
                setSearch(
                  event.target.value,
                );

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
                <X
                  size={18}
                  aria-hidden="true"
                />
              </button>
            )}
          </label>

          <label className="students-sort">
            <span>
              Sort by
            </span>

            <select
              value={sort}
              onChange={(event) => {
                setSort(
                  event.target
                    .value as StudentSort,
                );

                setPage(1);
              }}
            >
              <option value="NEWEST">
                Newest first
              </option>

              <option value="OLDEST">
                Oldest first
              </option>

              <option value="NAME">
                Name A–Z
              </option>

              <option value="ADMISSION">
                Admission number
              </option>
            </select>
          </label>
        </div>

        {hasFilters && (
          <button
            type="button"
            className="students-clear-filter"
            onClick={resetFilters}
          >
            <X
              size={15}
              aria-hidden="true"
            />

            Clear search and filter
          </button>
        )}
      </section>

      <section className="students-list-panel">

        <div className="students-list-heading">
          <div>
            <h2>
              Student list
            </h2>

            <p>
              {loaded
                ? `${filtered.length} ${
                    filtered.length === 1
                      ? "student"
                      : "students"
                  }${
                    hasFilters
                      ? " found"
                      : " registered"
                  }`
                : "Loading student records"}
            </p>
          </div>

          <span className="students-auto-refresh">
            <span />

            Updates every 30 seconds
          </span>
        </div>

        {query.isPending ? (
          <div
            className="students-empty"
            role="status"
          >
            <GraduationCap
              size={34}
              aria-hidden="true"
            />

            <h3>
              Loading students…
            </h3>

            <p>
              Your student records
              will appear here.
            </p>
          </div>
        ) : !loaded ? (
          <div className="students-empty">
            <GraduationCap
              size={34}
              aria-hidden="true"
            />

            <h3>
              Unable to load students
            </h3>

            <p>
              Refresh the page to
              retrieve student
              records.
            </p>
          </div>
        ) : !filtered.length ? (
          <div className="students-empty">
            <GraduationCap
              size={34}
              aria-hidden="true"
            />

            <h3>
              {hasFilters
                ? "No matching students"
                : "No students yet"}
            </h3>

            <p>
              {hasFilters
                ? "Try another search or clear your filter."
                : "Add your first student to begin building the student register."}
            </p>

            <button
              type="button"
              className="students-button students-button--primary"
              onClick={
                hasFilters
                  ? resetFilters
                  : () => openForm()
              }
            >
              {hasFilters
                ? "Clear filter"
                : "Add first student"}
            </button>
          </div>
        ) : (
          <div className="students-records">
            {pagination.records.map(
              (student) => (
                <article
                  key={student.id}
                  className="student-record"
                >
                  <div className="student-record__main">
                    <div
                      className="student-record__avatar"
                      aria-hidden="true"
                    >
                      {student.firstName
                        .slice(0, 1)
                        .toUpperCase()}
                    </div>

                    <div className="student-record__identity">
                      <div className="student-record__title-row">
                        <button
                          type="button"
                          className="student-record__name"
                          disabled={busy}
                          onClick={() =>
                            setProfileId(
                              student.id,
                            )
                          }
                        >
                          {studentName(
                            student,
                          )}
                        </button>

                        <span
                          className={`student-record__status student-record__status--${student.status.toLowerCase()}`}
                        >
                          {
                            studentStatusLabels[
                              student.status
                            ]
                          }
                        </span>
                      </div>

                      <span className="student-record__admission">
                        Admission no.{" "}
                        <strong>
                          {
                            student.admissionNumber
                          }
                        </strong>
                      </span>

                      <div className="student-record__contact">
                        <a
                          href={`tel:${student.phone.replace(
                            /[^+\d]/g,
                            "",
                          )}`}
                        >
                          <Phone
                            size={16}
                            aria-hidden="true"
                          />

                          {student.phone}
                        </a>

                        {student.email ? (
                          <a
                            href={`mailto:${student.email}`}
                          >
                            <Mail
                              size={16}
                              aria-hidden="true"
                            />

                            {student.email}
                          </a>
                        ) : (
                          <span className="student-record__no-email">
                            No email provided
                          </span>
                        )}
                      </div>

                      <span className="student-record__added">
                        Added{" "}
                        {studentDate(
                          student.createdAt,
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="student-record__actions">
                    <button
                      type="button"
                      className="student-action student-action--view"
                      disabled={busy}
                      onClick={() =>
                        setProfileId(
                          student.id,
                        )
                      }
                    >
                      View details

                      <ArrowRight
                        size={17}
                        aria-hidden="true"
                      />
                    </button>

                    <button
                      type="button"
                      className="student-action"
                      disabled={busy}
                      onClick={() =>
                        openForm(student)
                      }
                    >
                      <Pencil
                        size={16}
                        aria-hidden="true"
                      />

                      Edit
                    </button>

                    <button
                      type="button"
                      className="student-action student-action--delete"
                      disabled={busy}
                      onClick={() =>
                        handleDelete(student)
                      }
                    >
                      <Trash2
                        size={16}
                        aria-hidden="true"
                      />

                      Delete
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>
        )}

        {loaded &&
          filtered.length > 0 && (
            <footer className="students-pagination">
              <span>
                Showing{" "}
                {pagination.start}–
                {pagination.end} of{" "}
                {filtered.length} students
              </span>

              <div>
                <button
                  type="button"
                  className="students-page-button"
                  disabled={
                    pagination.currentPage === 1
                  }
                  onClick={() =>
                    setPage(
                      pagination.currentPage -
                        1,
                    )
                  }
                  aria-label="Previous page"
                >
                  <ChevronLeft
                    size={19}
                    aria-hidden="true"
                  />
                </button>

                <strong>
                  Page{" "}
                  {pagination.currentPage}{" "}
                  of{" "}
                  {pagination.pageCount}
                </strong>

                <button
                  type="button"
                  className="students-page-button"
                  disabled={
                    pagination.currentPage ===
                    pagination.pageCount
                  }
                  onClick={() =>
                    setPage(
                      pagination.currentPage +
                        1,
                    )
                  }
                  aria-label="Next page"
                >
                  <ChevronRight
                    size={19}
                    aria-hidden="true"
                  />
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
        />
      )}

      {deleting && (
        <DeleteConfirmationDialog
          entity="student"
          name={studentName(
            deleting,
          )}
          reference={
            deleting.admissionNumber
          }
          isDeleting={
            deleteMutation.isPending
          }
          error={
            deleteMutation.error
              ?.message
          }
          onClose={() => {
            if (
              !deleteMutation.isPending
            ) {
              setDeleting(null);
              deleteMutation.reset();
            }
          }}
          onConfirm={() => {
            if (!busy) {
              deleteMutation.mutate(
                deleting.id,
              );
            }
          }}
        />
      )}

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
      />
    </div>
  );
}
