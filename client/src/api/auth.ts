export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "STAFF";

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

type ApiErrorResponse = {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

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

  const result = (await response.json()) as LoginResponse | ApiErrorResponse;

  if (!response.ok) {
    throw new Error(result.message || "Unable to sign in.");
  }

  if (!result.success) {
    throw new Error(result.message || "Unable to sign in.");
  }

  return result.data.user;
}

export async function logoutRequest() {
  await fetch(`${API_URL}/api/auth/logout`, { method: "POST", credentials: "include" });
}
