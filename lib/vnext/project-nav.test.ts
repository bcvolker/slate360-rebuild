import { describe, expect, it } from "vitest";
import { isVnextNavActive } from "./nav";
import { vnextProjectNavItems } from "./project-nav";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const BASE = `/vnext/projects/${PROJECT_ID}`;

describe("vnextProjectNavItems", () => {
  const items = vnextProjectNavItems(PROJECT_ID);

  it("returns the five canonical project destinations in order", () => {
    expect(items.map((item) => item.label)).toEqual([
      "Overview",
      "Explore",
      "Items",
      "Documents",
      "History",
    ]);
    expect(items.map((item) => item.href)).toEqual([
      BASE,
      `${BASE}/explore`,
      `${BASE}/items`,
      `${BASE}/documents`,
      `${BASE}/history`,
    ]);
  });

  it("marks only Overview as exact-match", () => {
    const overview = items.find((item) => item.label === "Overview");
    expect(overview?.exact).toBe(true);
    expect(items.filter((item) => item.exact)).toHaveLength(1);
  });

  it("does not light up Overview when a sub-route is active", () => {
    const overview = items.find((item) => item.label === "Overview")!;
    expect(isVnextNavActive(BASE, overview)).toBe(true);
    expect(isVnextNavActive(`${BASE}/explore`, overview)).toBe(false);
  });

  it("marks Explore active on its own route and nested paths", () => {
    const explore = items.find((item) => item.label === "Explore")!;
    expect(isVnextNavActive(`${BASE}/explore`, explore)).toBe(true);
    expect(isVnextNavActive(`${BASE}/explore/anything`, explore)).toBe(true);
    expect(isVnextNavActive(BASE, explore)).toBe(false);
  });
});
