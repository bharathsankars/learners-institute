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
  Clock3,
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

const summaryCards = [
  {
    key: "ALL",
    label: "All enquiries",
    description: "All website requests",
    icon: FileText,
    tone: "blue",
  },
  {
    key: "NEW",
    label: "Awaiting contact",
    description: "Needs follow-up",
    icon: Clock3,
    tone: "amber",
  },
  {
    key: "CONTACTED",
    label: "Contacted",
    description: "Conversation started",
    icon: MessageSquare,
    tone: "green",
  },
  {
    key: "CLOSED",
    label: "Closed",
    description: "Follow-up completed",
    icon: CircleCheck,
    tone: "slate",
  },
] as const;

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
    <div className="enquiries-page">

      {/* =====================================================
          HEADER
          ===================================================== */}

      <header className="enquiries-heading">
        <div>
          <span className="enquiries-eyebrow">
            Admissions & follow-up
          </span>

          <h1>
            Enquiries
          </h1>

          <p>
            Review new requests,
            contact interested students
            and keep every follow-up
            organised.
          </p>
        </div>

        <button
          className="enquiries-button"
          type="button"
          disabled={
            query.isFetching
          }
          onClick={() =>
            void query.refetch()
          }
        >
          <RefreshCw
            size={18}
            aria-hidden="true"
            className={
              query.isFetching
                ? "enquiries-spin"
                : undefined
            }
          />

          {query.isFetching
            ? "Refreshing…"
            : "Refresh"}
        </button>
      </header>


      {/* =====================================================
          STATUS OVERVIEW
          ===================================================== */}

      <section
        className="enquiries-summary"
        aria-label="Enquiry status summary"
      >
        {summaryCards.map(
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
              className={`enquiries-summary-card enquiries-summary-card--${tone}${
                filter === key
                  ? " enquiries-summary-card--selected"
                  : ""
              }`}
              aria-pressed={
                filter === key
              }
              onClick={() =>
                selectFilter(
                  key,
                )
              }
            >
              <div className="enquiries-summary-card__top">
                <span className="enquiries-summary-icon">
                  <Icon
                    size={22}
                    aria-hidden="true"
                  />
                </span>

                <strong>
                  {loaded
                    ? counts[
                        key
                      ]
                    : "—"}
                </strong>
              </div>

              <span className="enquiries-summary-card__label">
                {label}
              </span>

              <small>
                {description}
              </small>
            </button>
          ),
        )}
      </section>


      {/* =====================================================
          NOTICES
          ===================================================== */}

      {query.isError && (
        <div
          className="enquiries-notice enquiries-notice--error"
          role="alert"
        >
          <span>
            {
              query.error
                .message
            }

            {loaded
              ? " Showing previously loaded enquiries."
              : " Use Refresh to try again."}
          </span>
        </div>
      )}

      {successMessage && (
        <div
          className="enquiries-notice enquiries-notice--success"
          role="status"
        >
          <CircleCheck
            size={19}
            aria-hidden="true"
          />

          <span>
            {
              successMessage
            }
          </span>

          <button
            type="button"
            aria-label="Dismiss confirmation"
            onClick={() =>
              setSuccessMessage(
                "",
              )
            }
          >
            <X
              size={18}
              aria-hidden="true"
            />
          </button>
        </div>
      )}

      {mutation.isError &&
        !selected && (
          <div
            className="enquiries-notice enquiries-notice--error"
            role="alert"
          >
            <span>
              {
                mutation.error
                  .message
              }
            </span>

            <button
              type="button"
              aria-label="Dismiss error"
              onClick={() =>
                mutation.reset()
              }
            >
              <X
                size={18}
                aria-hidden="true"
              />
            </button>
          </div>
        )}


      {/* =====================================================
          FIND ENQUIRY
          ===================================================== */}

      <section className="enquiries-search-panel">
        <div className="enquiries-section-heading">
          <div>
            <h2>
              Find an enquiry
            </h2>

            <p>
              Search by name,
              phone number,
              course or message.
            </p>
          </div>
        </div>

        <div className="enquiries-search-controls">

          <label className="enquiries-search">
            <Search
              size={20}
              aria-hidden="true"
            />

            <span className="enquiries-sr-only">
              Search enquiries
            </span>

            <input
              type="search"
              value={search}
              placeholder="Search enquiries..."
              onChange={(
                event,
              ) => {
                setSearch(
                  event.target
                    .value,
                );

                setPage(
                  1,
                );
              }}
            />

            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => {
                  setSearch(
                    "",
                  );

                  setPage(
                    1,
                  );
                }}
              >
                <X
                  size={18}
                  aria-hidden="true"
                />
              </button>
            )}
          </label>

          <label className="enquiries-filter">
            <span>
              Course
            </span>

            <select
              value={course}
              onChange={(
                event,
              ) => {
                setCourse(
                  event.target
                    .value,
                );

                setPage(
                  1,
                );
              }}
            >
              <option value="">
                All courses
              </option>

              {courses.map(
                (
                  title,
                ) => (
                  <option
                    key={
                      title
                    }
                    value={
                      title
                    }
                  >
                    {title}
                  </option>
                ),
              )}
            </select>
          </label>

          <label className="enquiries-filter">
            <span>
              Sort by
            </span>

            <select
              value={sort}
              onChange={(
                event,
              ) => {
                setSort(
                  event.target
                    .value as EnquirySort,
                );

                setPage(
                  1,
                );
              }}
            >
              <option value="NEWEST">
                Newest first
              </option>

              <option value="OLDEST">
                Oldest first
              </option>

              <option value="NEW_FIRST">
                Awaiting contact first
              </option>
            </select>
          </label>
        </div>

        {hasFilters && (
          <button
            type="button"
            className="enquiries-clear"
            onClick={
              resetFilters
            }
          >
            <X
              size={15}
              aria-hidden="true"
            />

            Clear search and filters
          </button>
        )}
      </section>


      {/* =====================================================
          ENQUIRY LIST
          ===================================================== */}

      <section className="enquiries-inbox">

        <div className="enquiries-inbox__heading">
          <div>
            <h2>
              Enquiry list
            </h2>

            <p>
              {loaded
                ? `${filtered.length} ${
                    filtered.length ===
                    1
                      ? "enquiry"
                      : "enquiries"
                  }${
                    hasFilters
                      ? " found"
                      : " received"
                  }`
                : "Loading enquiries"}
            </p>
          </div>

          <span className="enquiries-auto-refresh">
            <span />

            Updates every 30 seconds
          </span>
        </div>

        {query.isPending ? (
          <div
            className="enquiries-empty"
            role="status"
          >
            <FileText
              size={34}
              aria-hidden="true"
            />

            <h3>
              Loading enquiries…
            </h3>

            <p>
              Website requests will
              appear here.
            </p>
          </div>
        ) : !loaded ? (
          <div className="enquiries-empty">
            <FileText
              size={34}
              aria-hidden="true"
            />

            <h3>
              Unable to load enquiries
            </h3>

            <p>
              Refresh the page to
              retrieve enquiries.
            </p>
          </div>
        ) : !filtered.length ? (
          <div className="enquiries-empty">
            <MessageSquare
              size={34}
              aria-hidden="true"
            />

            <h3>
              {hasFilters
                ? "No matching enquiries"
                : "No enquiries yet"}
            </h3>

            <p>
              {hasFilters
                ? "Try another search or clear your filters."
                : "New website enquiries will appear here."}
            </p>

            {hasFilters && (
              <button
                type="button"
                className="enquiries-button"
                onClick={
                  resetFilters
                }
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="enquiries-records">

            {paginated.records.map(
              (
                enquiry,
              ) => (
                <article
                  key={
                    enquiry.id
                  }
                  className="enquiry-record"
                >

                  <div className="enquiry-record__main">

                    <div
                      className="enquiry-record__avatar"
                      aria-hidden="true"
                    >
                      {
                        enquiry.name
                          .trim()
                          .slice(
                            0,
                            1,
                          )
                          .toUpperCase()
                      }
                    </div>

                    <div className="enquiry-record__content">

                      <div className="enquiry-record__title-row">

                        <button
                          className="enquiry-record__name"
                          type="button"
                          disabled={
                            mutation.isPending
                          }
                          onClick={() =>
                            openDetails(
                              enquiry.id,
                            )
                          }
                        >
                          {
                            enquiry.name
                          }
                        </button>

                        <span
                          className={`enquiry-record__status enquiry-record__status--${enquiry.status.toLowerCase()}`}
                        >
                          {
                            enquiryStatusLabels[
                              enquiry
                                .status
                            ]
                          }
                        </span>
                      </div>

                      <a
                        className="enquiry-record__phone"
                        href={`tel:${enquiry.phone.replace(
                          /[^+\d]/g,
                          "",
                        )}`}
                      >
                        <Phone
                          size={16}
                          aria-hidden="true"
                        />

                        {
                          enquiry.phone
                        }
                      </a>

                      <div className="enquiry-record__course">
                        <span>
                          Interested in
                        </span>

                        <strong>
                          {
                            enquiry.course
                          }
                        </strong>
                      </div>

                      <div className="enquiry-record__message">
                        <MessageSquare
                          size={16}
                          aria-hidden="true"
                        />

                        <p>
                          {enquiry.message ||
                            "No additional message provided."}
                        </p>
                      </div>

                      <div className="enquiry-record__meta">
                        <span>
                          Received{" "}
                          <strong>
                            {formatEnquiryDate(
                              enquiry.createdAt,
                            )}
                          </strong>
                        </span>

                        {enquiry.student && (
                          <span className="enquiry-record__admitted">
                            <GraduationCap
                              size={15}
                              aria-hidden="true"
                            />

                            Admitted ·{" "}
                            {
                              enquiry
                                .student
                                .admissionNumber
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="enquiry-record__actions">
                    <button
                      className="enquiry-record__view"
                      type="button"
                      disabled={
                        mutation.isPending
                      }
                      onClick={() =>
                        openDetails(
                          enquiry.id,
                        )
                      }
                    >
                      View enquiry

                      <ArrowRight
                        size={17}
                        aria-hidden="true"
                      />
                    </button>
                  </div>
                </article>
              ),
            )}
          </div>
        )}

        {loaded &&
          filtered.length >
            0 && (
            <footer className="enquiries-pagination">

              <span>
                Showing{" "}
                {
                  paginated.start
                }
                –
                {
                  paginated.end
                }{" "}
                of{" "}
                {
                  filtered.length
                }{" "}
                enquiries
              </span>

              <div>
                <button
                  type="button"
                  className="enquiries-page-button"
                  disabled={
                    paginated.currentPage ===
                    1
                  }
                  onClick={() =>
                    setPage(
                      paginated.currentPage -
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
                  {
                    paginated.currentPage
                  }{" "}
                  of{" "}
                  {
                    paginated.pageCount
                  }
                </strong>

                <button
                  type="button"
                  className="enquiries-page-button"
                  disabled={
                    paginated.currentPage ===
                    paginated.pageCount
                  }
                  onClick={() =>
                    setPage(
                      paginated.currentPage +
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
