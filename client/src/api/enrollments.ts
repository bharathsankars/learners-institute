import { API_URL } from "./config";
import { getAdminSessionGeneration } from "../admin/auth/sessionEvents";
import { parseApiError } from "./errors";

export type StudentEnrollment = {
  id: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELLED";
  enrolledAt: string;
  completedAt: string | null;
  course: {
    id: string;
    title: string;
    slug: string;
    isActive: boolean;
  };
};

type EnrollmentListResponse = {
  success: true;
  data: { enrollments: StudentEnrollment[] };
};

type EnrollmentResponse = {
  success: true;
  data: { enrollment: StudentEnrollment };
};

export async function fetchStudentEnrollments(
  studentId: string,
): Promise<StudentEnrollment[]> {
  const generation = getAdminSessionGeneration();

  const response = await fetch(
    `${API_URL}/api/students/${encodeURIComponent(studentId)}/enrollments`,
    { credentials: "include" },
  );

  if (!response.ok) {
    throw await parseApiError(response, true, generation);
  }

  const result = (await response.json()) as EnrollmentListResponse;
  return result.data.enrollments;
}

export async function assignStudentCourse(
  studentId: string,
  courseId: string,
): Promise<StudentEnrollment> {
  const generation = getAdminSessionGeneration();

  const response = await fetch(
    `${API_URL}/api/students/${encodeURIComponent(studentId)}/enrollments`,
    {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseId }),
    },
  );

  if (!response.ok) {
    throw await parseApiError(response, true, generation);
  }

  const result = (await response.json()) as EnrollmentResponse;
  return result.data.enrollment;
}
