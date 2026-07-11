import { patchCaptureWithStatus } from "@/components/thermal-studio-v2/lib/save-status";

/** Autosave for the operator's findings note — same PATCH contract the old UI uses, now with visible save state (R1). */
export function saveFindings(captureId: string, findings: string): void {
  void patchCaptureWithStatus(captureId, { findings });
}
