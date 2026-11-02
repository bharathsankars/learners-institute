import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleCheck, Clock3, Pencil, Plus, Search, UserMinus, Users, X } from "lucide-react";

import {
  assignBatchStudent,
  fetchBatchStudents,
  removeBatchStudent,
  type Batch,
} from "../../api/batches";
import { fetchStudents } from "../../api/students";
import { batchSeatState, formatBatchDays, formatBatchTiming } from "../utils/batches";

import "../styles/AddStudentModal.css";
import "../styles/Batches.css";

type Props = {
  // Lecturers see the student list read-only.
  canManage?: boolean;
  batch: Batch;
  batches: Batch[];
  onClose: () => void;
  onEdit: () => void;
};

function fullName(person: { firstName: string; lastName: string | null }) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ");
}

function initials(person: { firstName: string; lastName: string | null }) {
  return [person.firstName, person.lastName]
    .filter(Boolean)
    .map((part) => part!.trim()[0]?.toUpperCase() ?? "")
    .join("");
}

export function BatchRosterDialog({ canManage = true, batch, batches, onClose, onEdit }: Props) {
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");

  const roster = useQuery({
    queryKey: ["batch-students", batch.id],
    queryFn: () => fetchBatchStudents(batch.id),
  });

  const students = useQuery({
    queryKey: ["students"],
    queryFn: fetchStudents,
    enabled: canManage,
  });

  const refresh = async (previousBatchId?: string | null) => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["batch-students", batch.id] }),
      queryClient.invalidateQueries({ queryKey: ["batches"] }),
      queryClient.invalidateQueries({ queryKey: ["students"] }),
      ...(previousBatchId
        ? [queryClient.invalidateQueries({ queryKey: ["batch-students", previousBatchId] })]
        : []),
    ]);
  };

  const assign = useMutation({
    mutationFn: ({ studentId }: { studentId: string; previousBatchId: string | null }) =>
      assignBatchStudent(batch.id, studentId),
    onSuccess: async (student, { previousBatchId }) => {
      setSearch("");
      setNotice(`${fullName(student)} added to ${batch.name}.`);
      await refresh(previousBatchId);
    },
  });

  const remove = useMutation({
    mutationFn: ({ studentId }: { studentId: string; name: string }) =>
      removeBatchStudent(batch.id, studentId),
    onSuccess: async (_data, { name }) => {
      setNotice(`${name} removed from ${batch.name}.`);
      await refresh();
    },
  });

  const busy = assign.isPending || remove.isPending;
  const batchNames = new Map(batches.map((item) => [item.id, item.name]));
  const seatState = batchSeatState(batch);
  const seatsLeft = batch.capacity - batch.studentCount;
  const term = search.trim().toLowerCase();
  const digits = term.replace(/\D/g, "");

  // Active students not already here, matched by name, admission number or phone.
  const matches = term
    ? (students.data ?? [])
        .filter((student) => student.status === "ACTIVE" && student.batchId !== batch.id)
        .filter((student) =>
          `${fullName(student)} ${student.admissionNumber}`.toLowerCase().includes(term) ||
          (digits.length >= 4 && student.phone.replace(/\D/g, "").includes(digits)),
        )
        .slice(0, 6)
    : [];

  const error = assign.error?.message || remove.error?.message;

  return (
    <dialog
      ref={dialogRef}
      className="student-modal batch-roster"
      aria-labelledby="batch-roster-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header className="student-modal__header">
        <div className="student-modal__heading">
          <div className="student-modal__heading-icon">
            <Users size={20} strokeWidth={1.8} aria-hidden="true" />
          </div>
          <div>
            <span className="student-modal__eyebrow">Batch students</span>
            <h2 id="batch-roster-title">{batch.name}</h2>
            <p className="batch-roster__meta">
              <Clock3 size={14} aria-hidden="true" />
              {formatBatchTiming(batch)} · {formatBatchDays(batch.days)}
              {batch.instructor && ` · ${fullName(batch.instructor)}`}
            </p>
          </div>
        </div>
        <button
          className="student-modal__close"
          type="button"
          onClick={onClose}
          disabled={busy}
          aria-label="Close batch students"
        >
          <X size={20} aria-hidden="true" />
        </button>
      </header>

      <div className="student-modal__body">
        <div className={`batch-roster__seats batch-roster__seats--${seatState}`}>
          <div>
            <strong>
              {batch.studentCount} of {batch.capacity} seats filled
            </strong>
            <span>
              {!batch.isActive
                ? "Archived — this batch cannot take new students."
                : seatState === "full"
                  ? "This batch is full."
                  : `${seatsLeft} ${seatsLeft === 1 ? "seat" : "seats"} available`}
            </span>
          </div>
          <span className="batch-seats__bar" aria-hidden="true">
            <span style={{ width: `${Math.min(100, (batch.studentCount / batch.capacity) * 100)}%` }} />
          </span>
        </div>

        {notice && (
          <div className="batch-roster__notice" role="status">
            <CircleCheck size={16} aria-hidden="true" />
            <span>{notice}</span>
            <button type="button" aria-label="Dismiss message" onClick={() => setNotice("")}>
              <X size={14} aria-hidden="true" />
            </button>
          </div>
        )}

        {error && (
          <div className="student-modal__server-error" role="alert">
            {error}
          </div>
        )}

        {canManage && batch.isActive && seatState !== "full" && (
          <section className="batch-roster__add" aria-label="Add a student">
            <label className="records-search">
              <Search size={17} aria-hidden="true" />
              <span className="records-sr-only">Find a student to add</span>
              <input
                type="search"
                value={search}
                placeholder="Add a student: search name, admission number or phone"
                onChange={(event) => {
                  setSearch(event.target.value);
                  assign.reset();
                }}
                disabled={busy}
              />
            </label>

            {term && (
              <ul className="batch-roster__matches">
                {students.isPending ? (
                  <li className="batch-roster__empty-match">Loading students…</li>
                ) : !matches.length ? (
                  <li className="batch-roster__empty-match">No active students match.</li>
                ) : (
                  matches.map((student) => {
                    const currentBatch = student.batchId ? batchNames.get(student.batchId) : null;

                    return (
                      <li key={student.id}>
                        <span className="records-avatar" aria-hidden="true">
                          {initials(student)}
                        </span>
                        <div>
                          <strong>{fullName(student)}</strong>
                          <span>
                            {student.admissionNumber}
                            {currentBatch && <em> · now in {currentBatch}</em>}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="records-action"
                          disabled={busy}
                          onClick={() =>
                            assign.mutate({ studentId: student.id, previousBatchId: student.batchId })
                          }
                        >
                          <Plus size={14} aria-hidden="true" />
                          {currentBatch ? "Move here" : "Add"}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            )}
          </section>
        )}

        <section aria-label="Students in this batch">
          {roster.isPending ? (
            <div className="batch-roster__list" aria-hidden="true">
              {Array.from({ length: 3 }, (_, row) => (
                <div key={row} className="batch-roster__student">
                  <span className="records-skeleton records-skeleton--avatar" />
                  <span className="records-skeleton" style={{ width: "40%" }} />
                </div>
              ))}
            </div>
          ) : roster.isError ? (
            <p className="batch-roster__empty">Students could not be loaded.</p>
          ) : !roster.data.length ? (
            <p className="batch-roster__empty">No students in this batch yet.</p>
          ) : (
            <ul className="batch-roster__list">
              {roster.data.map((student) => (
                <li key={student.id} className="batch-roster__student">
                  <span className="records-avatar" aria-hidden="true">
                    {initials(student)}
                  </span>
                  <div className="batch-roster__identity">
                    <strong>{fullName(student)}</strong>
                    <span>{student.admissionNumber}</span>
                  </div>
                  <div className="records-skills">
                    {student.enrollments.length ? (
                      student.enrollments.map(({ course }) => <span key={course.id}>{course.title}</span>)
                    ) : (
                      <small>No active course</small>
                    )}
                  </div>
                  {canManage && <button
                    type="button"
                    className="records-action records-action--icon records-action--danger"
                    disabled={busy}
                    aria-label={`Remove ${fullName(student)} from ${batch.name}`}
                    title="Remove from batch"
                    onClick={() => remove.mutate({ studentId: student.id, name: fullName(student) })}
                  >
                    <UserMinus size={15} aria-hidden="true" />
                  </button>}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <footer className="student-modal__actions">
        <span className="student-modal__save-note">A student can be in one batch at a time.</span>
        <div>
          <button className="student-modal__cancel" type="button" onClick={onClose} disabled={busy}>
            Close
          </button>
          {canManage && (
            <button className="student-modal__submit" type="button" onClick={onEdit} disabled={busy}>
              <Pencil size={15} aria-hidden="true" />
              Edit batch
            </button>
          )}
        </div>
      </footer>
    </dialog>
  );
}
