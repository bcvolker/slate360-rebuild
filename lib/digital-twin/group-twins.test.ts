import { describe, expect, it } from "vitest";
import { groupTwinsByProject, UNFILED_LABEL } from "./group-twins";
import { QUICK_SCAN_POOL_NAME, formatVisitTitle } from "./quick-scan-title";
import type { HubTwin } from "@/lib/types/digital-twin-hub";

const twin = (id: string, projectId: string | null, projectName: string | null): HubTwin => ({
  id, title: id, status: "draft", statusChip: "Draft" as HubTwin["statusChip"], projectId, projectName, updatedAt: "2026-09-06T00:00:00Z", readyModels: 0,
});

describe("groupTwinsByProject", () => {
  it("files spaces under their job and keeps job order of first appearance", () => {
    const groups = groupTwinsByProject([twin("a", "p1", "AOB205"), twin("b", "p2", "Gammage"), twin("c", "p1", "AOB205")]);
    expect(groups.map((g) => [g.projectName, g.twins.length])).toEqual([["AOB205", 2], ["Gammage", 1]]);
    expect(groups.every((g) => g.filed)).toBe(true);
  });

  it("shows the Quick Scans pool as Unfiled, after real jobs", () => {
    const groups = groupTwinsByProject([twin("q", "pool", QUICK_SCAN_POOL_NAME), twin("a", "p1", "AOB205"), twin("n", null, null)]);
    expect(groups[0].projectName).toBe("AOB205");
    expect(groups[1].projectName).toBe(UNFILED_LABEL);
    expect(groups[1].filed).toBe(false);
    expect(groups[1].twins.map((t) => t.id)).toEqual(["q", "n"]);
  });
});

describe("formatVisitTitle", () => {
  it("labels a walk by date and time, not by job", () => {
    expect(formatVisitTitle(new Date(2026, 8, 6, 17, 56))).toBe("Sep 6 · 5:56 PM");
  });
});
