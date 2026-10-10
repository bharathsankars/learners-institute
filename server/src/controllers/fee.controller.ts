import type { Request, Response } from "express";
import { PaymentError } from "../services/payment.service.js";
import { ZodError } from "zod";

import {
  cancelFeePlan,
  createFeePlan,
  getFeePlanById,
  getFeePlans,
  updateFeePlan,
} from "../services/fee.service.js";

import {
  createFeePlanSchema,
  feePlanIdSchema,
  updateFeePlanSchema,
} from "../validators/fee.validator.js";

function isPrismaError(
  error: unknown,
  code: string,
): error is { code: string; meta?: unknown } {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === code
  );
}

function sendValidationError(error: ZodError, res: Response): void {
  res.status(400).json({
    success: false,
    message: "Invalid fee data.",
    errors: error.flatten().fieldErrors,
  });
}

export async function createFeePlanController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const input = createFeePlanSchema.parse(req.body);

    const feePlan = await createFeePlan(input);

    res.status(201).json({
      success: true,
      message: "Fee plan created successfully.",
      data: {
        feePlan,
      },
    });
  } catch (error) {
    if (error instanceof PaymentError) {
      res.status(error.status).json({ success: false, message: error.message }); return;
    }
    if (error instanceof ZodError) {
      sendValidationError(error, res);

      return;
    }

    if (isPrismaError(error, "P2003")) {
      res.status(400).json({
        success: false,
        message: "The selected student or course does not exist.",
      });

      return;
    }

    if (isPrismaError(error, "P2002")) {
      res.status(409).json({
        success: false,
        message: "A fee plan already exists for this enrollment.",
      });

      return;
    }

    console.error("Failed to create fee plan:", error);

    res.status(500).json({
      success: false,
      message: "Unable to create fee plan.",
    });
  }
}

export async function getFeePlansController(
  _req: Request,
  res: Response,
): Promise<void> {
  try {
    const feePlans = await getFeePlans();

    res.status(200).json({
      success: true,
      data: {
        feePlans,
      },
    });
  } catch (error) {
    if (error instanceof PaymentError) {
      res.status(error.status).json({ success: false, message: error.message }); return;
    }
    console.error("Failed to retrieve fee plans:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve fee plans.",
    });
  }
}

export async function getFeePlanByIdController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const feePlanId = feePlanIdSchema.parse(req.params.id);

    const feePlan = await getFeePlanById(feePlanId);

    if (!feePlan) {
      res.status(404).json({
        success: false,
        message: "Fee plan not found.",
      });

      return;
    }

    res.status(200).json({
      success: true,
      data: {
        feePlan,
      },
    });
  } catch (error) {
    if (error instanceof PaymentError) {
      res.status(error.status).json({ success: false, message: error.message }); return;
    }
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Invalid fee plan ID.",
      });

      return;
    }

    console.error("Failed to retrieve fee plan:", error);

    res.status(500).json({
      success: false,
      message: "Unable to retrieve fee plan.",
    });
  }
}

export async function updateFeePlanController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const feePlanId = feePlanIdSchema.parse(req.params.id);

    const input = updateFeePlanSchema.parse(req.body);

    const feePlan = await updateFeePlan(feePlanId, input);

    res.status(200).json({
      success: true,
      message: "Fee plan updated successfully.",
      data: {
        feePlan,
      },
    });
  } catch (error) {
    if (error instanceof PaymentError) {
      res.status(error.status).json({ success: false, message: error.message }); return;
    }
    if (error instanceof ZodError) {
      sendValidationError(error, res);

      return;
    }

    if (isPrismaError(error, "P2025")) {
      res.status(404).json({
        success: false,
        message: "Fee plan not found.",
      });

      return;
    }

    console.error("Failed to update fee plan:", error);

    res.status(500).json({
      success: false,
      message: "Unable to update fee plan.",
    });
  }
}

export async function cancelFeePlanController(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const feePlanId = feePlanIdSchema.parse(req.params.id);

    const feePlan = await cancelFeePlan(feePlanId);

    res.status(200).json({
      success: true,
      message: "Fee plan cancelled successfully.",
      data: {
        feePlan,
      },
    });
  } catch (error) {
    if (error instanceof PaymentError) {
      res.status(error.status).json({ success: false, message: error.message }); return;
    }
    if (error instanceof ZodError) {
      res.status(400).json({
        success: false,
        message: "Invalid fee plan ID.",
      });

      return;
    }

    if (isPrismaError(error, "P2025")) {
      res.status(404).json({
        success: false,
        message: "Fee plan not found.",
      });

      return;
    }

    console.error("Failed to cancel fee plan:", error);

    res.status(500).json({
      success: false,
      message: "Unable to cancel fee plan.",
    });
  }
}
