import { notifyAdminSessionExpired } from "../admin/auth/sessionEvents";

/**
 * Read an API error message while preserving the existing
 * fallback behavior for malformed or non-JSON responses.
 */
export async function parseApiError(
  response: Response,
  protectedRequest = false,
  requestGeneration?: number,
): Promise<Error> {
  if (protectedRequest && response.status === 401) {
    if (requestGeneration === undefined) {
      throw new Error("Protected requests must provide their session generation.");
    }
    notifyAdminSessionExpired(requestGeneration);
  }

  try {
    const result = (await response.json()) as {
      message?: string;
    };

    return new Error(result.message || "Something went wrong.");
  } catch {
    return new Error("Something went wrong.");
  }
}
