import { describe, expect, it } from "vitest";
import { loadPanoSources, resolvePanoSourceData } from "./resolve-pano-source";

function chain(data: unknown[]) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    is: () => builder,
    order: () => builder,
    limit: () => builder,
    then: (resolve: (value: { data: unknown[] }) => void) => resolve({ data }),
  };
  return builder;
}

function mockAdmin(items: unknown[]) {
  return { from: () => chain(items) } as unknown as Parameters<typeof loadPanoSources>[0];
}

const ITEM = {
  id: "item-1",
  title: "East stair",
  captured_at: "2026-09-01T00:00:00.000Z",
};

describe("loadPanoSources", () => {
  it("labels an untitled item as '360 photo'", async () => {
    const admin = mockAdmin([{ ...ITEM, title: null }]);
    const sources = await loadPanoSources(admin, "p1");
    expect(sources).toEqual([{ id: "item-1", label: "360 photo", dateLabel: "Sep 1, 2026" }]);
  });

  it("uses the item's title when present", async () => {
    const admin = mockAdmin([ITEM]);
    const sources = await loadPanoSources(admin, "p1");
    expect(sources[0]?.label).toBe("East stair");
  });
});

describe("resolvePanoSourceData", () => {
  it("builds the proven /api/site-walk/items/[id]/image URL for the requested source", async () => {
    const admin = mockAdmin([ITEM]);
    const result = await resolvePanoSourceData(admin, "p1", "item-1");
    expect(result).toEqual({
      sourceId: "item-1",
      data: { kind: "360", imageUrl: "/api/site-walk/items/item-1/image", title: "East stair" },
    });
  });

  it("returns null when no matching item exists", async () => {
    const admin = mockAdmin([]);
    const result = await resolvePanoSourceData(admin, "p1", "missing");
    expect(result).toBeNull();
  });
});
