import { describe, expect, it } from "vitest";
import {
  isClientVisible,
  layoutStateGates,
  resolveProjectCapabilities,
  visiblePortalNav,
  visibleRealityTiles,
} from "./capabilities";

describe("capability gating", () => {
  it("hides Twin without accepted QA and human review", () => {
    const base = { exists: true, published: true, entitled: true };
    expect(isClientVisible("twin", { ...base, qaStatus: "accepted" })).toBe(false);
    expect(isClientVisible("twin", { ...base, qaStatus: "accepted", humanReviewAccepted: false })).toBe(false);
    expect(isClientVisible("twin", { ...base, qaStatus: "candidate", humanReviewAccepted: true })).toBe(false);
    expect(isClientVisible("twin", { ...base, qaStatus: "accepted", humanReviewAccepted: true })).toBe(true);
  });

  it("hides Plan when only a PDF exists", () => {
    expect(isClientVisible("plan", { exists: true, published: true, entitled: true, rasterReady: false })).toBe(false);
    expect(isClientVisible("plan", { exists: true, published: true, entitled: true, rasterReady: true })).toBe(true);
  });

  it("reflows layout states A–E without Twin placeholders", () => {
    const a = resolveProjectCapabilities(layoutStateGates("A"));
    expect(visibleRealityTiles(a)).toEqual(["walkthrough"]);
    expect(visiblePortalNav(a)).toEqual(["overview", "reality", "history"]);

    const b = resolveProjectCapabilities(layoutStateGates("B"));
    expect(visibleRealityTiles(b)).toEqual(["stations"]);
    expect(b.twin).toBe(false);

    const c = resolveProjectCapabilities(layoutStateGates("C"));
    expect(visibleRealityTiles(c)).toEqual(["walkthrough", "stations"]);

    const d = resolveProjectCapabilities(layoutStateGates("D"));
    expect(visibleRealityTiles(d)).toEqual(["walkthrough", "twin"]);

    const e = resolveProjectCapabilities(layoutStateGates("E"));
    expect(visibleRealityTiles(e)).toEqual(["walkthrough", "twin", "stations"]);
    expect(visiblePortalNav(e)).toContain("plan");
    expect(visiblePortalNav(e)).toContain("items");
  });
});
