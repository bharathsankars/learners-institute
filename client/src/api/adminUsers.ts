import { API_URL } from "./config";
import { getAdminSessionGeneration } from "../admin/auth/sessionEvents";
import { parseApiError } from "./errors";

export type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  role: "SUPER_ADMIN" | "ADMIN" | "STAFF";
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateAdminUserInput = {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  password: string;
  role: "ADMIN" | "STAFF";
};

export type UpdateAdminUserInput = {
  firstName?: string;
  lastName?: string;
  username?: string;
  email?: string;
  password?: string;
  role?: "ADMIN" | "STAFF";
  isActive?: boolean;
};

type AdminUsersResponse = {
  success: true;
  data: {
    users: AdminUser[];
  };
};

type AdminUserResponse = {
  success: true;
  message: string;
  data: {
    user: AdminUser;
  };
};




export async function fetchAdminUsers():
Promise<AdminUser[]> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(
    `${API_URL}/api/admin-users`,
    {
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }

  const result =
    (await response.json()) as AdminUsersResponse;

  return result.data.users;
}

export async function createAdminUser(
  input: CreateAdminUserInput,
): Promise<AdminUser> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(
    `${API_URL}/api/admin-users`,
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",
      },

      credentials: "include",

      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }

  const result =
    (await response.json()) as AdminUserResponse;

  return result.data.user;
}

export async function updateAdminUser(
  id: string,
  input: UpdateAdminUserInput,
): Promise<AdminUser> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(
    `${API_URL}/api/admin-users/${id}`,
    {
      method: "PATCH",

      headers: {
        "Content-Type":
          "application/json",
      },

      credentials: "include",

      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }

  const result =
    (await response.json()) as AdminUserResponse;

  return result.data.user;
}

export async function deleteAdminUser(
  id: string,
): Promise<void> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(
    `${API_URL}/api/admin-users/${id}`,
    {
      method: "DELETE",

      credentials: "include",
    },
  );

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }
}


export async function changeOwnPassword(
  input: {
    currentPassword: string;
    newPassword: string;
  },
): Promise<void> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(
    `${API_URL}/api/admin-users/me/password`,
    {
      method: "PATCH",

      headers: {
        "Content-Type":
          "application/json",
      },

      credentials: "include",

      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }
}
