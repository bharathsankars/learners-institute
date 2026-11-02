import type { Batch, Weekday } from "../../api/batches";

export const WEEKDAYS: { key: Weekday; short: string }[] = [
  { key: "MON", short: "Mon" },
  { key: "TUE", short: "Tue" },
  { key: "WED", short: "Wed" },
  { key: "THU", short: "Thu" },
  { key: "FRI", short: "Fri" },
  { key: "SAT", short: "Sat" },
  { key: "SUN", short: "Sun" },
];

export type BatchFilter = "ALL" | "ACTIVE" | "ARCHIVED";
export type BatchSort = "TIME" | "NAME" | "FULLEST";

// 450 -> "7:30 AM"
export function formatBatchTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24;
  const period = hours < 12 ? "AM" : "PM";

  return `${hours % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${period}`;
}

export function formatBatchTiming(batch: Pick<Batch, "startMinutes" | "endMinutes">): string {
  return `${formatBatchTime(batch.startMinutes)} – ${formatBatchTime(batch.endMinutes)}`;
}

// 90 -> "1 hr 30 min"
export function formatBatchDuration(batch: Pick<Batch, "startMinutes" | "endMinutes">): string {
  const total = batch.endMinutes - batch.startMinutes;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;

  return [hours && `${hours} hr`, minutes && `${minutes} min`].filter(Boolean).join(" ");
}

// 450 -> "07:30", the value an <input type="time"> expects.
export function toTimeInput(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

// Consecutive runs of three or more days collapse: ["MON".."SAT"] -> "Mon–Sat".
export function formatBatchDays(days: Weekday[]): string {
  if (days.length === 7) {
    return "Every day";
  }

  const indexes = WEEKDAYS.map((day, index) => (days.includes(day.key) ? index : -1)).filter((index) => index >= 0);
  const runs: number[][] = [];

  for (const index of indexes) {
    const run = runs[runs.length - 1];

    if (run && index === run[run.length - 1]! + 1) {
      run.push(index);
    } else {
      runs.push([index]);
    }
  }

  return runs
    .flatMap((run) =>
      run.length >= 3
        ? [`${WEEKDAYS[run[0]!]!.short}–${WEEKDAYS[run[run.length - 1]!]!.short}`]
        : run.map((index) => WEEKDAYS[index]!.short),
    )
    .join(", ");
}

export type SeatState = "open" | "nearly" | "full";

export function batchSeatState(batch: Pick<Batch, "studentCount" | "capacity">): SeatState {
  if (batch.studentCount >= batch.capacity) {
    return "full";
  }

  return batch.capacity - batch.studentCount <= Math.max(1, Math.ceil(batch.capacity * 0.1)) ? "nearly" : "open";
}

export function batchCounts(batches: Batch[]) {
  return {
    ALL: batches.length,
    ACTIVE: batches.filter((batch) => batch.isActive).length,
    ARCHIVED: batches.filter((batch) => !batch.isActive).length,
  };
}

export function filterBatches(
  batches: Batch[],
  criteria: { search: string; status: BatchFilter; sort: BatchSort },
): Batch[] {
  const search = criteria.search.trim().toLowerCase();

  return batches
    .filter((batch) => {
      const instructor = batch.instructor ? `${batch.instructor.firstName} ${batch.instructor.lastName}` : "";
      const text = `${batch.name} ${instructor} ${formatBatchDays(batch.days)}`.toLowerCase();

      return (
        (criteria.status === "ALL" || batch.isActive === (criteria.status === "ACTIVE")) &&
        (!search || text.includes(search))
      );
    })
    .sort((a, b) => {
      if (criteria.sort === "NAME") {
        return a.name.localeCompare(b.name, "en", { sensitivity: "base" });
      }

      if (criteria.sort === "FULLEST") {
        return b.studentCount / b.capacity - a.studentCount / a.capacity || a.startMinutes - b.startMinutes;
      }

      return a.startMinutes - b.startMinutes || a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    });
}
