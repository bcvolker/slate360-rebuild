import type { CaptureClassification } from "@/lib/types/site-walk-capture";

export function mapSuggestedClassification(value: string | undefined): CaptureClassification | undefined {
  if (!value) return undefined;
  const normalized = value.toLowerCase();
  if (normalized === "safety") return "Safety";
  if (normalized === "progress") return "Progress";
  if (normalized === "issue") return "Punch List";
  if (normalized === "question") return "RFI";
  if (normalized === "observation") return "Observation";
  if (normalized === "quality") return "Quality";
  if (normalized === "schedule") return "Schedule";
  return "Other";
}
