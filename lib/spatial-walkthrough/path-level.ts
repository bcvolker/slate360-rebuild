export type PathLevel = "PATH_LEVEL_0" | "PATH_LEVEL_1" | "PATH_LEVEL_2";

export function resolvePathLevel(input: {
  hasTrajectory?: boolean;
  hasAuthoredYaw?: boolean;
  waypointCount?: number;
}): PathLevel {
  if (input.hasTrajectory) return "PATH_LEVEL_2";
  if (input.hasAuthoredYaw || (input.waypointCount ?? 0) > 0) return "PATH_LEVEL_1";
  return "PATH_LEVEL_0";
}

export function pathLevelLabel(level: PathLevel): string {
  if (level === "PATH_LEVEL_2") return "Registered camera path";
  if (level === "PATH_LEVEL_1") return "Recorded view stations";
  return "Video timestamps only";
}

export function pathIsMetric(level: PathLevel): boolean {
  return level === "PATH_LEVEL_2";
}
