import {
  nearClipEnd,
  outgoingEdge,
  type ClipEdgeRecord,
  type ClipSummary,
  type TransitionType,
} from "./clip-edges";

export type ClipEdgeActionId = "take-off" | "go-inside" | "go-upstairs" | "continue";

export type ClipEdgeAction = {
  id: ClipEdgeActionId;
  label: string;
  edgeId: string;
  edge: ClipEdgeRecord;
};

export const CLIP_EDGE_ACTION_LABEL: Record<ClipEdgeActionId, string> = {
  "take-off": "Take Off",
  "go-inside": "Go Inside",
  "go-upstairs": "Go Upstairs",
  continue: "Continue",
};

function destLooksInterior(dest: ClipSummary | undefined): boolean {
  const blob = `${dest?.title ?? ""} ${dest?.zone ?? ""}`.toLowerCase();
  return /(interior|lobby|room|corridor|core|inside)/.test(blob);
}

export function actionIdForEdge(type: TransitionType, dest?: ClipSummary): ClipEdgeActionId {
  if (type === "aerial") return "take-off";
  if (type === "stairs") return "go-upstairs";
  if (type === "door") return "go-inside";
  if (type === "exterior" && destLooksInterior(dest)) return "go-inside";
  return "continue";
}

function toAction(edge: ClipEdgeRecord, dest: ClipSummary | undefined): ClipEdgeAction {
  const id = actionIdForEdge(edge.transitionType, dest);
  return { id, label: CLIP_EDGE_ACTION_LABEL[id], edgeId: edge.id, edge };
}

/** Surface Take Off / Go Inside / Go Upstairs / Continue only when a matching clip edge exists. */
export function clipEdgeActionsAtTime(args: {
  edges: ClipEdgeRecord[];
  clips: ClipSummary[];
  clipId: string;
  t: number;
  duration: number;
}): ClipEdgeAction[] {
  const { edges, clips, clipId, t, duration } = args;
  const destOf = (edge: ClipEdgeRecord) => clips.find((c) => c.id === edge.destClipId);
  const out: ClipEdgeAction[] = [];
  const start = outgoingEdge(edges, clipId, "start");
  const end = outgoingEdge(edges, clipId, "end");
  if (start && t <= 3.5) out.push(toAction(start, destOf(start)));
  const endWindow = duration > 0 ? Math.min(12, Math.max(2, duration * 0.18)) : 8;
  if (end && (duration <= 0 || nearClipEnd(t, duration, endWindow))) {
    out.push(toAction(end, destOf(end)));
  }
  const seen = new Set<string>();
  return out.filter((action) => {
    if (seen.has(action.edgeId)) return false;
    seen.add(action.edgeId);
    return true;
  });
}
