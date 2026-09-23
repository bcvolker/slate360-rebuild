import { describe, expect, it } from "vitest";
import { loadPlanSources, resolvePlanSourceData } from "./resolve-plan-source";

function chain(data: unknown[]) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    order: () => builder,
    limit: () => builder,
    then: (resolve: (value: { data: unknown[] }) => void) => resolve({ data }),
  };
  return builder;
}

function mockAdmin(sheets: unknown[], published = true) {
  return {
    from: (table: string) =>
      chain(
        table === "project_source_publications"
          ? published
            ? sheets.map((sheet) => ({
                project_id: "p1",
                representation: "plans",
                source_id: (sheet as { id: string }).id,
                revoked_at: null,
              }))
            : []
          : sheets,
      ),
  } as unknown as Parameters<typeof loadPlanSources>[0];
}

describe("loadPlanSources", () => {
  it("excludes sheets with no usable image key", async () => {
    const admin = mockAdmin([
      { id: "s1", sheet_name: "A1.0", sheet_number: 1, thumbnail_s3_key: null, rasterized_key: null, image_s3_key: null, updated_at: null },
      { id: "s2", sheet_name: "A1.1", sheet_number: 2, thumbnail_s3_key: "orgs/x/a11.jpg", rasterized_key: null, image_s3_key: null, updated_at: "2026-09-01T00:00:00.000Z" },
    ]);
    const sources = await loadPlanSources(admin, "p1");
    expect(sources).toEqual([{ id: "s2", label: "A1.1", dateLabel: "Sep 1, 2026" }]);
  });

  it("falls back to 'Sheet <number>' when sheet_name is missing", async () => {
    const admin = mockAdmin([
      { id: "s1", sheet_name: null, sheet_number: 3, thumbnail_s3_key: "orgs/x/a.jpg", rasterized_key: null, image_s3_key: null, updated_at: null },
    ]);
    const sources = await loadPlanSources(admin, "p1");
    expect(sources[0]?.label).toBe("Sheet 3");
  });
});

describe("resolvePlanSourceData", () => {
  it("builds the vNext-scoped project image URL, not the legacy punchwalk-gated route", async () => {
    const admin = mockAdmin([
      { id: "sheet-1", sheet_name: "A1.0", sheet_number: 1, thumbnail_s3_key: "orgs/x/a1.jpg", rasterized_key: null, image_s3_key: null },
    ]);
    const result = await resolvePlanSourceData(admin, "p1", "sheet-1");
    expect(result).toEqual({
      sourceId: "sheet-1",
      data: { kind: "plan", imageUrl: "/api/vnext/projects/p1/plan-sheets/sheet-1/image", sheetName: "A1.0" },
    });
  });

  it("does not open a processed sheet that has not been published", async () => {
    const admin = mockAdmin(
      [{ id: "sheet-1", sheet_name: "A1.0", sheet_number: 1, thumbnail_s3_key: "orgs/x/a1.jpg", rasterized_key: null, image_s3_key: null }],
      false,
    );
    expect(await resolvePlanSourceData(admin, "p1", "sheet-1")).toBeNull();
    expect(await loadPlanSources(admin, "p1")).toEqual([]);
  });

  it("returns null when the only matching sheet has no image key", async () => {
    const admin = mockAdmin([
      { id: "sheet-1", sheet_name: "A1.0", sheet_number: 1, thumbnail_s3_key: null, rasterized_key: null, image_s3_key: null },
    ]);
    const result = await resolvePlanSourceData(admin, "p1", "sheet-1");
    expect(result).toBeNull();
  });
});
