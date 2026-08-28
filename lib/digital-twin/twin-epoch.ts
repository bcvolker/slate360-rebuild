import type { AssetPose, AssetRegistration, Vec3 } from "./s360-world";
import { defaultRegistration, identitySim3 } from "./s360-world";

export type TwinLayerRepresentation = "reality" | "hybrid" | "geometry";

/** Existing walkthrough layer ids — keep MeshTwinViewer wiring stable. */
export type TwinLayerMode = "mesh" | "splat" | "both";

export function representationFromLayer(mode: TwinLayerMode): TwinLayerRepresentation {
  if (mode === "splat") return "reality";
  if (mode === "both") return "hybrid";
  return "geometry";
}

export function layerFromRepresentation(mode: TwinLayerRepresentation): TwinLayerMode {
  if (mode === "reality") return "splat";
  if (mode === "hybrid") return "both";
  return "mesh";
}

export function meshDisplayFor(mode: TwinLayerRepresentation): "shown" | "collision" {
  return mode === "reality" ? "collision" : "shown";
}

export function splatVisibleFor(mode: TwinLayerRepresentation): boolean {
  return mode !== "geometry";
}

export type TwinEpochAsset = {
  url: string;
  pose: AssetPose;
};

export type TwinEpoch = {
  id: string;
  label: string;
  capturedAt: string;
  isCurrent: boolean;
  gaussian: TwinEpochAsset | null;
  metricMesh: TwinEpochAsset | null;
  lidarCloud: TwinEpochAsset | null;
  registration: AssetRegistration;
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatEpochLabel(iso: string, isCurrent = false): string {
  if (isCurrent) return "Current";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function sortEpochsNewestFirst(epochs: readonly TwinEpoch[]): TwinEpoch[] {
  return [...epochs].sort((a, b) => {
    if (a.isCurrent !== b.isCurrent) return a.isCurrent ? -1 : 1;
    return new Date(b.capturedAt).getTime() - new Date(a.capturedAt).getTime();
  });
}

export function selectEpoch(epochs: readonly TwinEpoch[], id: string): TwinEpoch | null {
  return epochs.find((e) => e.id === id) ?? null;
}

/**
 * Switching dates keeps the user's S360_WORLD camera. Only representation
 * URLs/transforms change. Compare-mode fields are reserved, not implemented.
 */
export type EpochSwap = {
  previousId: string;
  nextId: string;
  preserveCamera: true;
  compareReady: boolean;
};

export function planEpochSwap(
  currentId: string,
  nextId: string,
  epochs: readonly TwinEpoch[],
): EpochSwap | null {
  if (!selectEpoch(epochs, nextId)) return null;
  return {
    previousId: currentId,
    nextId,
    preserveCamera: true,
    compareReady: epochs.length >= 2,
  };
}

export function pinRetainsWorldAnchor(
  pinPosition: Vec3,
  _fromMode: TwinLayerRepresentation,
  _toMode: TwinLayerRepresentation,
): Vec3 {
  return pinPosition;
}

export function identityMeshEpoch(args: {
  id: string;
  capturedAt: string;
  meshUrl: string;
  splatUrl?: string | null;
  isCurrent?: boolean;
}): TwinEpoch {
  const pose: AssetPose = { sourceFrame: "TSDF_MESH", toWorld: identitySim3() };
  const splatPose: AssetPose = {
    sourceFrame: "SPARK_SPLAT_POST_PI_FLIP",
    toWorld: identitySim3(),
  };
  return {
    id: args.id,
    label: formatEpochLabel(args.capturedAt, args.isCurrent ?? false),
    capturedAt: args.capturedAt,
    isCurrent: args.isCurrent ?? false,
    gaussian: args.splatUrl ? { url: args.splatUrl, pose: splatPose } : null,
    metricMesh: { url: args.meshUrl, pose },
    lidarCloud: null,
    registration: defaultRegistration("TSDF_MESH", "unvalidated"),
  };
}
