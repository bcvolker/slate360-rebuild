export type CaptureMeta = {
  projection: "2:1" | "unknown";
  flowState: "stabilized" | "not-in-source" | "unknown";
  horizonLeveled: boolean;
  gyroAvailable: boolean;
  reexportRequired: boolean;
  sourceWidth: number | null;
  sourceHeight: number | null;
  note: string;
};

export const REEXPORT_NOTE =
  "Insta360 gyro and FlowState are not present on the stitched MP4 ingest source. Re-export from Insta360 Studio with Horizon Lock and FlowState, then replace the master.";

export function parseCaptureMeta(raw: unknown): CaptureMeta {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const w = typeof o.sourceWidth === "number" ? o.sourceWidth : null;
  const h = typeof o.sourceHeight === "number" ? o.sourceHeight : null;
  const ratio = w && h ? w / h : 0;
  const projection: CaptureMeta["projection"] =
    o.projection === "2:1" || (ratio >= 1.9 && ratio <= 2.1) ? "2:1" : "unknown";
  const gyroAvailable = o.gyroAvailable === true;
  const horizonLeveled = o.horizonLeveled === true;
  const flowState: CaptureMeta["flowState"] =
    o.flowState === "stabilized" ? "stabilized" : gyroAvailable ? "unknown" : "not-in-source";
  const reexportRequired = o.reexportRequired === true || !horizonLeveled || !gyroAvailable;
  return {
    projection,
    flowState,
    horizonLeveled,
    gyroAvailable,
    reexportRequired,
    sourceWidth: w,
    sourceHeight: h,
    note: typeof o.note === "string" && o.note.trim() ? o.note : REEXPORT_NOTE,
  };
}

export function captureMetaFromProbe(width: number, height: number, tags: Record<string, unknown> = {}): CaptureMeta {
  const spherical = JSON.stringify(tags).toLowerCase();
  const gyroAvailable = spherical.includes("gyro") || spherical.includes("camm") || spherical.includes("insta360");
  const ratio = height > 0 ? width / height : 0;
  return parseCaptureMeta({
    projection: ratio >= 1.9 && ratio <= 2.1 ? "2:1" : "unknown",
    sourceWidth: width,
    sourceHeight: height,
    gyroAvailable,
    horizonLeveled: false,
    flowState: gyroAvailable ? "unknown" : "not-in-source",
    reexportRequired: true,
  });
}

export function captureMetaLabel(meta: CaptureMeta): string {
  const bits = [
    `Projection ${meta.projection}`,
    meta.flowState === "stabilized" ? "FlowState on" : "FlowState not in source",
    meta.horizonLeveled ? "Horizon leveled" : "Horizon not leveled",
  ];
  if (meta.reexportRequired) bits.push("Re-export required");
  return bits.join(" · ");
}
