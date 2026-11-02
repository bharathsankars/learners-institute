import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CalendarDays, Check, CircleCheck, ClipboardCheck, Clock3, Save, TriangleAlert, X } from "lucide-react";

import {
  fetchAttendanceMonth,
  fetchAttendanceSheet,
  saveAttendance,
  type AttendanceSheet,
  type AttendanceStatus,
} from "../../api/attendance";
import { fetchBatches } from "../../api/batches";
import { usePermissions } from "../auth/usePermissions";
import { formatBatchDays, formatBatchTiming } from "../utils/batches";

import "../styles/AdminRecords.css";
import "../styles/Attendance.css";

const TIME_ZONE = "Asia/Kolkata";
const LOW_ATTENDANCE = 75;

function instituteToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

function fullName(person: { firstName: string; lastName: string | null }) {
  return [person.firstName, person.lastName].filter(Boolean).join(" ");
}

function initials(person: { firstName: string; lastName: string | null }) {
  return [person.firstName, person.lastName]
    .filter(Boolean)
    .map((part) => part!.trim()[0]?.toUpperCase() ?? "")
    .join("");
}

const longDate = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long" });
const savedAt = new Intl.DateTimeFormat("en-GB", { timeZone: TIME_ZONE, day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: true });

// The marking list for one class. Keyed by batch and date so the draft
// resets whenever either changes.
function Register({ sheet, onSaved }: { sheet: AttendanceSheet; onSaved: (message: string) => void }) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(sheet.students.map((student) => [student.id, student.status ?? "PRESENT"])),
  );

  const save = useMutation({
    mutationFn: () =>
      saveAttendance({
        batchId: sheet.batch.id,
        date: sheet.date,
        records: sheet.students.map((student) => ({ studentId: student.id, status: draft[student.id] ?? "PRESENT" })),
      }),
    onSuccess: async ({ message, sheet: saved }) => {
      queryClient.setQueryData(["attendance-sheet", saved.batch.id, saved.date], saved);
      onSaved(message);
      await queryClient.invalidateQueries({ queryKey: ["attendance-month", saved.batch.id] });
    },
  });

  const present = sheet.students.filter((student) => draft[student.id] !== "ABSENT").length;
  const absent = sheet.students.length - present;
  const changed = sheet.students.some((student) => (student.status ?? null) !== draft[student.id]);

  if (!sheet.students.length) {
    return (
      <div className="records-empty">
        <ClipboardCheck size={28} aria-hidden="true" />
        <h3>No students in this batch</h3>
        <p>Add students to {sheet.batch.name} from the Batches page first.</p>
      </div>
    );
  }

  return (
    <>
      <div className="attendance-summary">
        <span className="attendance-count attendance-count--present">
          <strong>{present}</strong> present
        </span>
        <span className="attendance-count attendance-count--absent">
          <strong>{absent}</strong> absent
        </span>
        <span className="attendance-summary__state">
          {sheet.marked
            ? `Saved${sheet.markedBy ? ` by ${fullName(sheet.markedBy)}` : ""}${sheet.markedAt ? ` · ${savedAt.format(new Date(sheet.markedAt))}` : ""}`
            : "Not marked yet: everyone starts as present"}
        </span>
        {sheet.canEdit && (
          <button
            type="button"
            className="records-clear"
            disabled={save.isPending}
            onClick={() => setDraft(Object.fromEntries(sheet.students.map((student) => [student.id, "PRESENT"])))}
          >
            Mark all present
          </button>
        )}
      </div>

      <ul className="attendance-list">
        {sheet.students.map((student) => {
          const status = draft[student.id] ?? "PRESENT";

          return (
            <li key={student.id} className={status === "ABSENT" ? "attendance-row attendance-row--absent" : "attendance-row"}>
              <span className="records-avatar" aria-hidden="true">
                {initials(student)}
              </span>
              <div className="attendance-row__name">
                <strong>{fullName(student)}</strong>
                <span>{student.admissionNumber}</span>
              </div>
              <div className="attendance-toggle" role="group" aria-label={`Attendance for ${fullName(student)}`}>
                {(["PRESENT", "ABSENT"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`attendance-toggle__option attendance-toggle__option--${option.toLowerCase()}`}
                    aria-pressed={status === option}
                    disabled={!sheet.canEdit || save.isPending}
                    onClick={() => setDraft({ ...draft, [student.id]: option })}
                  >
                    {option === "PRESENT" ? <Check size={15} aria-hidden="true" /> : <X size={15} aria-hidden="true" />}
                    {option === "PRESENT" ? "Present" : "Absent"}
                  </button>
                ))}
              </div>
            </li>
          );
        })}
      </ul>

      <footer className="records-pagination attendance-footer">
        {save.isError ? (
          <span className="attendance-error" role="alert">
            {save.error.message}
          </span>
        ) : !sheet.canEdit ? (
          <span>This day can no longer be changed from your account. Ask an administrator.</span>
        ) : (
          <span>{sheet.marked && !changed ? "No unsaved changes" : `${present} present, ${absent} absent`}</span>
        )}
        {sheet.canEdit && (
          <button
            type="button"
            className="records-button records-button--primary"
            disabled={save.isPending || (sheet.marked && !changed)}
            onClick={() => save.mutate()}
          >
            <Save size={16} aria-hidden="true" />
            {save.isPending ? "Saving…" : sheet.marked ? "Save changes" : "Save attendance"}
          </button>
        )}
      </footer>
    </>
  );
}

