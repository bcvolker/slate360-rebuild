/** One project item, many locators. No duplicate item per viewer. */

export const LOCATOR_KINDS = ["plan", "walkthrough", "station", "twin", "geospatial"] as const;
export type LocatorKind = (typeof LOCATOR_KINDS)[number];

export type PlanLocator = { kind: "plan"; sheetId?: string | null; u: number; v: number };
export type WalkLocator = {
  kind: "walkthrough";
  walkthroughId: string;
  clipId?: string | null;
  tSeconds: number;
  yawDeg: number;
  pitchDeg: number;
  pathAnchor?: string | null;
};
export type StationLocator = { kind: "station"; stationId: string; yawDeg: number; pitchDeg: number };
export type TwinLocator = {
  kind: "twin";
  modelId: string;
  xyz: [number, number, number];
  yawDeg?: number | null;
  pitchDeg?: number | null;
};
export type GeoLocator = { kind: "geospatial"; lat: number; lon: number; alt?: number | null };

export type SpatialLocator = PlanLocator | WalkLocator | StationLocator | TwinLocator | GeoLocator;

export function parseLocatorKind(value: unknown): LocatorKind | null {
  return LOCATOR_KINDS.includes(value as LocatorKind) ? (value as LocatorKind) : null;
}

export function guestMayUseLocator(locator: SpatialLocator, twinLive: boolean): boolean {
  if (locator.kind === "twin") return twinLive;
  return true;
}
