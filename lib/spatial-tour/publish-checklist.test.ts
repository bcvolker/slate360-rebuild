import { describe, expect, it } from "vitest";
import { publishChecklist } from "./publish-checklist";
import type { CheckpointMark, RouteCheckpoint, TourVisit } from "./types";

const visit = (over: Partial<TourVisit> = {}): TourVisit => ({
  walkthroughId: "v1",
  title: "Visit 1",
  capturedAt: "2026-09-01T00:00:00Z",
  routeId: "r1",
  clientPublishedAt: null,
  stillsReviewedAt: "2026-09-02T00:00:00Z",
  privacyReviewedAt: "2026-09-02T00:00:00Z",
  clips: [{ id: "c1", durationS: 60, sortOrder: 0, hasPublicProxy: true }],
  ...over,
});

const cp = (id: string, over: Partial<RouteCheckpoint> = {}): RouteCheckpoint => ({
  id,
  chapterId: "ch1",
  label: `Checkpoint ${id}`,
  captureNote: null,
  sortOrder: 0,
  introducedInRevision: 1,
  retiredAt: null,
  replacedBy: null,
  ...over,
});

const mark = (checkpointId: string, over: Partial<CheckpointMark> = {}): CheckpointMark => ({
  id: `m-${checkpointId}`,
  checkpointId,
  walkthroughId: "v1",
  clipId: "c1",
  tSeconds: 10,
  yawDeg: 0,
  pitchDeg: 0,
  match: "matched",
  stillKey: "k",
  stillStatus: "ready",
  stillError: null,
  ...over,
});

const ok = (r: ReturnType<typeof publishChecklist>, id: string) => r.items.find((i) => i.id === id)?.ok;

describe("visit publish checklist", () => {
  it("passes when every checkpoint is resolved, stills are ready and reviews are confirmed", () => {
    const r = publishChecklist({ visit: visit(), checkpoints: [cp("a"), cp("b")], marks: [mark("a"), mark("b", { match: "not_captured", clipId: null, tSeconds: null, stillStatus: "none", stillKey: null })] });
    expect(r.canPublish).toBe(true);
  });

  it("blocks when a checkpoint has no mark for this visit", () => {
    const r = publishChecklist({ visit: visit(), checkpoints: [cp("a"), cp("b")], marks: [mark("a")] });
    expect(ok(r, "checkpoints")).toBe(false);
    expect(r.canPublish).toBe(false);
  });

  it("ignores retired checkpoints and other visits' marks", () => {
    const r = publishChecklist({
      visit: visit(),
      checkpoints: [cp("a"), cp("old", { retiredAt: "2026-09-03T00:00:00Z" })],
      marks: [mark("a"), mark("old", { walkthroughId: "v2" })],
    });
    expect(r.canPublish).toBe(true);
  });

  it("blocks while a still is queued or failed, and until stills and privacy are reviewed", () => {
    expect(publishChecklist({ visit: visit(), checkpoints: [cp("a")], marks: [mark("a", { stillStatus: "queued" })] }).canPublish).toBe(false);
    expect(publishChecklist({ visit: visit(), checkpoints: [cp("a")], marks: [mark("a", { stillStatus: "failed" })] }).canPublish).toBe(false);
    expect(ok(publishChecklist({ visit: visit({ stillsReviewedAt: null }), checkpoints: [cp("a")], marks: [mark("a")] }), "stills-reviewed")).toBe(false);
    expect(ok(publishChecklist({ visit: visit({ privacyReviewedAt: null }), checkpoints: [cp("a")], marks: [mark("a")] }), "privacy-reviewed")).toBe(false);
  });

  it("blocks when a marked clip has no operator-free video", () => {
    const r = publishChecklist({
      visit: visit({ clips: [{ id: "c1", durationS: 60, sortOrder: 0, hasPublicProxy: false }] }),
      checkpoints: [cp("a")],
      marks: [mark("a")],
    });
    expect(ok(r, "privacy-media")).toBe(false);
  });

  it("never passes an empty route", () => {
    expect(publishChecklist({ visit: visit(), checkpoints: [], marks: [] }).canPublish).toBe(false);
  });
});
