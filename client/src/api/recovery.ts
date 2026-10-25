import {
  API_URL,
} from "./config";

export type RecoverySuperAdmin = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  isActive: boolean;
};

type ApiErrorResponse = {
  success: false;
  message: string;
};

async function apiError(
  response: Response,
): Promise<Error> {
  try {
    const result =
      (await response.json()) as ApiErrorResponse;

    return new Error(
      result.message ||
        "Something went wrong.",
    );
  } catch {
    return new Error(
      "Something went wrong.",
    );
  }
}

export async function recoveryLogin(
  username: string,
  password: string,
): Promise<void> {
  const response =
    await fetch(
      `${API_URL}/api/recovery/login`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        credentials:
          "include",

        body:
          JSON.stringify({
            username,
            password,
          }),
      },
    );

  if (!response.ok) {
    throw await apiError(
      response,
    );
  }
}

export async function fetchRecoverySuperAdmin():
Promise<RecoverySuperAdmin> {
  const response =
    await fetch(
      `${API_URL}/api/recovery/super-admin`,
      {
        credentials:
          "include",
      },
    );

  if (!response.ok) {
    throw await apiError(
      response,
    );
  }

  const result =
    (await response.json()) as {
      success: true;
      data: {
        user:
          RecoverySuperAdmin;
      };
    };

  return result.data.user;
}

export async function createTemporaryRecoveryPassword(
  temporaryPassword: string,
): Promise<Date> {
  const response =
    await fetch(
      `${API_URL}/api/recovery/temporary-password`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        credentials:
          "include",

        body:
          JSON.stringify({
            temporaryPassword,
          }),
      },
    );

  if (!response.ok) {
    throw await apiError(
      response,
    );
  }

  const result =
    (await response.json()) as {
      success: true;
      data: {
        expiresAt: string;
      };
    };

  return new Date(
    result.data.expiresAt,
  );
}

export async function verifyTemporaryRecoveryPassword(
  temporaryPassword: string,
): Promise<void> {
  const response =
    await fetch(
      `${API_URL}/api/recovery/verify-temporary-password`,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        credentials:
          "include",

        body:
          JSON.stringify({
            temporaryPassword,
          }),
      },
    );

  if (!response.ok) {
    throw await apiError(
      response,
    );
  }
}

export async function completeSuperAdminPasswordReset(
  temporaryPassword: string,
  newPassword: string,
): Promise<void> {
  const response =
    await fetch(
      `${API_URL}/api/recovery/complete-password-reset`,
      {
        method: "PATCH",

        headers: {
          "Content-Type":
            "application/json",
        },

        credentials:
          "include",

        body:
          JSON.stringify({
            temporaryPassword,
            newPassword,
          }),
      },
    );

  if (!response.ok) {
    throw await apiError(
      response,
    );
  }
}

export async function recoveryLogout():
Promise<void> {
  await fetch(
    `${API_URL}/api/auth/logout`,
    {
      method: "POST",
      credentials:
        "include",
    },
  );
}
