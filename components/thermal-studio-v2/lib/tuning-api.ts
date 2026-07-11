import type { ThermalV2Tuning } from "@/components/thermal-studio-v2/types";
import { patchCaptureWithStatus } from "@/components/thermal-studio-v2/lib/save-status";

/** Autosave for the active image's tuning — same PATCH contract the old UI uses, now with visible save state (R1). */
export function saveTuning(captureId: string, tuning: ThermalV2Tuning): void {
  void patchCaptureWithStatus(captureId, { tuning });
}

export type BatchTuneResult = { ok: number; failed: number };

/** Scope-aware batch apply (doc §0.1 Keep/Undo, §1b.1 single/selected/batch). Metadata-only — cheap, no grid recompute server-side. */
export async function applyTuningBatch(captureIds: string[], tuning: ThermalV2Tuning): Promise<BatchTuneResult> {
  const results = await Promise.all(captureIds.map((id) => patchCaptureWithStatus(id, { tuning })));
  const ok = results.filter(Boolean).length;
  return { ok, failed: results.length - ok };
}
