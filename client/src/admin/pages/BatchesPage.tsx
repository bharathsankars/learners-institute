import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  Clock3,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from "lucide-react";

import {
  createBatch,
  deleteBatch,
  fetchBatches,
  updateBatch,
  type Batch,
  type BatchInput,
} from "../../api/batches";
import { BatchModal } from "../components/BatchModal";
import { BatchRosterDialog } from "../components/BatchRosterDialog";
import { DeleteConfirmationDialog } from "../components/DeleteConfirmationDialog";
import {
  batchCounts,
  batchSeatState,
  filterBatches,
  formatBatchDays,
  formatBatchDuration,
  formatBatchTiming,
  type BatchFilter,
  type BatchSort,
} from "../utils/batches";
import { paginateCourses as paginate } from "../utils/courses";
import { usePermissions } from "../auth/usePermissions";

import "../styles/AdminRecords.css";
import "../styles/Batches.css";

const statusTabs = [
  { key: "ALL", label: "All" },
  { key: "ACTIVE", label: "Active" },
  { key: "ARCHIVED", label: "Archived" },
] as const;

export function BatchesPage() {
  const queryClient = useQueryClient();
  const { canManage, userId } = usePermissions();

  const query = useQuery({
    queryKey: ["batches"],
    queryFn: fetchBatches,
    refetchInterval: 30000,
  });

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<BatchFilter>("ACTIVE");
  const [sort, setSort] = useState<BatchSort>("TIME");
  const [page, setPage] = useState(1);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Batch | null>(null);
  const [rosterId, setRosterId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Batch | null>(null);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  // Lecturers see only the batches they teach.
  const batches = (query.data ?? []).filter(
    (batch) => canManage || batch.instructor?.id === userId,
  );
  const counts = batchCounts(batches);
  const filtered = filterBatches(batches, { search, status, sort });
  const pagination = paginate(filtered, page);
  const loaded = query.data !== undefined;
  const hasFilters = Boolean(search.trim()) || status !== "ACTIVE";

  // Read from the live list so seat counts update after students are moved.
  const roster = batches.find((batch) => batch.id === rosterId);

  const save = useMutation({
    mutationFn: ({ input, batchId }: { input: BatchInput; batchId?: string }) =>
      batchId ? updateBatch(batchId, input) : createBatch(input),
    onSuccess: async (batch, { batchId }) => {
      setFormOpen(false);
      setEditing(null);
      setFormError("");
      setNotice(`${batch.name} ${batchId ? "updated" : "added"} successfully.`);
      await queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
    onError: (error) => setFormError(error.message),
  });

  const remove = useMutation({
    mutationFn: deleteBatch,
    onSuccess: async (_data, batchId) => {
      setDeleting(null);
      queryClient.setQueryData<Batch[]>(["batches"], (records) =>
        records?.filter((record) => record.id !== batchId),
      );
      setNotice("Batch deleted.");
      await queryClient.invalidateQueries({ queryKey: ["batches"] });
    },
  });

  const busy = save.isPending || remove.isPending;

  const openForm = (batch: Batch | null = null) => {
    if (busy) return;
    setRosterId(null);
    setEditing(batch);
    setFormError("");
    setFormOpen(true);
  };

  const selectStatus = (filter: BatchFilter) => {
    setStatus(filter);
    setPage(1);
  };

  const resetFilters = () => {
    setSearch("");
    setStatus("ACTIVE");
    setPage(1);
  };

  return (
    <div className="batches-page records-page">
      <header className="records-header">
        <div>
          <span className="records-eyebrow">Classes & timings</span>
          <h1>{canManage ? "Batches" : "My batches"}</h1>
          <p>
            {canManage
              ? "Plan class time slots, track seats and keep each batch’s students in one place."
              : "The batches you teach, their students and attendance."}
          </p>
        </div>

        <div className="records-header__actions">
          <button
            className="records-button records-button--icon"
            type="button"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
            aria-label={query.isFetching ? "Refreshing batches" : "Refresh batches"}
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
            className="records-button records-button--primary"
            type="button"
            disabled={busy}
            onClick={() => openForm()}
          >
            <Plus size={17} aria-hidden="true" />
            Add batch
          </button>
          )}
        </div>
      </header>

      {query.isError && (
        <div className="records-notice records-notice--error" role="alert">
          <span>
            {query.error.message}
            {loaded ? " Showing previously loaded batches." : " Use Refresh to try again."}
          </span>
        </div>
      )}

      {notice && (
        <div className="records-notice records-notice--success" role="status">
          <CircleCheck size={18} aria-hidden="true" />
          <span>{notice}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setNotice("")}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {!deleting && remove.isError && (
        <div className="records-notice records-notice--error" role="alert">
          <span>{remove.error.message}</span>
          <button type="button" aria-label="Dismiss error" onClick={() => remove.reset()}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      <section className="records-panel" aria-label="Batch list">
        <div className="records-tabs" role="group" aria-label="Filter by status">
          {statusTabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              className={status === key ? "records-tab records-tab--active" : "records-tab"}
              aria-pressed={status === key}
              onClick={() => selectStatus(key)}
            >
              {label}
              <span className="records-tab__count">{loaded ? counts[key] : "·"}</span>
            </button>
          ))}
        </div>

        <div className="records-toolbar">
          <label className="records-search">
            <Search size={17} aria-hidden="true" />
            <span className="records-sr-only">Search batches</span>
            <input
              type="search"
              value={search}
              placeholder="Search by batch name, instructor or days"
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
                setSort(event.target.value as BatchSort);
                setPage(1);
              }}
            >
              <option value="TIME">Time of day</option>
              <option value="NAME">Batch name A–Z</option>
              <option value="FULLEST">Fullest first</option>
            </select>
          </label>

          {hasFilters && (
            <button type="button" className="records-clear" onClick={resetFilters}>
              <X size={14} aria-hidden="true" />
              Clear
            </button>
          )}
        </div>

        {query.isPending ? (
          <div className="records-list" role="status" aria-label="Loading batches">
            {Array.from({ length: 5 }, (_, row) => (
              <div key={row} className="records-row records-row--skeleton">
                <span className="records-skeleton records-skeleton--avatar records-skeleton--square" />
                <span className="records-skeleton" style={{ width: "60%" }} />
                <span className="records-skeleton" style={{ width: "70%" }} />
                <span className="records-skeleton" style={{ width: "50%" }} />
                <span className="records-skeleton" style={{ width: "72px" }} />
              </div>
            ))}
          </div>
        ) : !loaded ? (
          <div className="records-empty">
            <Clock3 size={28} aria-hidden="true" />
            <h3>Unable to load batches</h3>
            <p>Use Refresh to try again.</p>
          </div>
        ) : !filtered.length ? (
          <div className="records-empty">
            <Clock3 size={28} aria-hidden="true" />
            <h3>
              {batches.length
                ? "No matching batches"
                : canManage
                  ? "Set up your first batch"
                  : "No batches assigned to you yet"}
            </h3>
            <p>
              {batches.length
                ? "Try another search or show all batches."
                : canManage
                  ? "Create a class time slot, then add students from any course to it."
                  : "Ask an administrator to set you as the instructor of your batches."}
            </p>
            {(batches.length > 0 || canManage) && <button
              type="button"
              className={batches.length ? "records-button" : "records-button records-button--primary"}
              onClick={batches.length ? resetFilters : () => openForm()}
            >
              {batches.length ? "Clear filters" : "Add your first batch"}
            </button>}
          </div>
        ) : (
          <div className="records-list">
            <div className="records-columns records-columns--batches" aria-hidden="true">
              <span>Batch</span>
              <span>Timing</span>
              <span>Instructor</span>
              <span>Seats</span>
              <span>Status</span>
              <span />
            </div>

            {pagination.records.map((batch) => {
              const seatState = batchSeatState(batch);

              return (
                <article key={batch.id} className="records-row records-row--batches">
                  <div className="records-person">
                    <span className="records-avatar records-avatar--square" aria-hidden="true">
                      <Clock3 size={17} />
                    </span>
                    <div>
                      <button
                        type="button"
                        className="records-name"
                        disabled={busy}
                        onClick={() => setRosterId(batch.id)}
                      >
                        {batch.name}
                      </button>
                      <span className="records-sub">{formatBatchDays(batch.days)}</span>
                    </div>
                  </div>

                  <div className="records-detail">
                    <strong>{formatBatchTiming(batch)}</strong>
                    <span className="records-sub">{formatBatchDuration(batch)}</span>
                  </div>

                  <div className="records-instructor">
                    {batch.instructor ? (
                      `${batch.instructor.firstName} ${batch.instructor.lastName}`
                    ) : (
                      <span className="records-sub records-sub--faint">Not assigned</span>
                    )}
                  </div>

                  <div className={`batch-seats batch-seats--${seatState}`}>
                    <span className="batch-seats__text">
                      <strong>{batch.studentCount}</strong> / {batch.capacity}
                      {seatState === "full" && <em>Full</em>}
                    </span>
                    <span className="batch-seats__bar" aria-hidden="true">
                      <span style={{ width: `${Math.min(100, (batch.studentCount / batch.capacity) * 100)}%` }} />
                    </span>
                  </div>

                  <span
                    className={`records-status records-status--${batch.isActive ? "active" : "archived"}`}
                  >
                    {batch.isActive ? "Active" : "Archived"}
                  </span>

                  <div className="records-actions">
                    <Link
                      className="records-action records-action--icon"
                      to={`/admin/attendance?batch=${batch.id}`}
                      aria-label={`Attendance for ${batch.name}`}
                      title="Attendance"
                    >
                      <ClipboardCheck size={15} aria-hidden="true" />
                    </Link>
                    {canManage && (
                    <>
                    <button
                      type="button"
                      className="records-action records-action--icon"
                      disabled={busy}
                      onClick={() => openForm(batch)}
                      aria-label={`Edit ${batch.name}`}
                      title="Edit"
                    >
                      <Pencil size={15} aria-hidden="true" />
                    </button>
                    <button
                      type="button"
                      className="records-action records-action--icon records-action--danger"
                      disabled={busy}
                      onClick={() => {
                        remove.reset();
                        setNotice("");
                        setDeleting(batch);
                      }}
                      aria-label={`Delete ${batch.name}`}
                      title="Delete"
                    >
                      <Trash2 size={15} aria-hidden="true" />
                    </button>
                    </>
                    )}
                    <button
                      type="button"
                      className="records-action"
                      disabled={busy}
                      onClick={() => setRosterId(batch.id)}
                      aria-label={`Students in ${batch.name}`}
                    >
                      Students
                      <ArrowRight size={15} aria-hidden="true" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}

        {loaded && filtered.length > 0 && (
          <footer className="records-pagination">
            <span>
              Showing {pagination.start}–{pagination.end} of {filtered.length}{" "}
              {filtered.length === 1 ? "batch" : "batches"}
              <span className="records-live">Updates every 30 seconds</span>
            </span>
            <div>
              <button
                type="button"
                className="records-page-button"
                disabled={pagination.currentPage === 1}
                aria-label="Previous page"
                onClick={() => setPage(pagination.currentPage - 1)}
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
                aria-label="Next page"
                onClick={() => setPage(pagination.currentPage + 1)}
              >
                <ChevronRight size={17} aria-hidden="true" />
              </button>
            </div>
          </footer>
        )}
      </section>

      {roster && (
        <BatchRosterDialog
          canManage={canManage}
          batch={roster}
          batches={batches}
          onClose={() => setRosterId(null)}
          onEdit={() => openForm(roster)}
        />
      )}

      {deleting && (
        <DeleteConfirmationDialog
          entity="batch"
          name={deleting.name}
          reference={`${formatBatchTiming(deleting)} · ${formatBatchDays(deleting.days)}`}
          isDeleting={remove.isPending}
          error={remove.error?.message}
          onClose={() => {
            if (!remove.isPending) {
              setDeleting(null);
              remove.reset();
            }
          }}
          onConfirm={() => {
            if (!busy) remove.mutate(deleting.id);
          }}
        />
      )}

      <BatchModal
        open={formOpen}
        batch={editing}
        isSubmitting={save.isPending}
        serverError={formError}
        onClose={() => {
          if (!save.isPending) {
            setFormOpen(false);
            setEditing(null);
            setFormError("");
          }
        }}
        onSave={async (input, batchId) => {
          setFormError("");
          await save.mutateAsync({ input, batchId });
        }}
      />
    </div>
  );
}
