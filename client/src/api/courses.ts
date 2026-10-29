import { API_URL } from "./config";
import { getAdminSessionGeneration } from "../admin/auth/sessionEvents";
import { parseApiError } from "./errors";
export type Course = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  category: string | null;
  skills: string[];
  isActive: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type CreateCourseInput = {
  title: string;
  slug: string;
  shortDescription?: string;
  description?: string;
  category?: string;
  skills: string[];
  isActive: boolean;
  displayOrder: number;
};

export type UpdateCourseInput = CreateCourseInput;

type CoursesResponse = {
  success: true;
  data: {
    courses: Course[];
  };
};

type CourseResponse = {
  success: true;
  message?: string;
  data: {
    course: Course;
  };
};

type DeleteCourseResponse = {
  success: true;
  message: string;
};





export async function fetchCourses(): Promise<Course[]> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(`${API_URL}/api/courses`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }

  const result = (await response.json()) as CoursesResponse;

  return result.data.courses;
}

export async function fetchPublicCourses(): Promise<Course[]> {
  const response = await fetch(`${API_URL}/api/courses/public`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw await parseApiError(response);
  }

  const result = (await response.json()) as CoursesResponse;

  return result.data.courses;
}

export async function fetchCourseById(courseId: string): Promise<Course> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(`${API_URL}/api/courses/${courseId}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }

  const result = (await response.json()) as CourseResponse;

  return result.data.course;
}

export async function createCourse(input: CreateCourseInput): Promise<Course> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(`${API_URL}/api/courses`, {
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

  const result = (await response.json()) as CourseResponse;

  return result.data.course;
}

export async function updateCourse(
  courseId: string,
  input: UpdateCourseInput,
): Promise<Course> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(`${API_URL}/api/courses/${courseId}`, {
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

  const result = (await response.json()) as CourseResponse;

  return result.data.course;
}

export async function deleteCourse(courseId: string): Promise<void> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(`${API_URL}/api/courses/${courseId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }

  (await response.json()) as DeleteCourseResponse;
}