function MonthlyRegister({ batchId, month }: { batchId: string; month: string }) {
  const query = useQuery({
    queryKey: ["attendance-month", batchId, month],
    queryFn: () => fetchAttendanceMonth(batchId, month),
  });

  if (query.isPending) {
    return <div className="records-empty">Loading the register…</div>;
  }

  if (query.isError) {
    return (
      <div className="records-empty">
        <h3>The register could not be loaded</h3>
        <p>{query.error.message}</p>
      </div>
    );
  }

  const { days, students } = query.data;

  if (!days.length) {
    return (
      <div className="records-empty">
        <CalendarDays size={28} aria-hidden="true" />
        <h3>No attendance this month</h3>
        <p>Marked classes will appear here as a register.</p>
      </div>
    );
  }

  return (
    <div className="attendance-month">
      <table>
        <thead>
          <tr>
            <th scope="col">Student</th>
            {days.map((day) => (
              <th key={day} scope="col" title={longDate.format(new Date(`${day}T00:00:00Z`))}>
                {Number(day.slice(8))}
              </th>
            ))}
            <th scope="col">Present</th>
            <th scope="col">%</th>
          </tr>
        </thead>
        <tbody>
          {students.map((student) => (
            <tr key={student.id}>
              <th scope="row">
                <strong>{fullName(student)}</strong>
                <span>
                  {student.admissionNumber}
                  {student.movedOut && " · moved"}
                </span>
              </th>
              {days.map((day) => {
                const mark = student.marks[day];

                return (
                  <td key={day} className={mark ? `attendance-mark attendance-mark--${mark.toLowerCase()}` : "attendance-mark"}>
                    {mark === "PRESENT" ? "P" : mark === "ABSENT" ? "A" : "·"}
                  </td>
                );
              })}
              <td className="attendance-month__total">
                {student.present}/{student.present + student.absent}
              </td>
              <td
                className={
                  student.percent !== null && student.percent < LOW_ATTENDANCE
                    ? "attendance-month__percent attendance-month__percent--low"
                    : "attendance-month__percent"
                }
              >
                {student.percent === null ? "–" : `${student.percent}%`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="attendance-month__note">Below {LOW_ATTENDANCE}% is highlighted. “·” means not marked that day.</p>
    </div>
  );
}

export function AttendancePage() {
  const { canManage, userId } = usePermissions();
  const [params, setParams] = useSearchParams();
  const today = instituteToday();

  const [view, setView] = useState<"mark" | "month">("mark");
  const [date, setDate] = useState(today);
  const [month, setMonth] = useState(today.slice(0, 7));
  const [notice, setNotice] = useState("");

  const batches = useQuery({ queryKey: ["batches"], queryFn: fetchBatches });

  // Lecturers take attendance for the batches they teach.
  const available = (batches.data ?? []).filter(
    (batch) => batch.isActive && (canManage || batch.instructor?.id === userId),
  );
  const batchId = params.get("batch") && available.some((batch) => batch.id === params.get("batch"))
    ? params.get("batch")!
    : available[0]?.id ?? "";
  const batch = available.find((item) => item.id === batchId);

  const sheet = useQuery({
    queryKey: ["attendance-sheet", batchId, date],
    queryFn: () => fetchAttendanceSheet(batchId, date),
    enabled: Boolean(batchId) && view === "mark",
  });

  return (
    <div className="attendance-page records-page">
      <header className="records-header">
        <div>
          <span className="records-eyebrow">Classes & timings</span>
          <h1>Attendance</h1>
          <p>
            {canManage
              ? "Take attendance for any batch and review the monthly register."
              : "Take attendance for your batches. You can correct the last 7 days."}
          </p>
        </div>
      </header>

      {notice && (
        <div className="records-notice records-notice--success" role="status">
          <CircleCheck size={18} aria-hidden="true" />
          <span>{notice}</span>
          <button type="button" aria-label="Dismiss message" onClick={() => setNotice("")}>
            <X size={16} aria-hidden="true" />
          </button>
        </div>
      )}

      {batches.isPending ? (
        <div className="records-panel records-empty">Loading batches…</div>
      ) : !available.length ? (
        <div className="records-panel records-empty">
          <Clock3 size={28} aria-hidden="true" />
          <h3>{canManage ? "No active batches" : "No batches assigned to you yet"}</h3>
          <p>
            {canManage
              ? "Create a batch and add students before taking attendance."
              : "Ask an administrator to set you as the instructor of your batches."}
          </p>
        </div>
      ) : (
        <section className="records-panel" aria-label="Attendance">
          <div className="records-tabs" role="group" aria-label="Attendance view">
            <button
              type="button"
              className={view === "mark" ? "records-tab records-tab--active" : "records-tab"}
              aria-pressed={view === "mark"}
              onClick={() => setView("mark")}
            >
              Take attendance
            </button>
            <button
              type="button"
              className={view === "month" ? "records-tab records-tab--active" : "records-tab"}
              aria-pressed={view === "month"}
              onClick={() => setView("month")}
            >
              Monthly register
            </button>
          </div>

          <div className="records-toolbar">
            <label className="records-select attendance-batch">
              <span className="records-sr-only">Batch</span>
              <select
                value={batchId}
                onChange={(event) => {
                  setNotice("");
                  setParams({ batch: event.target.value }, { replace: true });
                }}
              >
                {available.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {formatBatchTiming(item)}
                  </option>
                ))}
              </select>
            </label>

            {view === "mark" ? (
              <label className="records-select">
                <span className="records-sr-only">Date</span>
                <input
                  className="attendance-date"
                  type="date"
                  value={date}
                  max={today}
                  onChange={(event) => {
                    setNotice("");
                    if (event.target.value) setDate(event.target.value);
                  }}
                />
              </label>
            ) : (
              <label className="records-select">
                <span className="records-sr-only">Month</span>
                <input
                  className="attendance-date"
                  type="month"
                  value={month}
                  max={today.slice(0, 7)}
                  onChange={(event) => event.target.value && setMonth(event.target.value)}
                />
              </label>
            )}

            {batch && (
              <span className="attendance-batch-info">
                {formatBatchDays(batch.days)} · {batch.studentCount} {batch.studentCount === 1 ? "student" : "students"}
              </span>
            )}
          </div>

          {view === "month" ? (
            <MonthlyRegister key={`${batchId}-${month}`} batchId={batchId} month={month} />
          ) : sheet.isPending ? (
            <div className="records-list" aria-label="Loading attendance">
              {Array.from({ length: 5 }, (_, row) => (
                <div key={row} className="attendance-row">
                  <span className="records-skeleton records-skeleton--avatar" />
                  <span className="records-skeleton" style={{ width: "40%" }} />
                </div>
              ))}
            </div>
          ) : sheet.isError ? (
            <div className="records-empty">
              <h3>Attendance could not be loaded</h3>
              <p>{sheet.error.message}</p>
            </div>
          ) : (
            <>
              <div className="attendance-day">
                <strong>{longDate.format(new Date(`${sheet.data.date}T00:00:00Z`))}</strong>
                {sheet.data.date === sheet.data.today && <span className="records-status records-status--active">Today</span>}
                {!sheet.data.scheduled && (
                  <span className="attendance-day__warning">
                    <TriangleAlert size={14} aria-hidden="true" />
                    {sheet.data.batch.name} doesn’t usually meet on this day.
                  </span>
                )}
              </div>
              <Register key={`${sheet.data.batch.id}-${sheet.data.date}-${sheet.data.markedAt ?? ""}`} sheet={sheet.data} onSaved={setNotice} />
            </>
          )}
        </section>
      )}
    </div>
  );
}
