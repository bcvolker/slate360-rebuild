import type { WaypointRecord } from "./types";
import { visibleWaypoints } from "./waypoints";

const MIN_GAP = 4;
const MAX_STATIONS = 5;

const TURN = /hall|door|entry|exit|stair|turn|corridor|lobby/i;

export function reducePathStations(waypoints: WaypointRecord[], clipId: string): WaypointRecord[] {
  const list = visibleWaypoints(waypoints, clipId);
  if (list.length <= MAX_STATIONS) return list;
  const keep = new Set<string>();
  keep.add(list[0].id);
  keep.add(list[list.length - 1].id);
  let lastT = list[0].tSeconds;
  for (const wp of list.slice(1, -1)) {
    const gap = wp.tSeconds - lastT;
    if (gap >= MIN_GAP || TURN.test(wp.label ?? "") || TURN.test(wp.zone ?? "")) {
      keep.add(wp.id);
      lastT = wp.tSeconds;
    }
  }
  let stations = list.filter((w) => keep.has(w.id));
  if (stations.length > MAX_STATIONS) {
    const step = (stations.length - 1) / (MAX_STATIONS - 1);
    stations = Array.from({ length: MAX_STATIONS }, (_, i) => stations[Math.round(i * step)]);
  }
  return stations;
}

export function stationsAround(
  stations: WaypointRecord[],
  t: number,
  limit = MAX_STATIONS,
): WaypointRecord[] {
  if (!stations.length) return [];
  const ranked = stations
    .map((wp) => ({ wp, dist: Math.abs(wp.tSeconds - t) }))
    .filter((row) => row.dist > 0.35)
    .sort((a, b) => a.dist - b.dist)
    .slice(0, limit);
  return ranked.map((row) => row.wp);
}

export function stationClock(t: number): string {
  return `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;
}

export function stationName(wp: WaypointRecord): string {
  return (wp.label || wp.zone || "Station").trim();
}

export function stationLabel(wp: WaypointRecord): string {
  return `${stationName(wp)} · ${stationClock(wp.tSeconds)}`;
}
