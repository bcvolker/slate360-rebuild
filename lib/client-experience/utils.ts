import type { ProjectExperience, SpatialRef, Station, Visit, Waypoint } from "./types";

const DATE_FMT = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const TIME_FMT = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" });

export function formatDate(iso: string): string {
  return DATE_FMT.format(new Date(iso));
}
export function formatTime(iso: string): string {
  return TIME_FMT.format(new Date(iso));
}
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function visitById(data: ProjectExperience, id: string | null | undefined): Visit | null {
  return data.visits.find((v) => v.id === id) ?? null;
}

export function latestVisit(data: ProjectExperience): Visit {
  return visitById(data, data.latestVisitId) ?? data.visits[0];
}

/** The waypoint at or just before `t`. */
export function waypointAt(waypoints: Waypoint[], t: number): Waypoint | null {
  let best: Waypoint | null = null;
  for (const w of waypoints) if (w.t <= t + 0.001) best = w;
  return best ?? waypoints[0] ?? null;
}

export function spaceAt(waypoints: Waypoint[], t: number): string {
  return waypointAt(waypoints, t)?.space ?? "";
}

/**
 * Next waypoint in the direction the viewer is facing. Facing within ±90° of
 * the path's forward yaw advances; otherwise the previous waypoint is offered.
 */
export function nextWaypointFor(waypoints: Waypoint[], t: number, yawDeg: number): { target: Waypoint; direction: "forward" | "back" } | null {
  if (waypoints.length === 0) return null;
  const current = waypointAt(waypoints, t);
  const fwd = current?.forwardYaw ?? 0;
  const delta = Math.abs((((yawDeg - fwd) % 360) + 540) % 360 - 180);
  const forward = delta <= 90;
  if (forward) {
    const target = waypoints.find((w) => w.t > t + 0.5);
    return target ? { target, direction: "forward" } : null;
  }
  const prior = [...waypoints].reverse().find((w) => w.t < t - 0.5);
  return prior ? { target: prior, direction: "back" } : null;
}

/** Approximate plan position at `t`, linearly interpolated between waypoints. */
export function positionAt(waypoints: Waypoint[], t: number): { u: number; v: number; heading: number } | null {
  if (waypoints.length === 0) return null;
  if (t <= waypoints[0].t) return { ...waypoints[0], heading: headingBetween(waypoints[0], waypoints[1] ?? waypoints[0]) };
  for (let i = 0; i < waypoints.length - 1; i++) {
    const a = waypoints[i], b = waypoints[i + 1];
    if (t >= a.t && t <= b.t) {
      const k = b.t === a.t ? 0 : (t - a.t) / (b.t - a.t);
      return { u: a.u + (b.u - a.u) * k, v: a.v + (b.v - a.v) * k, heading: headingBetween(a, b) };
    }
  }
  const last = waypoints[waypoints.length - 1];
  return { u: last.u, v: last.v, heading: headingBetween(waypoints[waypoints.length - 2] ?? last, last) };
}

function headingBetween(a: { u: number; v: number }, b: { u: number; v: number }): number {
  return (Math.atan2(b.v - a.v, b.u - a.u) * 180) / Math.PI;
}

export function stationById(data: ProjectExperience, id: string | null | undefined): Station | null {
  return data.stations.find((s) => s.id === id) ?? null;
}

export function stationsForVisit(data: ProjectExperience, visitId: string): Station[] {
  return data.stations.filter((s) => s.visitId === visitId);
}

/** Build an in-experience href for a spatial reference. */
export function hrefForRef(base: string, ref: SpatialRef, itemId?: string, suffix = ""): string {
  const extra = suffix.startsWith("?") ? `&${suffix.slice(1)}` : "";
  const q = `${itemId ? `&item=${itemId}` : ""}${extra}`;
  switch (ref.kind) {
    case "plan":
      return `${base}/plan?u=${ref.u.toFixed(3)}&v=${ref.v.toFixed(3)}${q}`;
    case "walkthrough":
      return `${base}/walk?t=${ref.t}&yaw=${ref.yaw}&pitch=${ref.pitch}${q}`;
    case "station":
      return `${base}/stations?s=${ref.stationId}&yaw=${ref.yaw}&pitch=${ref.pitch}${q}`;
    case "twin":
      return `${base}/twin?x=${ref.xyz[0]}&y=${ref.xyz[1]}&z=${ref.xyz[2]}${q}`;
  }
}

/** Append the preview-variant suffix to an in-experience href. */
export function withSuffix(href: string, suffix?: string): string {
  if (!suffix) return href;
  const extra = suffix.startsWith("?") ? suffix.slice(1) : suffix;
  return `${href}${href.includes("?") ? "&" : "?"}${extra}`;
}

/** Anchors for tap-to-move: the recorded path expressed as Cursor's PathAnchor shape. */
export function pathAnchors(waypoints: Waypoint[]): { id: string; tSeconds: number; yawDeg: number; segmentId?: string }[] {
  return waypoints.map((w) => ({ id: w.id, tSeconds: w.t, yawDeg: w.forwardYaw, segmentId: w.segmentId }));
}

export const REF_LABEL: Record<SpatialRef["kind"], string> = {
  plan: "Plan",
  walkthrough: "Walkthrough",
  station: "360 station",
  twin: "Reality twin",
};

export const ITEM_TYPE_LABEL = { rfi: "RFI", issue: "Issue", note: "Note", document: "Document", photo: "Photo", question: "Question" } as const;
export const ITEM_STATUS_LABEL = { open: "Open", in_progress: "In progress", resolved: "Resolved" } as const;

export function readNumber(v: string | string[] | undefined, fallback: number): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isFinite(n) ? n : fallback;
}
export function readString(v: string | string[] | undefined): string | null {
  const s = Array.isArray(v) ? v[0] : v;
  return s && s.length > 0 ? s : null;
}
