import { describe, expect, it } from "vitest";
import { filterVisitsForScope } from "./filter-client-surface";
import { scopeFromIncluded } from "./resolve-client-scope";
import type { VnextVisit } from "@/lib/vnext/history/history-types";

const VISIT: VnextVisit = {
  id: "visit-1",
  occurredAt: "2026-09-18T00:00:00.000Z",
  dateLabel: "Sep 18, 2026",
  title: "Sep 18, 2026",
  kind: "reality",
  kindLabel: "3D Scan",
  sources: [{ rep: "reality", label: "Reality", sourceId: "model-1", exploreHref: "/x", imageHref: "/img.jpg" }],
  plans: [],
  items: [
    { id: "item-1", title: "Cracked slab, north corridor", href: "/vnext/projects/p1/items/item-1" },
    { id: "item-2", title: "Water stain, ceiling tile", href: "/vnext/projects/p1/items/item-2" },
  ],
  itemCount: 2,
  thumbnailHref: "/img.jpg",
  frame: null,
};

describe("filterVisitsForScope — Items capability leak (P1 review finding)", () => {
  it("strips item titles/links and zeroes itemCount when Items is excluded", () => {
    const scope = scopeFromIncluded(["reality", "history"]);
    const [visit] = filterVisitsForScope([VISIT], scope);
    expect(visit.items).toEqual([]);
    expect(visit.itemCount).toBe(0);
  });

  it("keeps item titles/links and the real count when Items is included", () => {
    const scope = scopeFromIncluded(["reality", "history", "items"]);
    const [visit] = filterVisitsForScope([VISIT], scope);
    expect(visit.items).toHaveLength(2);
    expect(visit.itemCount).toBe(2);
    expect(visit.items[0].title).toBe("Cracked slab, north corridor");
  });

  it("still hides the whole visit list when History itself is excluded, regardless of Items", () => {
    const scope = scopeFromIncluded(["reality", "items"]);
    expect(filterVisitsForScope([VISIT], scope)).toEqual([]);
  });
});
