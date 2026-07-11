import { patchCaptureWithStatus } from "@/components/thermal-studio-v2/lib/save-status";
import type { ThermalV2Tuning } from "@/components/thermal-studio-v2/types";

export type BatchSettingsResult = { ok: number; failed: number };

/**
 * W1 "Paste settings" batch path — palette + tuning are the only two fields
 * of a settings clip that persist per OTHER capture (span/isotherm are
 * display-only and not saved per-capture today); applies both in one PATCH
 * per capture so it's a single round trip, not two.
 */
export async function applySettingsBatch(
  captureIds: string[],
  settings: { palette: string; tuning: ThermalV2Tuning },
): Promise<BatchSettingsResult> {
  const results = await Promise.all(captureIds.map((id) => patchCaptureWithStatus(id, settings)));
  const ok = results.filter(Boolean).length;
  return { ok, failed: results.length - ok };
}
