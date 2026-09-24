import { describe, expect, it } from "vitest";
import { activePublishedIds, automaticBackfillShouldDrop, publishBlockReason, publishRecords, qaBucket, revokeRecord, type PublicationRecord, type QaSource } from "./release-rules";

const project = "p1";

function row(representation: PublicationRecord["representation"], sourceId: string, revokedAt: string | null = null): PublicationRecord {
  return { projectId: project, representation, sourceId, revokedAt };
}

const source = (partial: Partial<QaSource>): QaSource => ({
  projectId: project,
  representation: "reality",
  sourceId: "a",
  title: "Model A",
  occurredAt: "2026-09-01T00:00:00.000Z",
  included: true,
  published: false,
  ...partial,
});

describe("vNext publication", () => {
  it("publishes a splat without revoking a mesh", () => {
    const next = publishRecords([row("geometry", "mesh")], { projectId: project, representation: "reality", sourceId: "splat" });
    expect(activePublishedIds(next, project, "geometry").has("mesh")).toBe(true);
    expect(activePublishedIds(next, project, "reality")).toEqual(new Set(["splat"]));
  });

  it("keeps an older published source when a newer one is published", () => {
    const published = publishRecords([row("reality", "a")], { projectId: project, representation: "reality", sourceId: "b" });
    expect(activePublishedIds(published, project, "reality")).toEqual(new Set(["a", "b"]));
    const plans = publishRecords(
      [row("plans", "a1"), row("plans", "a2", "revoked")],
      { projectId: project, representation: "plans", sourceId: "a2" },
    );
    expect(activePublishedIds(plans, project, "plans")).toEqual(new Set(["a1", "a2"]));
    const panos = publishRecords([row("pano360", "station-1")], { projectId: project, representation: "pano360", sourceId: "station-2" });
    expect(activePublishedIds(panos, project, "pano360")).toEqual(new Set(["station-1", "station-2"]));
    const revoked = revokeRecord(published, { projectId: project, representation: "reality", sourceId: "a" });
    expect(activePublishedIds(revoked, project, "reality")).toEqual(new Set(["b"]));
  });

  it("does not put an unsold thermal source in the delivery queue", () => {
    expect(qaBucket(source({ representation: "thermal", included: false }), null)).toBeNull();
  });

  it("moves a ready source from review to publish without publishing it, and can empty", () => {
    expect(qaBucket(source({}), null)).toBe("needs_review");
    expect(qaBucket(source({}), { projectId: project, representation: "reality", sourceId: "a", decision: "approved", note: null, needsRecapture: false })).toBe("ready_to_publish");
    expect(qaBucket(source({}), { projectId: project, representation: "reality", sourceId: "a", decision: "rejected", note: "Blurred", needsRecapture: true })).toBe("rejected");
    expect(qaBucket(source({ published: true }), null)).toBe("published");
    expect(qaBucket(source({ published: false }), { projectId: project, representation: "reality", sourceId: "a", decision: "approved", note: null, needsRecapture: false })).toBe("ready_to_publish");
  });

  it("drops an automatic backfill only when that service is not included", () => {
    expect(automaticBackfillShouldDrop({ publishedBy: null, included: false })).toBe(true);
    expect(automaticBackfillShouldDrop({ publishedBy: null, included: true })).toBe(false);
    expect(automaticBackfillShouldDrop({ publishedBy: "operator", included: false })).toBe(false);
  });

  it("publishes only an included source that is already approved", () => {
    expect(publishBlockReason({ included: true, decision: null })).toBe("not_approved");
    expect(publishBlockReason({ included: true, decision: "rejected" })).toBe("not_approved");
    expect(publishBlockReason({ included: false, decision: "approved" })).toBe("not_included");
    expect(publishBlockReason({ included: true, decision: "approved" })).toBeNull();
  });
});
