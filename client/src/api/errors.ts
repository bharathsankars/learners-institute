/**
 * Read an API error message while preserving the existing
 * fallback behavior for malformed or non-JSON responses.
 */
export async function parseApiError(response: Response): Promise<Error> {
  try {
    const result = (await response.json()) as {
      message?: string;
    };

    return new Error(result.message || "Something went wrong.");
  } catch {
    return new Error("Something went wrong.");
  }
}
