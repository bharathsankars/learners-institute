import type { Request, Response } from "express";
import { z } from "zod";

import { getActivity, logActivity } from "../services/activity.service.js";
import { buildExport, EXPORT_DATASETS } from "../services/export.service.js";
import { getInstituteSettings } from "../services/settings.service.js";

// Public contact details for the website. Only the fields the site shows.
export async function getPublicInstituteController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const settings = await getInstituteSettings();

    res.set("Cache-Control", "public, max-age=300");
    res.status(200).json({
      success: true,
      data: {
        institute: settings && {
          instituteName: settings.instituteName,
          phone: settings.phone,
          whatsapp: settings.whatsapp,
          email: settings.email,
          address: settings.address,
          mapsUrl: settings.mapsUrl,
        },
      },
    });
  } catch (error) {
    console.error("Failed to get public institute details:", error);
    res.status(500).json({ success: false, message: "Unable to load institute details." });
  }
}

const activityQuerySchema = z.object({
  entityType: z.enum(["student", "enquiry", "course", "batch", "fee", "payment", "user", "settings"]).optional(),
  before: z.coerce.date().optional(),
});

export async function getActivityController(
  req: Request,
  res: Response,
): Promise<void> {
  const query = activityQuerySchema.safeParse(req.query);

  if (!query.success) {
    res.status(400).json({ success: false, message: "Invalid activity filter." });
    return;
  }

  try {
    res.status(200).json({ success: true, data: await getActivity(query.data) });
  } catch (error) {
    console.error("Failed to get activity:", error);
    res.status(500).json({ success: false, message: "Unable to load activity." });
  }
}

export async function getExportController(
  req: Request,
  res: Response,
): Promise<void> {
  const dataset = z.enum(EXPORT_DATASETS).safeParse(req.params.dataset);

  if (!dataset.success) {
    res.status(404).json({ success: false, message: "Unknown export." });
    return;
  }

  try {
    const file = await buildExport(dataset.data);

    await logActivity(res, () => ({
      action: "data.exported",
      entityType: "settings",
      summary: `Downloaded the ${dataset.data} export (${file.rowCount} rows)`,
    }));

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${file.filename}"`);
    res.setHeader("Cache-Control", "no-store");
    res.status(200).send(file.buffer);
  } catch (error) {
    console.error("Failed to build export:", error);
    res.status(500).json({ success: false, message: "Unable to create the export." });
  }
}
