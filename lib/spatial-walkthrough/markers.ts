import type { OperatorPatch, WaypointRecord } from "./types";
import { indexAtTime, nextWaypoint } from "./waypoints";
import { activeSectors, type RedactionRule } from "./redaction";

export type PinMarkerInput = { id: string; yawDeg: number; pitchDeg: number; label: string };

export type ViewerMarkerDef = {
  id: string;
  yawDeg: number;
  pitchDeg: number;
  html: string;
  width: number;
  height: number;
  data: Record<string, unknown>;
};

function esc(value: string): string {
  return value.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch] ?? ch);
}

export function buildViewerMarkers(args: {
  waypoints: WaypointRecord[];
  clipId: string;
  t: number;
  pins: PinMarkerInput[];
  redactions: RedactionRule[];
  operatorPatch?: OperatorPatch | null;
}): ViewerMarkerDef[] {
  const { waypoints, clipId, t, pins, redactions, operatorPatch } = args;
  const idx = indexAtTime(waypoints, clipId, t);
  const next = nextWaypoint(waypoints, clipId, idx);
  const list: ViewerMarkerDef[] = [];

  if (next) {
    list.push({
      id: `wp-${next.id}`,
      yawDeg: next.yawDeg,
      pitchDeg: next.pitchDeg,
      html: `<button type="button" class="sw-reticle" aria-label="${esc(next.label ?? "Next station")}"><span class="sw-reticle-ring"></span></button>`,
      width: 56,
      height: 56,
      data: { kind: "waypoint", id: next.id, t: next.tSeconds, yaw: next.yawDeg, pitch: next.pitchDeg },
    });
  }

  for (const pin of pins) {
    list.push({
      id: `pin-${pin.id}`,
      yawDeg: pin.yawDeg,
      pitchDeg: pin.pitchDeg,
      html: `<button type="button" class="sw-pin" aria-label="${esc(pin.label)}"><span class="sw-pin-core"></span></button>`,
      width: 44,
      height: 44,
      data: { kind: "pin", id: pin.id },
    });
  }

  if (operatorPatch?.enabled) {
    list.push({
      id: "nadir-patch",
      yawDeg: 0,
      pitchDeg: -90,
      html: `<div class="sw-nadir" aria-hidden="true"></div>`,
      width: 280,
      height: 280,
      data: { kind: "patch" },
    });
    list.push({
      id: "rear-patch",
      yawDeg: 180,
      pitchDeg: -Math.round(operatorPatch.wrapY0Frac * 40),
      html: `<div class="sw-rear" aria-hidden="true"></div>`,
      width: 220,
      height: 160,
      data: { kind: "patch" },
    });
  }

  for (const s of activeSectors(redactions, clipId, t, "solid")) {
    const yaw = ((s.yawMin ?? 0) + (s.yawMax ?? 0)) / 2;
    const pitch = ((s.pitchMin ?? 0) + (s.pitchMax ?? 0)) / 2;
    list.push({
      id: `solid-${s.tStart}-${s.tEnd}`,
      yawDeg: yaw,
      pitchDeg: pitch,
      html: `<div class="sw-privacy" aria-hidden="true">Private</div>`,
      width: 200,
      height: 120,
      data: { kind: "privacy" },
    });
  }

  return list;
}
