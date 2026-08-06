import {
  parseTwinOverlayPin,
  parseTwinOverlayMeasurement,
  type TwinOverlayPin,
  type TwinOverlayMeasurement,
} from "@/components/digital-twin/TwinSceneOverlays";

// A2: row shapes returned by GET /api/share/twin/[token]/{pin,measurement} —
// shared by TwinShareAnnotateShell (parses into overlays) and
// TwinShareActivitySheet (lists them as text).
export type TwinSharePinRow = { id: string; title: string; position?: unknown };
export type TwinShareMeasurementRow = {
  id: string;
  label: string | null;
  start_point: unknown;
  end_point: unknown;
  measured_value: number | null;
  unit: string | null;
};

/** A2: parse+filter raw share-API pin/measurement rows into scene-overlay shapes. */
export function buildShareOverlayPins(
  rows: { id: string; title: string; position?: unknown }[],
): TwinOverlayPin[] {
  return rows
    .map((p) => parseTwinOverlayPin({ id: p.id, title: p.title, position: p.position }))
    .filter((p): p is TwinOverlayPin => p !== null);
}

export function buildShareOverlayMeasurements(
  rows: {
    id: string;
    start_point: unknown;
    end_point: unknown;
    measured_value: number | null;
    unit: string | null;
  }[],
): TwinOverlayMeasurement[] {
  return rows
    .map((m) =>
      parseTwinOverlayMeasurement({
        id: m.id,
        start_point: m.start_point,
        end_point: m.end_point,
        measured_value: m.measured_value,
        unit: m.unit,
      }),
    )
    .filter((m): m is TwinOverlayMeasurement => m !== null);
}
