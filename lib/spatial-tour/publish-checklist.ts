/**
 * Operator publish checklist for one visit. Every item must pass before the visit can be
 * published to clients; the server re-checks this on publish, so the UI cannot skip it.
 */
import type { CheckpointMark, RouteCheckpoint, TourVisit } from "./types";
import { MAX_PAINT_COVERAGE, MAX_STILL_BLACK_FRACTION } from "./look-cone";

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
  const used = visit.clips.filter((c) => usedClips.has(c.id));
  const unbaked = used.filter((c) => !c.hasPublicProxy);
  const noCone = used.filter((c) => !c.lookCone);
  const badMask = used.filter((c) => c.maskVisible || c.maskCoverage > MAX_PAINT_COVERAGE);
  const blackStills = withFrames.filter(
    (m) => m.stillStatus === "ready" && (m.stillBlackFraction == null || m.stillBlackFraction > MAX_STILL_BLACK_FRACTION),
  );

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
      id: "look-cone",
      label: "Published view set",
      ok: used.length > 0 && noCone.length === 0,
      detail: noCone.length || !used.length ? "Set the forward view clients are locked to" : "Clients can only look where you are not",
    },
    {
      id: "mask-out-of-view",
      label: "Privacy mask stays out of view",
      ok: used.length > 0 && badMask.length === 0,
      detail: !used.length
        ? "Checked once a checkpoint is marked"
        : badMask.length
          ? "The mask reaches into the published view. Re-bake with a tight mask (stray limb only) and rely on the published view"
          : "No mask inside the published view",
    },
    {
      id: "stills",
      label: "Checkpoint stills extracted",
      ok: withFrames.length > 0 && stillsPending.length === 0,
      detail: !withFrames.length
        ? "No stills yet"
        : stillsPending.length
          ? `${stillsPending.length} still${stillsPending.length === 1 ? "" : "s"} not ready`
          : "All ready",
    },
    {
      id: "stills-clean",
      label: "No blacked-out areas in stills",
      ok: withFrames.length > 0 && stillsPending.length === 0 && blackStills.length === 0,
      detail: !withFrames.length
        ? "No stills yet"
        : blackStills.length
          ? `${blackStills.length} still${blackStills.length === 1 ? " shows" : "s show"} a black area. Aim higher or fix the mask, then mark again`
          : stillsPending.length
            ? "Checked when the stills are ready"
            : "Every still is clean",
    },
    {
      id: "stills-reviewed",
      label: "Stills and poster reviewed",
      ok: Boolean(visit.stillsReviewedAt),
      detail: visit.stillsReviewedAt ? "Confirmed" : "Open each checkpoint in the player and check its still",
    },
    {
      id: "privacy-reviewed",
      label: "No operator or ugly mask in the published view",
      ok: Boolean(visit.privacyReviewedAt),
      detail: visit.privacyReviewedAt ? "Confirmed" : "You checked every still: no operator, no black areas, no faces or plates",
    },
  ];
  return { items, canPublish: items.every((i) => i.ok) };
}
