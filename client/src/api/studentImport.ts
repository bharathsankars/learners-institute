import { API_URL } from "./config";
import { getAdminSessionGeneration } from "../admin/auth/sessionEvents";
import { parseApiError } from "./errors";

export type ImportPreviewRow = {
  rowNumber: number;
  data: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    dateOfBirth: string;
    gender: string;
    address: string;
    studentName: string;
    coursesEnrolled: string;
  };
  selectedCourses: {
    id: string;
    title: string;
  }[];
  valid: boolean;
  errors: string[];
  warnings: string[];
};

export type StudentImportPreview = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  warningRows: number;
  /** Set by the server: no invalid rows and no unresolved duplicate warnings. */
  eligible: boolean;
  rows: ImportPreviewRow[];
};

export type StudentImportResult = {
  batchId: string;
  importedAt: string;
  studentCount: number;
  enrollmentCount: number;
  replayed: boolean;
  students: {
    rowNumber: number;
    id: string;
    admissionNumber: string;
    name: string;
    phone: string;
    courses: string[];
  }[];
};

/** The server re-validated the workbook and found it no longer eligible. */
export class StudentImportNotEligibleError extends Error {
  preview: StudentImportPreview;

  constructor(message: string, preview: StudentImportPreview) {
    super(message);
    this.preview = preview;
  }
}

export async function downloadStudentImportTemplate(): Promise<void> {
  const generation = getAdminSessionGeneration();

  const response = await fetch(`${API_URL}/api/students/import/template`, {
    credentials: "include",
    cache: "no-store",
  });

  if (!response.ok) {
    throw await parseApiError(response, true, generation);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = "learners-student-import-template.xlsx";
    document.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}

export async function previewStudentImportFile(
  file: File,
): Promise<StudentImportPreview> {
  const generation = getAdminSessionGeneration();
  const body = new FormData();
  body.append("file", file);

  const response = await fetch(`${API_URL}/api/students/import/preview`, {
    method: "POST",
    credentials: "include",
    body,
  });

  // Do not set Content-Type; the browser supplies the multipart boundary.
  if (!response.ok) {
    throw await parseApiError(response, true, generation);
  }

  const result = (await response.json()) as {
    success: true;
    data: StudentImportPreview;
  };

  return result.data;
}

/**
 * Permanently imports the workbook. The server re-validates the file;
 * reusing the same requestId on retry returns the original result
 * instead of importing twice.
 */
export async function confirmStudentImportFile(
  file: File,
  requestId: string,
): Promise<StudentImportResult> {
  const generation = getAdminSessionGeneration();
  const body = new FormData();
  body.append("requestId", requestId);
  body.append("file", file);

  let response: Response;

  try {
    response = await fetch(`${API_URL}/api/students/import/confirm`, {
      method: "POST",
      credentials: "include",
      body,
    });
  } catch {
    throw new Error(
      "The connection was lost before the server responded. Retrying is safe; students will not be imported twice.",
    );
  }

  if (!response.ok) {
    if (response.status === 409) {
      const result = (await response.clone().json().catch(() => null)) as {
        message?: string;
        data?: { preview?: StudentImportPreview };
      } | null;

      if (result?.data?.preview) {
        throw new StudentImportNotEligibleError(
          result.message || "Review the updated validation report.",
          result.data.preview,
        );
      }
    }

    throw await parseApiError(response, true, generation);
  }

  const result = (await response.json()) as {
    success: true;
    data: StudentImportResult;
  };

  return result.data;
}
