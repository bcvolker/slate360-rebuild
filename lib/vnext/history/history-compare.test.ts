import { describe, expect, it } from "vitest";
import { cameraSyncIsReliable, comparableReps, orderVisits } from "./history-rules";
import type { VnextVisit } from "./history-types";

function visit(partial: Partial<VnextVisit> & Pick<VnextVisit, "id" | "occurredAt">): VnextVisit {
  return {
    dateLabel: "Sep 1, 2026",
    title: "Visit",
    kind: "site",
    kindLabel: "Site documentation",
    sources: [],
    plans: [],
    items: [],
    itemCount: 0,
    thumbnailHref: null,
    frame: null,
    ...partial,
  };
}

describe("compare capability", () => {
  const reality = (id: string, spaceId: string, status: string | null): VnextVisit =>
    visit({
      id,
      occurredAt: id,
      kind: "reality",
      sources: [{ rep: "reality", label: "Reality scan", sourceId: id, exploreHref: `/explore?source=${id}`, imageHref: null }],
      frame: { spaceId, modelId: id, georeferenceStatus: status },
    });

  it("allows Reality compare only when both visits have it, and sync only inside one verified space", () => {
    const a = reality("2026-09-01T00:00:00.000Z", "space-1", "VERIFIED");
    const b = reality("2026-09-15T00:00:00.000Z", "space-1", "VERIFIED");
    expect(comparableReps(a, b)).toEqual(["reality"]);
    expect(cameraSyncIsReliable(a.frame, b.frame)).toBe(true);
    expect(cameraSyncIsReliable(a.frame, { ...b.frame!, georeferenceStatus: null })).toBe(false);
    expect(cameraSyncIsReliable(a.frame, { ...b.frame!, spaceId: "space-2" })).toBe(false);
    expect(cameraSyncIsReliable(a.frame, a.frame)).toBe(false);
    expect(comparableReps(a, visit({ id: "site", occurredAt: "2026-09-02T00:00:00.000Z" }))).toEqual([]);
  });

  it("keeps 360 compare independent when no viewpoint correspondence exists", () => {
    const left = visit({
      id: "a",
      occurredAt: "2026-09-01T00:00:00.000Z",
      sources: [{ rep: "360", label: "Entry", sourceId: "p1", exploreHref: "/e", imageHref: null }],
    });
    const right = visit({
      id: "b",
      occurredAt: "2026-09-02T00:00:00.000Z",
      sources: [{ rep: "360", label: "Corridor", sourceId: "p2", exploreHref: "/e", imageHref: null }],
    });
    expect(comparableReps(left, right)).toEqual(["360"]);
    expect(cameraSyncIsReliable(left.frame, right.frame)).toBe(false);
    expect(orderVisits(right, left).earlier.id).toBe("a");
  });

  it("compares plan context only when both visits reference a sheet", () => {
    const plan = {
      sheetId: "sheet-1",
      sheetLabel: "A2.12",
      revisionLabel: "Rev 2",
      exploreHref: "/explore?rep=plan&source=sheet-1",
      imageHref: "/sheet.jpg",
    };
    const withPlan = visit({ id: "a", occurredAt: "2026-09-01T00:00:00.000Z", plans: [plan] });
    const without = visit({ id: "b", occurredAt: "2026-09-02T00:00:00.000Z" });
    expect(comparableReps(withPlan, { ...without, id: "c", plans: [plan] })).toEqual(["plan"]);
    expect(comparableReps(withPlan, without)).toEqual([]);
  });
});
