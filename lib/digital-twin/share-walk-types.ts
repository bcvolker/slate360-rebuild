import type { FloorInfo, WalkStation } from "@/lib/digital-twin/walkthrough-navigation";

/** `<model>.walk.json` sidecar: capture stations + floors in viewer metres. */
export type TwinWalkSidecar = {
  version?: number;
  source?: string;
  stations: WalkStation[];
  floors: FloorInfo[];
  ceilingCutY?: number | null;
  cameraCount?: number;
};

/** Validate an untrusted JSON blob into a TwinWalkSidecar, or null. */
export function parseTwinWalkSidecar(raw: unknown): TwinWalkSidecar | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const stations = Array.isArray(obj.stations)
    ? (obj.stations as unknown[]).filter(
        (s): s is WalkStation =>
          typeof s === "object" &&
          s !== null &&
          typeof (s as WalkStation).id === "string" &&
          Array.isArray((s as WalkStation).position) &&
          (s as WalkStation).position.length === 3 &&
          (s as WalkStation).position.every((v) => Number.isFinite(v)) &&
          Number.isInteger((s as WalkStation).floorIndex),
      )
    : [];
  if (stations.length === 0) return null;
  const floors = Array.isArray(obj.floors)
    ? (obj.floors as unknown[]).filter(
        (f): f is FloorInfo =>
          typeof f === "object" &&
          f !== null &&
          Number.isInteger((f as FloorInfo).index) &&
          typeof (f as FloorInfo).label === "string" &&
          Number.isFinite((f as FloorInfo).elevationY),
      )
    : [];
  const ceiling = obj.ceilingCutY;
  return {
    version: typeof obj.version === "number" ? obj.version : undefined,
    source: typeof obj.source === "string" ? obj.source : undefined,
    stations,
    floors,
    ceilingCutY: typeof ceiling === "number" && Number.isFinite(ceiling) ? ceiling : null,
    cameraCount: typeof obj.cameraCount === "number" ? obj.cameraCount : undefined,
  };
}
