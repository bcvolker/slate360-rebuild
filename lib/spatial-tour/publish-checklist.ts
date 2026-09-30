/**
 * Operator publish checklist for one visit. Every item must pass before the visit can be
 * published to clients; the server re-checks this on publish, so the UI cannot skip it.
 */
import type { CheckpointMark, RouteCheckpoint, TourVisit } from "./types";

export type ChecklistItem = { id: string; label: string; ok: boolean; detail: string };

export function activeCheckpoints(checkpoints: RouteCheckpoint[]): RouteCheckpoint[] {
  return checkpoints.filter((c) => !c.retiredAt);
}

export function publishChecklist(args: {
  visit: TourVisit;
  checkpoints: RouteCheckpoint[];
  marks: CheckpointMark[];
}): { items: ChecklistItem[]; canPublish: boolean } {
  const { visit } = args;
  const active = activeCheckpoints(args.checkpoints);
  const marks = new Map(
    args.marks.filter((m) => m.walkthroughId === visit.walkthroughId).map((m) => [m.checkpointId, m]),
  );
  const unresolved = active.filter((c) => !marks.has(c.id));
  const withFrames = active.map((c) => marks.get(c.id)).filter((m): m is CheckpointMark => Boolean(m && m.match !== "not_captured"));
  const stillsPending = withFrames.filter((m) => m.stillStatus !== "ready");
  const usedClips = new Set(withFrames.map((m) => m.clipId));
  const unbaked = visit.clips.filter((c) => usedClips.has(c.id) && !c.hasPublicProxy);

  const items: ChecklistItem[] = [
    {
      id: "route",
      label: "On the route",
      ok: Boolean(visit.routeId) && active.length > 0,
      detail: active.length ? `${active.length} checkpoints` : "Add at least one checkpoint",
    },
    {
      id: "checkpoints",
      label: "Every checkpoint resolved",
      ok: active.length > 0 && unresolved.length === 0,
      detail: unresolved.length ? `${unresolved.length} not set: ${unresolved.map((c) => c.label).slice(0, 3).join(", ")}` : "Matched, approximate or not captured",
    },
    {
      id: "privacy-media",
      label: "Operator-free video",
      ok: unbaked.length === 0 && visit.clips.some((c) => c.hasPublicProxy),
      detail: unbaked.length ? "Run the privacy bake first" : "Public derivative ready",
    },
    {
      id: "stills",
      label: "Checkpoint stills extracted",
      ok: stillsPending.length === 0,
      detail: stillsPending.length ? `${stillsPending.length} still${stillsPending.length === 1 ? "" : "s"} not ready` : "All ready",
    },
    {
      id: "stills-reviewed",
      label: "Stills and poster reviewed",
      ok: Boolean(visit.stillsReviewedAt),
      detail: visit.stillsReviewedAt ? "Confirmed" : "Open each checkpoint in the player and check its still",
    },
    {
      id: "privacy-reviewed",
      label: "Privacy reviewed",
      ok: Boolean(visit.privacyReviewedAt),
      detail: visit.privacyReviewedAt ? "Confirmed" : "Faces, plates and the operator are out of the published frames",
    },
  ];
  return { items, canPublish: items.every((i) => i.ok) };
}
