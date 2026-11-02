import { API_URL } from "./config";
import { getAdminSessionGeneration } from "../admin/auth/sessionEvents";
import { parseApiError } from "./errors";
import type { PublicInstitute } from "../data/contact";

export type InstituteSettings = {
  instituteName: string;
  phone: string;
  whatsapp: string;
  email: string;
  address: string;
  mapsUrl: string;
};

// Public: the contact details the website shows.
export async function fetchPublicInstitute(): Promise<PublicInstitute | null> {
  const response = await fetch(`${API_URL}/api/institute`);

  if (!response.ok) {
    throw await parseApiError(response);
  }

  const result = (await response.json()) as { data: { institute: PublicInstitute | null } };

  return result.data.institute;
}

export async function fetchInstituteSettings(): Promise<InstituteSettings> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(`${API_URL}/api/settings`, { credentials: "include" });

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }

  const result = (await response.json()) as {
    data: { settings: Record<keyof InstituteSettings, string | null> };
  };
  const settings = result.data.settings;

  return {
    instituteName: settings.instituteName ?? "",
    phone: settings.phone ?? "",
    whatsapp: settings.whatsapp ?? "",
    email: settings.email ?? "",
    address: settings.address ?? "",
    mapsUrl: settings.mapsUrl ?? "",
  };
}

export async function saveInstituteSettings(input: InstituteSettings): Promise<void> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(`${API_URL}/api/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }
}
