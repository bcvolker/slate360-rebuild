import type { WaypointRecord } from "./types";

export function toWaypoint(row: Record<string, unknown>): WaypointRecord {
  return {
    id: String(row.id),
    clipId: String(row.clip_id ?? row.clipId),
    tSeconds: Number(row.t_seconds ?? row.tSeconds),
    label: (row.label as string) ?? null,
    zone: (row.zone as string) ?? null,
    yawDeg: Number(row.yaw_deg ?? row.yawDeg ?? 0),
    pitchDeg: Number(row.pitch_deg ?? row.pitchDeg ?? 0),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 0),
    thumbnailKey: (row.thumbnail_key as string) ?? (row.thumbnailKey as string) ?? null,
    xyz: row.xyz,
    isVisible: row.is_visible !== false && row.isVisible !== false,
  };
}

export function orderedWaypoints(waypoints: WaypointRecord[], clipId: string): WaypointRecord[] {
  return waypoints
    .filter((w) => w.clipId === clipId)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.tSeconds - b.tSeconds);
}

export function visibleWaypoints(
  waypoints: WaypointRecord[],
  clipId: string,
  hiddenIds: Set<string> = new Set(),
): WaypointRecord[] {
  return orderedWaypoints(waypoints, clipId).filter((w) => w.isVisible && !hiddenIds.has(w.id));
}

export function nextWaypoint(
  waypoints: WaypointRecord[],
  clipId: string,
  fromIndex: number,
): WaypointRecord | null {
  const list = visibleWaypoints(waypoints, clipId);
  if (list.length === 0) return null;
  const i = Math.min(Math.max(fromIndex + 1, 0), list.length);
  return list[i] ?? null;
}

export function prevWaypoint(
  waypoints: WaypointRecord[],
  clipId: string,
  fromIndex: number,
): WaypointRecord | null {
  const list = visibleWaypoints(waypoints, clipId);
  if (list.length === 0) return null;
  if (fromIndex <= 0) return null;
  const i = Math.max(fromIndex - 1, 0);
  return list[i] ?? null;
}

export function indexAtTime(waypoints: WaypointRecord[], clipId: string, t: number): number {
  const list = visibleWaypoints(waypoints, clipId);
  if (list.length === 0) return -1;
  let best = 0;
  for (let i = 0; i < list.length; i++) {
    if (list[i].tSeconds <= t + 0.05) best = i;
  }
  return best;
}

export function assignSortOrder(waypoints: WaypointRecord[]): WaypointRecord[] {
  return waypoints
    .slice()
    .sort((a, b) => a.tSeconds - b.tSeconds)
    .map((w, i) => ({ ...w, sortOrder: i }));
}
