import type { ThermalV2Tuning } from "@/components/thermal-studio-v2/types";

/** Autosave for the active image's tuning — same PATCH contract the old UI uses. */
export function saveTuning(captureId: string, tuning: ThermalV2Tuning): void {
  fetch(`/api/ops/thermal/captures/${captureId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tuning }),
  }).catch(() => {});
}

export type BatchTuneResult = { ok: number; failed: number };

/** Scope-aware batch apply (doc §0.1 Keep/Undo, §1b.1 single/selected/batch). Metadata-only — cheap, no grid recompute server-side. */
export async function applyTuningBatch(captureIds: string[], tuning: ThermalV2Tuning): Promise<BatchTuneResult> {
  const results = await Promise.all(
    captureIds.map((id) =>
      fetch(`/api/ops/thermal/captures/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tuning }),
      })
        .then((res) => res.ok)
        .catch(() => false),
    ),
  );
  const ok = results.filter(Boolean).length;
  return { ok, failed: results.length - ok };
}
