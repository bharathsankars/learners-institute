import { API_URL } from "./config.ts";
export type AdminRole =
  | "SUPER_ADMIN"
  | "RECOVERY_ADMIN"
  | "ADMIN"
  | "STAFF";

export type AuthUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: AdminRole;
};

type LoginResponse = {
  success: true;
  message: string;
  data: {
    user: AuthUser;
  };
};

type CurrentUserResponse = {
  success: true;
  data: {
    user: AuthUser;
  };
};

type ApiErrorResponse = {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
};


export async function loginRequest(
  username: string,
  password: string,
): Promise<AuthUser> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify({
      username,
      password,
    }),
  });

  const result = await response.json().catch(() => null) as
    | LoginResponse
    | ApiErrorResponse
    | null;

  if (!response.ok || !result?.success) {
    throw new Error(
      result && "message" in result
        ? result.message || "Unable to sign in."
        : "Unable to sign in.",
    );
  }

  if (!result.data?.user) {
    throw new Error("Invalid login response.");
  }

  return result.data.user;
}

export async function getCurrentUserRequest(): Promise<AuthUser | null> {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    method: "GET",
    credentials: "include",
  });

  if (response.status === 401) {
    return null;
  }

  const result = await response.json().catch(() => null) as
    | CurrentUserResponse
    | ApiErrorResponse
    | null;

  if (!response.ok || !result?.success) {
    throw new Error(
      result && "message" in result
        ? result.message || "Unable to restore session."
        : "Unable to restore session.",
    );
  }

  if (!result.data?.user) {
    throw new Error("Invalid session response.");
  }

  return result.data.user;
}

export async function logoutRequest(): Promise<void> {
  await fetch(`${API_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
}
