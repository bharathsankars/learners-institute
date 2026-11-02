import { API_URL } from "./config";
import { getAdminSessionGeneration } from "../admin/auth/sessionEvents";
import { parseApiError } from "./errors";
import type { Weekday } from "./batches";

export type AttendanceStatus = "PRESENT" | "ABSENT";

type BatchSummary = {
  id: string;
  name: string;
  days: Weekday[];
  startMinutes: number;
  endMinutes: number;
  isActive: boolean;
  instructorId: string | null;
};

type StudentSummary = { id: string; admissionNumber: string; firstName: string; lastName: string | null };

export type AttendanceSheet = {
  batch: BatchSummary;
  date: string;
  today: string;
  // Whether the batch normally meets on this weekday.
  scheduled: boolean;
  canEdit: boolean;
  marked: boolean;
  markedBy: { firstName: string; lastName: string } | null;
  markedAt: string | null;
  students: (StudentSummary & { status: AttendanceStatus | null })[];
};

export type AttendanceMonth = {
  batch: BatchSummary;
  month: string;
  days: string[];
  students: (StudentSummary & {
    movedOut: boolean;
    marks: Record<string, AttendanceStatus>;
    present: number;
    absent: number;
    percent: number | null;
  })[];
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(`${API_URL}/api/attendance${path}`, {
    credentials: "include",
    ...init,
    headers: init.body ? { "Content-Type": "application/json" } : undefined,
  });

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }

  return (await response.json()) as T;
}

export async function fetchAttendanceSheet(batchId: string, date: string): Promise<AttendanceSheet> {
  const result = await request<{ data: AttendanceSheet }>(`/sheet?${new URLSearchParams({ batchId, date })}`);

  return result.data;
}

export async function saveAttendance(input: {
  batchId: string;
  date: string;
  records: { studentId: string; status: AttendanceStatus }[];
}): Promise<{ message: string; sheet: AttendanceSheet }> {
  const result = await request<{ message: string; data: AttendanceSheet }>("/sheet", {
    method: "PUT",
    body: JSON.stringify(input),
  });

  return { message: result.message, sheet: result.data };
}

export async function fetchAttendanceMonth(batchId: string, month: string): Promise<AttendanceMonth> {
  const result = await request<{ data: AttendanceMonth }>(`/month?${new URLSearchParams({ batchId, month })}`);

  return result.data;
}
