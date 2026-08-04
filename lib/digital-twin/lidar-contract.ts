export type LidarDerivativeKeys = {
  lidarHierarchy?: string;
  lidarValuesPrefix?: string;
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
  valuesPath?: string;
  bounds: LidarBounds;
  count: number;
  leaf: boolean;
  level: number;
};

export type LidarManifest = {
  version: number | string;
  format: "potree";
  coordinateSystem: "model";
  crs: string | null;
  bounds: LidarBounds;
  pointCount: number;
  nodeCount?: number;
  attributes?: string[];
  octreeDir: "tiles";
  spacing?: number;
  scale?: number;
  offset?: [number, number, number];
  pointStride?: number;
  positionOffset?: number;
  colorOffset?: number;
  nodes: LidarNode[];
  analysis?: {
    valuesPrefix?: string;
    flatness?: string;
    slope?: string;
    contours?: string;
    sections?: string;
  };
};

export type LidarColorMode = "rgb" | "deviation" | "slope";

export function lidarDerivativeKeys(
  metrics: Record<string, unknown> | null | undefined,
): LidarDerivativeKeys {
  const raw = metrics?.derivativeKeys;
  if (!raw || typeof raw !== "object") return {};
  const source = raw as Record<string, unknown>;
  const keys: LidarDerivativeKeys = {};
  const names: (keyof LidarDerivativeKeys)[] = [
    "lidarHierarchy",
    "lidarValuesPrefix",
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
    path === "hierarchy.json" ||
    path === "qc.json" ||
    /^tiles\/[A-Za-z0-9_-]+\.bin$/.test(path) ||
    /^analysis\/tiles\/[A-Za-z0-9_-]+\.bin$/.test(path) ||
    /^analysis\/(flatness|slope|sections)\.json$/.test(path) ||
    path === "analysis/contours.geojson"
  );
}
