import { patchCaptureWithStatus } from "@/components/thermal-studio-v2/lib/save-status";
import type { ThermalV2DisplayTransform } from "@/components/thermal-studio-v2/types";

/** Autosave for the active image's rotate/flip display transform (S5.6, F1.2). */
export function saveDisplayTransform(captureId: string, transform: ThermalV2DisplayTransform): void {
  void patchCaptureWithStatus(captureId, { display_transform: transform });
}
