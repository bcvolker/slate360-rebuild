export type LidarDerivativeKeys = {
  lidarManifest?: string;
  lidarTileset?: string;
  lidarNodesPrefix?: string;
  lidarFlatness?: string;
  lidarSlope?: string;
  lidarContours?: string;
  lidarSections?: string;
  lidarQc?: string;
};

export type LidarBounds = {
  min: [number, number, number];
  max: [number, number, number];
};

export type LidarNode = {
  id: string;
  path?: string;
  bounds: LidarBounds;
  count: number;
  lod: boolean;
  leaf: boolean;
  level: number;
};

export type LidarManifest = {
  version: number;
  format: "slate360-3dtiles";
  coordinateSystem: "model";
  crs: string | null;
  bounds: LidarBounds;
  pointCount: number;
  nodeCount: number;
  attributes: string[];
  tileset: string;
  nodes: LidarNode[];
  analysis?: {
    flatness?: string;
    slope?: string;
    contours?: string;
    sections?: string;
  };
};

export type LidarColorMode = "rgb" | "deviation" | "slope";

export function lidarDerivativeKeys(metrics: Record<string, unknown> | null | undefined): LidarDerivativeKeys {
  const raw = metrics?.derivativeKeys;
  if (!raw || typeof raw !== "object") return {};
  const source = raw as Record<string, unknown>;
  const keys: LidarDerivativeKeys = {};
  const names: (keyof LidarDerivativeKeys)[] = [
    "lidarManifest",
    "lidarTileset",
    "lidarNodesPrefix",
    "lidarFlatness",
    "lidarSlope",
    "lidarContours",
    "lidarSections",
    "lidarQc",
  ];
  for (const name of names) {
    if (typeof source[name] === "string" && source[name]) keys[name] = source[name] as string;
  }
  return keys;
}

export function isSafeLidarRelativePath(path: string): boolean {
  return (
    path === "manifest.json" ||
    path === "tileset.json" ||
    path === "qc.json" ||
    /^nodes\/[A-Za-z0-9_-]+\.pnts$/.test(path) ||
    /^analysis\/(flatness|slope|sections)\.json$/.test(path) ||
    path === "analysis/contours.geojson"
  );
}
