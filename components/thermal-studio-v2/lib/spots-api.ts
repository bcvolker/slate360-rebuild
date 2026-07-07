import type { ThermalV2Spot } from "@/components/thermal-studio-v2/types";

/** Autosave for measurements — same PATCH contract the old UI uses, unchanged. */
export function saveSpots(captureId: string, spots: ThermalV2Spot[]): void {
  fetch(`/api/ops/thermal/captures/${captureId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spots }),
  }).catch(() => {});
}
