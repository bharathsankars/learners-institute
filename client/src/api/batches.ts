import { API_URL } from "./config";
import { getAdminSessionGeneration } from "../admin/auth/sessionEvents";
import { parseApiError } from "./errors";
import type { StudentStatus } from "./students";

export type Weekday = "MON" | "TUE" | "WED" | "THU" | "FRI" | "SAT" | "SUN";

export type Batch = {
  id: string;
  name: string;
  days: Weekday[];
  startMinutes: number;
  endMinutes: number;
  capacity: number;
  isActive: boolean;
  instructor: { id: string; firstName: string; lastName: string } | null;
  studentCount: number;
  createdAt: string;
  updatedAt: string;
};

export type BatchInput = {
  name: string;
  days: Weekday[];
  startTime: string;
  endTime: string;
  capacity: number;
  instructorId: string | null;
  isActive: boolean;
};

export type BatchStudent = {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  status: StudentStatus;
  enrollments: { course: { id: string; title: string } }[];
};

export type BatchInstructor = {
  id: string;
  firstName: string;
  lastName: string;
  role: "SUPER_ADMIN" | "ADMIN" | "STAFF";
};

// Every batch endpoint shares the same session handling and error parsing.
async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(`${API_URL}/api/batches${path}`, {
    credentials: "include",
    ...init,
    headers: init.body
      ? { "Content-Type": "application/json", ...init.headers }
      : init.headers,
  });

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }

  return (await response.json()) as T;
}

export async function fetchBatches(): Promise<Batch[]> {
  const result = await request<{ data: { batches: Batch[] } }>("");

  return result.data.batches;
}

export async function fetchBatchInstructors(): Promise<BatchInstructor[]> {
  const result = await request<{ data: { instructors: BatchInstructor[] } }>(
    "/instructors",
  );

  return result.data.instructors;
}

export async function createBatch(input: BatchInput): Promise<Batch> {
  const result = await request<{ data: { batch: Batch } }>("", {
    method: "POST",
    body: JSON.stringify(input),
  });

  return result.data.batch;
}

export async function updateBatch(
  batchId: string,
  input: BatchInput,
): Promise<Batch> {
  const result = await request<{ data: { batch: Batch } }>(
    `/${encodeURIComponent(batchId)}`,
    { method: "PATCH", body: JSON.stringify(input) },
  );

  return result.data.batch;
}

export async function deleteBatch(batchId: string): Promise<void> {
  await request(`/${encodeURIComponent(batchId)}`, { method: "DELETE" });
}

export async function fetchBatchStudents(
  batchId: string,
): Promise<BatchStudent[]> {
  const result = await request<{ data: { students: BatchStudent[] } }>(
    `/${encodeURIComponent(batchId)}/students`,
  );

  return result.data.students;
}

export async function assignBatchStudent(
  batchId: string,
  studentId: string,
): Promise<BatchStudent> {
  const result = await request<{ data: { student: BatchStudent } }>(
    `/${encodeURIComponent(batchId)}/students`,
    { method: "POST", body: JSON.stringify({ studentId }) },
  );

  return result.data.student;
}

export async function removeBatchStudent(
  batchId: string,
  studentId: string,
): Promise<void> {
  await request(
    `/${encodeURIComponent(batchId)}/students/${encodeURIComponent(studentId)}`,
    { method: "DELETE" },
  );
}
