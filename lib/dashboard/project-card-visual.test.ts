import { describe, expect, it } from "vitest";

import { isFixtureProject, projectDisplayName, projectThumbUrl } from "./project-card-visual";

describe("project card visual", () => {
  it("classifies quick-scan and unnamed fixtures without deleting them", () => {
    expect(isFixtureProject("Quick Scans", { twin_quick_scan_pool: true })).toBe(true);
    expect(isFixtureProject("360 Library", { system_project: "360_library" })).toBe(true);
    expect(isFixtureProject("Test", {})).toBe(true);
    expect(isFixtureProject("AOB205 — ASU", {})).toBe(false);
  });

  it("prefers approved hero over an empty thumbnail", () => {
    expect(projectThumbUrl({ thumbnailUrl: null, heroUrl: "/hero.jpg" })).toBe("/hero.jpg");
    expect(projectDisplayName("Quick Scans")).toBe("");
    expect(projectDisplayName("AOB205 — ASU")).toBe("AOB205 — ASU");
  });
});
