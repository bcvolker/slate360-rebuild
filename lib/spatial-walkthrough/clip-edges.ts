export type ClipEndpoint = "start" | "end";
export type TransitionType = "door" | "stairs" | "exterior" | "aerial" | "manual";

export type ClipEdgeRecord = {
  id: string;
  walkthroughId: string;
  sourceClipId: string;
  destClipId: string;
  sourceEndpoint: ClipEndpoint;
  destEndpoint: ClipEndpoint;
  defaultYaw: number;
  defaultPitch: number;
  transitionType: TransitionType;
};

export type ClipSummary = {
  id: string;
  title: string | null;
  zone: string | null;
  durationS: number;
  defaultYaw: number;
  defaultPitch: number;
  sortOrder: number;
  videoUrl: string;
  posterUrl: string | null;
};

export const TRANSITION_TYPES: TransitionType[] = ["door", "stairs", "exterior", "aerial", "manual"];

function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function toClipEdge(row: Record<string, unknown>): ClipEdgeRecord {
  const srcEp = String(row.source_endpoint ?? row.sourceEndpoint ?? "end");
  const destEp = String(row.dest_endpoint ?? row.destEndpoint ?? "start");
  const kind = String(row.transition_type ?? row.transitionType ?? "manual");
  return {
    id: String(row.id),
    walkthroughId: String(row.walkthrough_id ?? row.walkthroughId),
    sourceClipId: String(row.source_clip_id ?? row.sourceClipId),
    destClipId: String(row.dest_clip_id ?? row.destClipId),
    sourceEndpoint: srcEp === "start" ? "start" : "end",
    destEndpoint: destEp === "end" ? "end" : "start",
    defaultYaw: num(row.default_yaw ?? row.defaultYaw),
    defaultPitch: num(row.default_pitch ?? row.defaultPitch),
    transitionType: TRANSITION_TYPES.includes(kind as TransitionType) ? (kind as TransitionType) : "manual",
  };
}

export function orderedClips<T extends { id: string; sortOrder?: number; sort_order?: number }>(clips: T[]): T[] {
  return clips.slice().sort((a, b) => (a.sortOrder ?? a.sort_order ?? 0) - (b.sortOrder ?? b.sort_order ?? 0));
}

export function impliedEdges(clips: ClipSummary[], walkthroughId: string): ClipEdgeRecord[] {
  const list = orderedClips(clips);
  const edges: ClipEdgeRecord[] = [];
  for (let i = 0; i < list.length - 1; i++) {
    edges.push({
      id: `implied-${list[i].id}-${list[i + 1].id}`,
      walkthroughId,
      sourceClipId: list[i].id,
      destClipId: list[i + 1].id,
      sourceEndpoint: "end",
      destEndpoint: "start",
      defaultYaw: list[i + 1].defaultYaw,
      defaultPitch: list[i + 1].defaultPitch,
      transitionType: "manual",
    });
  }
  return edges;
}

export function resolveEdges(
  clips: ClipSummary[],
  stored: ClipEdgeRecord[],
  walkthroughId: string,
): ClipEdgeRecord[] {
  return stored.length > 0 ? stored : impliedEdges(clips, walkthroughId);
}

export function outgoingEdge(
  edges: ClipEdgeRecord[],
  clipId: string,
  endpoint: ClipEndpoint,
): ClipEdgeRecord | null {
  return edges.find((e) => e.sourceClipId === clipId && e.sourceEndpoint === endpoint) ?? null;
}

/** Same continuous clip: keep playing. Crossing source clips: short fade. */
export function crossingKind(fromClipId: string, toClipId: string): "continue" | "fade" {
  return fromClipId === toClipId ? "continue" : "fade";
}

export function destTime(edge: ClipEdgeRecord, destDuration: number): number {
  return edge.destEndpoint === "end" ? Math.max(0, destDuration) : 0;
}

export function locationChip(clip: { title: string | null; zone: string | null }, transition: TransitionType): string {
  const place = clip.title || clip.zone || "Next capture";
  if (transition === "stairs") return `Stairs · ${place}`;
  if (transition === "door") return `Door · ${place}`;
  if (transition === "exterior") return `Exterior · ${place}`;
  if (transition === "aerial") return `Aerial · ${place}`;
  return place;
}

export function nearClipEnd(t: number, duration: number, window = 0.2): boolean {
  return duration > 0 && t >= duration - window;
}
