import "server-only";

import type { LidarDerivativeKeys } from "./lidar-contract";
import { isSafeLidarRelativePath, lidarDerivativeKeys } from "./lidar-contract";

type LidarModelKeySource = {
  storage_key: string;
  quality_metrics: Record<string, unknown> | null;
};

function fallbackKey(storageKey: string, suffix: string): string {
  if (storageKey.endsWith("/manifest.json")) {
    return `${storageKey.slice(0, -"/manifest.json".length)}/${suffix}`;
  }
  return `${storageKey}/${suffix}`;
}

export function resolveLidarDerivativeKey(
  model: LidarModelKeySource,
  relativePath: string,
): string | null {
  if (!isSafeLidarRelativePath(relativePath)) return null;
  const keys: LidarDerivativeKeys = lidarDerivativeKeys(model.quality_metrics);
  if (relativePath === "manifest.json") return keys.lidarManifest ?? model.storage_key;
  if (relativePath === "tileset.json") {
    return keys.lidarTileset ?? fallbackKey(model.storage_key, relativePath);
  }
  if (relativePath === "qc.json") return keys.lidarQc ?? fallbackKey(model.storage_key, relativePath);
  if (relativePath.startsWith("nodes/")) {
    const prefix = keys.lidarNodesPrefix ?? fallbackKey(model.storage_key, "nodes/");
    return `${prefix.replace(/\/?$/, "/")}${relativePath.slice("nodes/".length)}`;
  }
  const keyByPath: Record<string, string | undefined> = {
    "analysis/flatness.json": keys.lidarFlatness,
    "analysis/slope.json": keys.lidarSlope,
    "analysis/contours.geojson": keys.lidarContours,
    "analysis/sections.json": keys.lidarSections,
  };
  return keyByPath[relativePath] ?? fallbackKey(model.storage_key, relativePath);
}
