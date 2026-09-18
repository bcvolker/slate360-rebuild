import { describe, expect, it } from "vitest";
import { vnextExploreHref } from "./build-explore-href";

const BASE = "/vnext/projects/p1/explore";

describe("vnextExploreHref", () => {
  it("builds a bare path with no query when nothing is set", () => {
    expect(vnextExploreHref(BASE, { rep: null })).toBe(BASE);
  });

  it("includes rep, source, and present when set", () => {
    expect(vnextExploreHref(BASE, { rep: "360", source: "photo-1", present: true })).toBe(
      `${BASE}?rep=360&source=photo-1&present=1`,
    );
  });

  it("preserves the opaque item param across a representation switch", () => {
    expect(vnextExploreHref(BASE, { rep: "plan", item: "item-1" })).toBe(`${BASE}?rep=plan&item=item-1`);
  });

  it("preserves item across a source switch", () => {
    expect(vnextExploreHref(BASE, { rep: "360", source: "photo-2", item: "item-1" })).toBe(
      `${BASE}?rep=360&source=photo-2&item=item-1`,
    );
  });

  it("preserves item when entering presentation mode", () => {
    expect(vnextExploreHref(BASE, { rep: "reality", item: "item-1", present: true })).toBe(
      `${BASE}?rep=reality&item=item-1&present=1`,
    );
  });

  it("preserves item when exiting presentation mode (present omitted)", () => {
    expect(vnextExploreHref(BASE, { rep: "reality", item: "item-1", present: false })).toBe(
      `${BASE}?rep=reality&item=item-1`,
    );
  });

  it("omits item when null or absent", () => {
    expect(vnextExploreHref(BASE, { rep: "reality", item: null })).toBe(`${BASE}?rep=reality`);
    expect(vnextExploreHref(BASE, { rep: "reality" })).toBe(`${BASE}?rep=reality`);
  });
});
