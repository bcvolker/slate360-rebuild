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

function mockAdmin(items: unknown[], published = true) {
  return {
    from: (table: string) =>
      chain(
        table === "project_source_publications"
          ? published
            ? items.map((item) => ({
                project_id: "p1",
                representation: "pano360",
                source_id: (item as { id: string }).id,
                revoked_at: null,
              }))
            : []
          : items,
      ),
  } as unknown as Parameters<typeof loadPanoSources>[0];
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
  it("builds the vNext-scoped project image URL, not the legacy punchwalk-gated route", async () => {
    const admin = mockAdmin([ITEM]);
    const result = await resolvePanoSourceData(admin, "p1", "item-1");
    expect(result).toEqual({
      sourceId: "item-1",
      data: { kind: "360", imageUrl: "/api/vnext/projects/p1/items/item-1/image", title: "East stair" },
    });
  });

  it("keeps every published station when another station is also published", async () => {
    const second = { ...ITEM, id: "item-2", title: "West stair" };
    const admin = mockAdmin([ITEM, second]);
    const sources = await loadPanoSources(admin, "p1");
    expect(sources.map((item) => item.id)).toEqual(["item-1", "item-2"]);
    expect((await resolvePanoSourceData(admin, "p1", "item-1"))?.sourceId).toBe("item-1");
  });

  it("does not open an unpublished 360 photo", async () => {
    const admin = mockAdmin([ITEM], false);
    expect(await resolvePanoSourceData(admin, "p1", "item-1")).toBeNull();
    expect(await loadPanoSources(admin, "p1")).toEqual([]);
  });

  it("returns null when no matching item exists", async () => {
    const admin = mockAdmin([]);
    const result = await resolvePanoSourceData(admin, "p1", "missing");
    expect(result).toBeNull();
  });

  it("defaults to the published station when a newer unpublished station exists", async () => {
    const older = { id: "A", title: "Published", captured_at: "2026-01-01T00:00:00.000Z" };
    const newer = { id: "B", title: "Draft", captured_at: "2026-09-01T00:00:00.000Z" };
    const admin = filteringAdmin([newer, older], new Set(["A"]));
    expect((await resolvePanoSourceData(admin, "p1", null))?.sourceId).toBe("A");
  });

  it("does not substitute another station for an explicit unpublished source", async () => {
    const older = { id: "A", title: "Published", captured_at: "2026-01-01T00:00:00.000Z" };
    const newer = { id: "B", title: "Draft", captured_at: "2026-09-01T00:00:00.000Z" };
    const admin = filteringAdmin([newer, older], new Set(["A"]));
    expect(await resolvePanoSourceData(admin, "p1", "B")).toBeNull();
  });
});

function filteringAdmin(items: Array<{ id: string; captured_at: string | null }>, publishedIds: Set<string>) {
  return {
    from: (table: string) => {
      if (table === "project_source_publications") {
        return chain([...publishedIds].map((id) => ({
          project_id: "p1",
          representation: "pano360",
          source_id: id,
          revoked_at: null,
        })));
      }
      let rows = items.slice();
      const builder = {
        select: () => builder,
        eq: (column: string, value: string) => {
          if (column === "id") rows = rows.filter((row) => row.id === value);
          return builder;
        },
        is: () => builder,
        in: (_column: string, ids: string[]) => {
          rows = rows.filter((row) => ids.includes(row.id));
          return builder;
        },
        order: () => {
          rows = rows.slice().sort((a, b) => {
            if (!a.captured_at) return 1;
            if (!b.captured_at) return -1;
            return a.captured_at < b.captured_at ? 1 : -1;
          });
          return builder;
        },
        limit: (count: number) => {
          rows = rows.slice(0, count);
          return builder;
        },
        then: (resolve: (value: { data: unknown[] }) => void) => resolve({ data: rows }),
      };
      return builder;
    },
  } as unknown as Parameters<typeof resolvePanoSourceData>[0];
}
