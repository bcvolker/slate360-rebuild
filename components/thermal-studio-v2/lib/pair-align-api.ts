import { patchCaptureWithStatus } from "@/components/thermal-studio-v2/lib/save-status";
import type { ThermalV2PairAlign } from "@/components/thermal-studio-v2/types";

/** Autosave for the active image's fusion-blend alignment nudge (S6.5). */
export function savePairAlign(captureId: string, align: ThermalV2PairAlign): void {
  void patchCaptureWithStatus(captureId, { pair_align: align });
}
