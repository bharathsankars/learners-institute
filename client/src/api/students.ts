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

type ApiErrorResponse = {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

async function parseApiError(response: Response): Promise<Error> {
  try {
    const error = (await response.json()) as ApiErrorResponse;

    return new Error(error.message || "Something went wrong.");
  } catch {
    return new Error("Something went wrong.");
  }
}

export async function fetchStudents(): Promise<Student[]> {
  const response = await fetch(`${API_URL}/api/students`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  const result = (await response.json()) as StudentsResponse;

  return result.data.students;
}

export async function createStudent(
  input: CreateStudentInput,
): Promise<Student> {
  const response = await fetch(`${API_URL}/api/students`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  const result = (await response.json()) as StudentResponse;

  return result.data.student;
}

export async function updateStudent(
  studentId: string,
  input: UpdateStudentInput,
): Promise<Student> {
  const response = await fetch(`${API_URL}/api/students/${studentId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  const result = (await response.json()) as StudentResponse;

  return result.data.student;
}

export async function deleteStudent(studentId: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/students/${studentId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  (await response.json()) as DeleteStudentResponse;
}
