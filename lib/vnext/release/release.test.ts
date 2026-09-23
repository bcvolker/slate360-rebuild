import { describe, expect, it } from "vitest";
import { activePublishedIds, publishRecords, qaBucket, revokeRecord, type PublicationRecord, type QaSource } from "./release-rules";

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

  it("replaces the published reality model and keeps the previous row", () => {
    const published = publishRecords([row("reality", "a")], { projectId: project, representation: "reality", sourceId: "b" });
    expect([...activePublishedIds(published, project, "reality")]).toEqual(["b"]);
    expect(published.find((item) => item.sourceId === "a")?.revokedAt).toBeTruthy();
    const revoked = revokeRecord(published, { projectId: project, representation: "reality", sourceId: "b" });
    expect(activePublishedIds(revoked, project, "reality").size).toBe(0);
    expect(revoked.find((item) => item.sourceId === "b")).toBeTruthy();
  });

  it("does not put an unsold thermal source in the delivery queue", () => {
    expect(qaBucket(source({ representation: "thermal", included: false }), null)).toBeNull();
  });

  it("moves a ready source from review to publish without publishing it, and can empty", () => {
    expect(qaBucket(source({}), null)).toBe("needs_review");
    expect(qaBucket(source({}), { projectId: project, representation: "reality", sourceId: "a", decision: "approved", note: null, needsRecapture: false })).toBe("ready_to_publish");
    expect(qaBucket(source({}), { projectId: project, representation: "reality", sourceId: "a", decision: "rejected", note: "Blurred", needsRecapture: true })).toBe("rejected");
    expect(qaBucket(source({ published: true }), null)).toBe("published");
  });
});
