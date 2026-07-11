import type { ThermalV2Spot } from "@/components/thermal-studio-v2/types";
import { patchCaptureWithStatus } from "@/components/thermal-studio-v2/lib/save-status";

/** Autosave for measurements — same PATCH contract the old UI uses, now with visible save state (R1). */
export function saveSpots(captureId: string, spots: ThermalV2Spot[]): void {
  void patchCaptureWithStatus(captureId, { spots });
}
