import { API_URL } from "./config";
import { getAdminSessionGeneration } from "../admin/auth/sessionEvents";
import { parseApiError } from "./errors";

export type ActivityEntityType = "student" | "enquiry" | "course" | "batch" | "fee" | "payment" | "user" | "settings";

export type ActivityEntry = {
  id: string;
  action: string;
  entityType: ActivityEntityType;
  entityId: string | null;
  summary: string;
  createdAt: string;
  actor: { id: string; firstName: string; lastName: string } | null;
};

export type ActivityPage = { entries: ActivityEntry[]; hasMore: boolean };

export async function fetchActivity(options: { entityType?: ActivityEntityType | ""; before?: string }): Promise<ActivityPage> {
  const params = new URLSearchParams();

  if (options.entityType) params.set("entityType", options.entityType);
  if (options.before) params.set("before", options.before);

  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(`${API_URL}/api/activity?${params}`, { credentials: "include" });

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }

  const result = (await response.json()) as { data: ActivityPage };

  return result.data;
}

export type ExportDataset = "students" | "enquiries" | "batches" | "fees" | "payments";

// Downloads the workbook through the browser's normal save flow.
export async function downloadExport(dataset: ExportDataset): Promise<void> {
  const requestGeneration = getAdminSessionGeneration();
  const response = await fetch(`${API_URL}/api/exports/${dataset}`, { credentials: "include" });

  if (!response.ok) {
    throw await parseApiError(response, true, requestGeneration);
  }

  const filename =
    /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ??
    `learners-${dataset}.xlsx`;
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
