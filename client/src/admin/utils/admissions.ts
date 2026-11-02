import type { AdmissionSource } from "../../api/students";

export type FeeDraft = { total: string; discount: string; dueDate: string };

export type PlacementValue = {
  courseIds: string[];
  batchId: string;
  fees: Record<string, FeeDraft>;
};

export const emptyPlacement: PlacementValue = { courseIds: [], batchId: "", fees: {} };

// Turns the form's rupee strings into the API's paise amounts; returns an
// error message instead when something is incomplete.
export function placementToInput(
  value: PlacementValue,
  canSetFees: boolean,
):
  | { error: string }
  | { courseIds: string[]; batchId: string | null; fees: { courseId: string; totalFeePaise: number; discountPaise: number; dueDate?: string }[] } {
  if (!value.courseIds.length) {
    return { error: "Choose at least one course." };
  }

  const fees = [];

  for (const courseId of value.courseIds) {
    const draft = value.fees[courseId];

    if (!canSetFees || !draft || !draft.total.trim()) {
      continue;
    }

    const total = Number(draft.total);
    const discount = Number(draft.discount || 0);

    if (!Number.isFinite(total) || total <= 0) {
      return { error: "Enter a total fee greater than zero, or leave it empty." };
    }

    if (!Number.isFinite(discount) || discount < 0 || discount > total) {
      return { error: "The discount must be between zero and the total fee." };
    }

    fees.push({
      courseId,
      totalFeePaise: Math.round(total * 100),
      discountPaise: Math.round(discount * 100),
      ...(draft.dueDate && { dueDate: draft.dueDate }),
    });
  }

  return { courseIds: value.courseIds, batchId: value.batchId || null, fees };
}


export const admissionSourceLabels: Record<AdmissionSource, string> = {
  WALK_IN: "Walk-in",
  ENQUIRY: "Website enquiry",
  IMPORT: "Excel import",
};

