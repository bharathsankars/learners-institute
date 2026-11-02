import { AddStudentModal } from "../components/AddStudentModal";

import type {
  CreateStudentInput,
} from "../../api/students";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  useMemo,
  useState,
} from "react";

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  FileText,
  GraduationCap,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

import {
  admitEnquiry,
  fetchEnquiries,
  updateEnquiryStatus,
  type Enquiry,
  type EnquiryStatus,
} from "../../api/enquiries";

import {
  EnquiryDetailsDialog,
} from "../components/EnquiryDetailsDialog";

import {
  enquiryStatusLabels,
  enquiryCourseNames,
  formatEnquiryDate,
  enquiryCounts,
  filterEnquiries,
  paginateEnquiries,
  type EnquiryFilter,
  type EnquirySort,
} from "../utils/enquiries";

import "../styles/Enquiries.css";
import "../styles/AdminRecords.css";

const statusTabs = [
  { key: "ALL", label: "All" },
  { key: "NEW", label: "Awaiting contact" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "CLOSED", label: "Closed" },
] as const;

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function EnquiriesPage() {
  const queryClient =
    useQueryClient();

  const [search, setSearch] =
    useState("");

  const [filter, setFilter] =
    useState<EnquiryFilter>("ALL");

  const [course, setCourse] =
    useState("");

  const [sort, setSort] =
    useState<EnquirySort>("NEWEST");

  const [page, setPage] =
    useState(1);

  const [selectedId, setSelectedId] =
    useState<string | null>(null);

  const [admitting, setAdmitting] =
    useState<Enquiry | null>(null);

  const [successMessage, setSuccessMessage] =
    useState("");

  const initialValues =
    useMemo(() => {
      if (!admitting) {
        return undefined;
      }

      const [
        firstName,
        ...rest
      ] =
        admitting.name
          .trim()
          .split(/\s+/);

      return {
        firstName,
        lastName:
          rest.join(" "),
        phone:
          admitting.phone,
      };
    }, [admitting]);

  const query =
    useQuery({
      queryKey: [
        "enquiries",
      ],

      queryFn:
        fetchEnquiries,

      refetchInterval:
        30000,
    });

  const mutation =
    useMutation({
      mutationFn:
        ({
          id,
          status,
        }: {
          id: string;
          status:
            EnquiryStatus;
        }) =>
          updateEnquiryStatus(
            id,
            status,
          ),

      onSuccess:
        async (
          updated,
        ) => {
          queryClient.setQueryData<
            Enquiry[]
          >(
            [
              "enquiries",
            ],

            (
              records,
            ) =>
              records?.map(
                (
                  record,
                ) =>
                  record.id ===
                  updated.id
                    ? updated
                    : record,
              ),
          );

          setSuccessMessage(
            `${updated.name} marked as ${
              enquiryStatusLabels[
                updated.status
              ].toLowerCase()
            }.`,
          );

          await queryClient.invalidateQueries(
            {
              queryKey: [
                "enquiries",
              ],
            },
          );
        },
    });

  const admission =
    useMutation({
      mutationFn:
        ({
          id,
          input,
        }: {
          id: string;
          input:
            CreateStudentInput;
        }) =>
          admitEnquiry(
            id,
            input,
          ),

      onSuccess:
        async ({
          student,
          enquiry,
        }) => {
          queryClient.setQueryData<
            Enquiry[]
          >(
            [
              "enquiries",
            ],

            (
              records,
            ) =>
              records?.map(
                (
                  record,
                ) =>
                  record.id ===
                  enquiry.id
                    ? enquiry
                    : record,
              ),
          );

          setAdmitting(
            null,
          );

          setSuccessMessage(
            `${student.firstName} admitted successfully · ${student.admissionNumber}. The enquiry is closed.`,
          );

          await Promise.all([
            queryClient.invalidateQueries(
              {
                queryKey: [
                  "enquiries",
                ],
              },
            ),

            queryClient.invalidateQueries(
              {
                queryKey: [
                  "students",
                ],
              },
            ),
          ]);
        },
    });

  const enquiries =
    query.data ?? [];

  const counts =
    enquiryCounts(
      enquiries,
    );

  const filtered =
    filterEnquiries(
      enquiries,
      {
        search,
        status:
          filter,
        course,
        sort,
      },
    );

  const paginated =
    paginateEnquiries(
      filtered,
      page,
    );

  const courses = [
    ...new Set(
      enquiries.flatMap((enquiry) =>
        enquiryCourseNames(enquiry.course),
      ),
    ),
  ].sort((a, b) => a.localeCompare(b));

  const selected =
    enquiries.find(
      (
        enquiry,
      ) =>
        enquiry.id ===
        selectedId,
    );

  const hasFilters =
    Boolean(
      search.trim(),
    ) ||
    filter !==
      "ALL" ||
    Boolean(course);

  const loaded =
    query.data !==
    undefined;

  const changeStatus =
    (
      id: string,
      status:
        EnquiryStatus,
    ) => {
      if (
        mutation.isPending
      ) {
        return;
      }

      setSuccessMessage(
        "",
      );

      mutation.mutate({
        id,
        status,
      });
    };

  const selectFilter =
    (
      status:
        EnquiryFilter,
    ) => {
      setFilter(
        status,
      );

      setPage(
        1,
      );
    };

  const resetFilters =
    () => {
      setSearch(
        "",
      );

      setFilter(
        "ALL",
      );

      setCourse(
        "",
      );

      setPage(
        1,
      );
    };

  const openDetails =
    (
      id: string,
    ) => {
      if (
        mutation.isPending
      ) {
        return;
      }

      mutation.reset();

      setSelectedId(
        id,
      );
    };

  return (
    <div className="enquiries-page records-page">
      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="records-header">
        <div>
          <span className="records-eyebrow">Admissions & follow-up</span>

          <h1>Enquiries</h1>

          <p>
            Review new requests, contact interested students and keep every
            follow-up organised.
          </p>
        </div>

        <div className="records-header__actions">
          <button
            className="records-button"
            type="button"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            <RefreshCw
              size={16}
              aria-hidden="true"
              className={query.isFetching ? "records-spin" : undefined}
            />

            {query.isFetching ? "Refreshing…" : "Refresh"}
          </button>
        </div>
      </header>

      {/* =====================================================
          NOTICES
          ===================================================== */}

      {query.isError && (
        <div className="records-notice records-notice--error" role="alert">
          <span>
            {query.error.message}

            {loaded
              ? " Showing previously loaded enquiries."
              : " Use Refresh to try again."}
          </span>
        </div>
      )}

      {successMessage && (
        <div className="records-notice records-notice--success" role="status">
          <CircleCheck size={18} aria-hidden="true" />

          <span>{successMessage}</span>

          <button
            type="button"
            aria-label="Dismiss confirmation"
            onClick={() => setSuccessMessage("")}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {mutation.isError && !selected && (
        <div className="records-notice records-notice--error" role="alert">
          <span>{mutation.error.message}</span>

          <button
            type="button"
            aria-label="Dismiss error"
            onClick={() => mutation.reset()}
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {/* =====================================================
          ENQUIRY LIST
          ===================================================== */}

      <section className="records-panel" aria-label="Enquiry list">
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

            <span className="records-sr-only">Search enquiries</span>

            <input
              type="search"
              value={search}
              placeholder="Search by name, phone, course or message"
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
            <span className="records-sr-only">Course</span>

            <select
              value={course}
              onChange={(event) => {
                setCourse(event.target.value);
                setPage(1);
              }}
            >
              <option value="">All courses</option>

              {courses.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
          </label>

          <label className="records-select">
            <span className="records-sr-only">Sort by</span>

            <select
              value={sort}
              onChange={(event) => {
                setSort(event.target.value as EnquirySort);
                setPage(1);
              }}
            >
              <option value="NEWEST">Newest first</option>
              <option value="OLDEST">Oldest first</option>
              <option value="NEW_FIRST">Awaiting contact first</option>
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
          <div className="records-list" role="status" aria-label="Loading enquiries">
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
            <FileText size={28} aria-hidden="true" />

            <h3>Unable to load enquiries</h3>

            <p>Use Refresh to try again.</p>
          </div>
        ) : !filtered.length ? (
          <div className="records-empty">
            <MessageSquare size={28} aria-hidden="true" />

            <h3>{hasFilters ? "No matching enquiries" : "No enquiries yet"}</h3>

            <p>
              {hasFilters
                ? "Try another search or clear your filters."
                : "New website enquiries will appear here."}
            </p>

            {hasFilters && (
              <button
                type="button"
                className="records-button"
                onClick={resetFilters}
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="records-list">
            <div className="records-columns records-columns--enquiries" aria-hidden="true">
              <span>Enquirer</span>
              <span>Course & message</span>
              <span>Received</span>
              <span>Status</span>
              <span />
            </div>

            {paginated.records.map((enquiry) => (
              <article
                key={enquiry.id}
                className="records-row records-row--enquiries"
              >
                <div className="records-person">
                  <span className="records-avatar" aria-hidden="true">
                    {initials(enquiry.name)}
                  </span>

                  <div>
                    <button
                      className="records-name"
                      type="button"
                      disabled={mutation.isPending}
                      onClick={() => openDetails(enquiry.id)}
                    >
                      {enquiry.name}
                    </button>

                    <a
                      className="records-sub"
                      href={`tel:${enquiry.phone.replace(/[^+\d]/g, "")}`}
                    >
                      <Phone size={13} aria-hidden="true" />
                      {enquiry.phone}
                    </a>
                  </div>
                </div>

                <div className="records-detail">
                  <strong>{enquiry.course}</strong>

                  <span
                    className={
                      enquiry.message
                        ? "records-sub records-sub--clamp"
                        : "records-sub records-sub--faint"
                    }
                    title={enquiry.message ?? undefined}
                  >
                    {enquiry.message || "No message"}
                  </span>
                </div>

                <div className="records-date">
                  {formatEnquiryDate(enquiry.createdAt)}

                  {enquiry.student && (
                    <span className="records-chip">
                      <GraduationCap size={13} aria-hidden="true" />
                      {enquiry.student.admissionNumber}
                    </span>
                  )}
                </div>

                <span
                  className={`records-status records-status--${enquiry.status.toLowerCase()}`}
                >
                  {enquiryStatusLabels[enquiry.status]}
                </span>

                <div className="records-actions">
                  <button
                    className="records-action"
                    type="button"
                    disabled={mutation.isPending}
                    onClick={() => openDetails(enquiry.id)}
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
              Showing {paginated.start}–{paginated.end} of {filtered.length}{" "}
              {filtered.length === 1 ? "enquiry" : "enquiries"}
              <span className="records-live">Updates every 30 seconds</span>
            </span>

            <div>
              <button
                type="button"
                className="records-page-button"
                disabled={paginated.currentPage === 1}
                onClick={() => setPage(paginated.currentPage - 1)}
                aria-label="Previous page"
              >
                <ChevronLeft size={17} aria-hidden="true" />
              </button>

              <strong>
                {paginated.currentPage} / {paginated.pageCount}
              </strong>

              <button
                type="button"
                className="records-page-button"
                disabled={paginated.currentPage === paginated.pageCount}
                onClick={() => setPage(paginated.currentPage + 1)}
                aria-label="Next page"
              >
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            </div>
          </footer>
        )}
      </section>

      {/* =====================================================
          DIALOGS
          ===================================================== */}

      {selected && (
        <EnquiryDetailsDialog
          enquiry={
            selected
          }
          isSaving={
            mutation.isPending
          }
          error={
            mutation.error
              ?.message
          }
          onClose={() =>
            setSelectedId(
              null,
            )
          }
          onStatusChange={(
            status,
          ) =>
            changeStatus(
              selected.id,
              status,
            )
          }
          onAdmit={() => {
            admission.reset();

            setSelectedId(
              null,
            );

            setAdmitting(
              selected,
            );
          }}
        />
      )}

      {admitting && (
        <AddStudentModal
          key={
            admitting.id
          }
          open
          initialValues={
            initialValues
          }
          isSubmitting={
            admission.isPending
          }
          serverError={
            admission.error
              ?.message
          }
          onClose={() => {
            if (
              !admission.isPending
            ) {
              setAdmitting(
                null,
              );
            }
          }}
          onCreate={async (
            input,
          ) => {
            await admission.mutateAsync(
              {
                id:
                  admitting.id,
                input,
              },
            );
          }}
          onUpdate={
            async () => {}
          }
        />
      )}
    </div>
  );
}
