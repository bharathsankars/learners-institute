import type {
  Request,
  Response,
} from "express";

import { ZodError } from "zod";

import {
  getInstituteSettings,
  saveInstituteSettings,
} from "../services/settings.service.js";

import {
  updateInstituteSettingsSchema,
} from "../validators/settings.validator.js";

export async function getInstituteSettingsController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const settings =
      await getInstituteSettings();

    res.status(200).json({
      success: true,

      data: {
        settings:
          settings ?? {
            id: null,

            instituteName:
              "Learners Commercial Institute",

            phone: "",
            whatsapp: "",
            email: "",
            address: "",
            mapsUrl: "",
          },
      },
    });
  } catch (error) {
    console.error(
      "Failed to get institute settings:",
      error,
    );

    res.status(500).json({
      success: false,

      message:
        "Unable to retrieve institute settings.",
    });
  }
}

export async function updateInstituteSettingsController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const input =
      updateInstituteSettingsSchema.parse(
        req.body,
      );

    const settings =
      await saveInstituteSettings(
        input,
      );

    res.status(200).json({
      success: true,

      message:
        "Institute settings updated successfully.",

      data: {
        settings,
      },
    });
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,

        message:
          "Please check the settings form.",

        errors:
          error.flatten()
            .fieldErrors,
      });

      return;
    }

    console.error(
      "Failed to update institute settings:",
      error,
    );

    res.status(500).json({
      success: false,

      message:
        "Unable to update institute settings.",
    });
  }
}
