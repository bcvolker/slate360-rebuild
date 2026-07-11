import type { ThermalV2Capture } from "@/components/thermal-studio-v2/types";

export type CapturePin = {
  id: string;
  filename: string;
  previewUrl: string | null;
  lat: number;
  lon: number;
};

/** MAP-1 (doc D2): GPS already parses into `metadata.gps` (S5.5) — this just projects it to pins. */
export function capturesToPins(captures: ThermalV2Capture[]): CapturePin[] {
  return captures
    .map((c) => {
      const gps = ((c.metadata as Record<string, unknown> | null)?.gps ?? null) as Record<string, unknown> | null;
      const lat = gps?.lat != null ? Number(gps.lat) : NaN;
      const lon = (gps?.lon ?? gps?.lng) != null ? Number(gps?.lon ?? gps?.lng) : NaN;
      return { id: c.id, filename: c.filename, previewUrl: c.previewUrl ?? null, lat, lon };
    })
    .filter((p): p is CapturePin => Number.isFinite(p.lat) && Number.isFinite(p.lon));
}
