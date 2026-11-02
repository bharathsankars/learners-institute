import { API_URL } from "./config";
import { getAdminSessionGeneration } from "../admin/auth/sessionEvents";
import { parseApiError } from "./errors";
import type { AdmissionSource, CreateStudentInput, StudentStatus } from "./students";

export type { AdmissionSource };

export type Admission = {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  status: StudentStatus;
  createdAt: string;
  admissionSource: AdmissionSource | null;
  admittedBy: { id: string; firstName: string; lastName: string } | null;
  batch: { id: string; name: string; startMinutes: number; endMinutes: number } | null;
  enrollments: {
    id: string;
    status: "ACTIVE" | "COMPLETED" | "CANCELLED";
    course: { id: string; title: string };
  }[];
};

export type AdmissionFeeInput = {
  courseId: string;
  totalFeePaise: number;
  discountPaise: number;
  dueDate?: string;
};

export type AdmissionInput = {
  student: CreateStudentInput;
  enquiryId?: string | null;
  courseIds: string[];
  batchId: string | null;
  fees: AdmissionFeeInput[];
};

export async function createAdmission(input: AdmissionInput): Promise<Admission> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(`${API_URL}/api/admissions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }

  const result = (await response.json()) as { data: { admission: Admission } };

  return result.data.admission;
}
