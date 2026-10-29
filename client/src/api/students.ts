import { API_URL } from "./config";
import { getAdminSessionGeneration } from "../admin/auth/sessionEvents";
import { parseApiError } from "./errors";
export type StudentStatus = "ACTIVE" | "INACTIVE" | "COMPLETED";

export type Student = {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string | null;
  phone: string;
  email: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  address: string | null;
  status: StudentStatus;
  createdAt: string;
  updatedAt: string;
};

export type CreateStudentInput = {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
};

export type UpdateStudentInput = {
  firstName: string;
  lastName?: string;
  phone: string;
  email?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  status: StudentStatus;
};

type StudentsResponse = {
  success: true;
  data: {
    students: Student[];
  };
};

type StudentResponse = {
  success: true;
  message: string;
  data: {
    student: Student;
  };
};

type DeleteStudentResponse = {
  success: true;
  message: string;
};





export async function fetchStudents(): Promise<Student[]> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(`${API_URL}/api/students`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }

  const result = (await response.json()) as StudentsResponse;

  return result.data.students;
}

export async function createStudent(
  input: CreateStudentInput,
): Promise<Student> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(`${API_URL}/api/students`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }

  const result = (await response.json()) as StudentResponse;

  return result.data.student;
}

export async function updateStudent(
  studentId: string,
  input: UpdateStudentInput,
): Promise<Student> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(`${API_URL}/api/students/${studentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }

  const result = (await response.json()) as StudentResponse;

  return result.data.student;
}

export async function deleteStudent(studentId: string): Promise<void> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(`${API_URL}/api/students/${studentId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }

  (await response.json()) as DeleteStudentResponse;
}
