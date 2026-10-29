import type { Course } from "./courses";
import { API_URL } from "./config";
import { getAdminSessionGeneration } from "../admin/auth/sessionEvents";
import { parseApiError } from "./errors";

import type { Student } from "./students";

export type EnrollmentStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export type FeePlanStatus = "ACTIVE" | "CANCELLED";

export type FeeEnrollment = {
  id: string;
  studentId: string;
  courseId: string;
  status: EnrollmentStatus;
  enrolledAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;

  student: Student;
  course: Course;
};

export type FeePlan = {
  payments: { amountPaise: number }[];
  id: string;
  enrollmentId: string;

  totalFeePaise: number;
  discountPaise: number;

  dueDate: string | null;

  status: FeePlanStatus;

  notes: string | null;

  createdAt: string;
  updatedAt: string;

  enrollment: FeeEnrollment;
};

export type CreateFeePlanInput = {
  studentId: string;
  courseId: string;

  totalFeePaise: number;
  discountPaise: number;

  dueDate?: string;
  notes?: string;
};

export type UpdateFeePlanInput = {
  totalFeePaise: number;
  discountPaise: number;

  dueDate?: string | null;
  notes?: string | null;

  status: FeePlanStatus;
};

type FeePlansResponse = {
  success: true;
  data: {
    feePlans: FeePlan[];
  };
};

type FeePlanResponse = {
  success: true;
  message?: string;
  data: {
    feePlan: FeePlan;
  };
};

export async function fetchFeePlans(): Promise<FeePlan[]> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(`${API_URL}/api/fees`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }

  const result = (await response.json()) as FeePlansResponse;

  return result.data.feePlans;
}

export async function fetchFeePlanById(feePlanId: string): Promise<FeePlan> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(`${API_URL}/api/fees/${feePlanId}`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }

  const result = (await response.json()) as FeePlanResponse;

  return result.data.feePlan;
}

export async function createFeePlan(
  input: CreateFeePlanInput,
): Promise<FeePlan> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(`${API_URL}/api/fees`, {
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

  const result = (await response.json()) as FeePlanResponse;

  return result.data.feePlan;
}

export async function updateFeePlan(
  feePlanId: string,
  input: UpdateFeePlanInput,
): Promise<FeePlan> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(`${API_URL}/api/fees/${feePlanId}`, {
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

  const result = (await response.json()) as FeePlanResponse;

  return result.data.feePlan;
}

export async function cancelFeePlan(feePlanId: string): Promise<FeePlan> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(`${API_URL}/api/fees/${feePlanId}/cancel`, {
    method: "PATCH",
    credentials: "include",
  });

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }

  const result = (await response.json()) as FeePlanResponse;

  return result.data.feePlan;
}

export function paiseToRupees(paise: number): number {
  return paise / 100;
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function formatIndianRupees(paise: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(paiseToRupees(paise));
}

export function paidAmount(plan: FeePlan): number {
  return plan.payments.reduce((sum, payment) => sum + payment.amountPaise, 0);
}
export function outstandingBalance(plan: FeePlan): number {
  return Math.max(0, plan.totalFeePaise - plan.discountPaise - paidAmount(plan));
}
