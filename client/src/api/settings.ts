import { API_URL } from "./config";

export type InstituteSettings = {
  id: string | null;

  instituteName: string;

  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  mapsUrl: string | null;
};

export type InstituteSettingsForm = {
  instituteName: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  mapsUrl: string;
};

type SettingsResponse = {
  success: true;

  data: {
    settings: InstituteSettings;
  };
};

type ErrorResponse = {
  success: false;
  message: string;
};

async function getError(
  response: Response,
) {
  try {
    const result =
      (await response.json()) as ErrorResponse;

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

export async function fetchInstituteSettings():
Promise<InstituteSettings> {
  const response = await fetch(
    `${API_URL}/api/settings`,
    {
      credentials: "include",
    },
  );

  if (!response.ok) {
    throw await getError(response);
  }

  const result =
    (await response.json()) as SettingsResponse;

  return result.data.settings;
}

export async function saveInstituteSettingsRequest(
  input: InstituteSettingsForm,
): Promise<InstituteSettings> {
  const response = await fetch(
    `${API_URL}/api/settings`,
    {
      method: "PATCH",

      credentials: "include",

      headers: {
        "Content-Type":
          "application/json",
      },

      body: JSON.stringify(input),
    },
  );

  if (!response.ok) {
    throw await getError(response);
  }

  const result =
    (await response.json()) as SettingsResponse;

  return result.data.settings;
}
