import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/digital-twin/resolve-model-url", () => ({
  resolveDigitalTwinModelUrl: vi.fn(async (storageKey: string) => `https://signed.example/${storageKey}`),
}));

const { resolveTwinSourceData } = await import("./resolve-twin-source");

function chain(data: unknown[]) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    is: () => builder,
    neq: () => builder,
    then: (resolve: (value: { data: unknown[] }) => void) => resolve({ data }),
  };
  return builder;
}

function mockAdmin(tables: Record<string, unknown[]>) {
  return { from: (table: string) => chain(tables[table] ?? []) } as unknown as Parameters<
    typeof resolveTwinSourceData
  >[0];
}

const SPACE = { id: "space-1", updated_at: "2026-01-01T00:00:00.000Z" };

describe("resolveTwinSourceData", () => {
  it("resolves a splat model to the vNext-scoped project proxy URL, not the legacy org-only route", async () => {
    const admin = mockAdmin({
      digital_twin_spaces: [SPACE],
      digital_twin_models: [
        { id: "model-1", model_format: "spz", storage_key: "orgs/x/model.spz", title: "Front yard", updated_at: "2026-01-02T00:00:00.000Z" },
      ],
    });

    const result = await resolveTwinSourceData(admin, "p1", "splat", "Reality");

    expect(result).toEqual({
      kind: "reality",
      viewerKind: "splat",
      modelUrl: "/api/vnext/projects/p1/twin-models/model-1/splat",
      modelTitle: "Front yard",
    });
  });

  it("resolves a glb model to a presigned URL for geometry", async () => {
    const admin = mockAdmin({
      digital_twin_spaces: [SPACE],
      digital_twin_models: [
        { id: "model-2", model_format: "glb", storage_key: "orgs/x/model.glb", title: null, updated_at: "2026-01-02T00:00:00.000Z" },
      ],
    });

    const result = await resolveTwinSourceData(admin, "p1", "model", "Geometry");

    expect(result).toEqual({
      kind: "geometry",
      viewerKind: "model",
      modelUrl: "https://signed.example/orgs/x/model.glb",
      modelTitle: "Geometry",
    });
  });

  it("returns null when no space exists for the project", async () => {
    const admin = mockAdmin({ digital_twin_spaces: [] });
    expect(await resolveTwinSourceData(admin, "p1", "splat", "Reality")).toBeNull();
  });

  it("returns null when a space exists but has no model of the requested kind (e.g. only a splat exists, geometry was requested)", async () => {
    const admin = mockAdmin({
      digital_twin_spaces: [SPACE],
      digital_twin_models: [
        { id: "model-1", model_format: "spz", storage_key: "orgs/x/model.spz", title: "Front yard", updated_at: "2026-01-02T00:00:00.000Z" },
      ],
    });
    expect(await resolveTwinSourceData(admin, "p1", "model", "Geometry")).toBeNull();
  });

  it("picks the most recently updated model when more than one of the requested kind exists", async () => {
    const admin = mockAdmin({
      digital_twin_spaces: [SPACE],
      digital_twin_models: [
        { id: "older", model_format: "spz", storage_key: "orgs/x/older.spz", title: "Older", updated_at: "2026-01-01T00:00:00.000Z" },
        { id: "newer", model_format: "spz", storage_key: "orgs/x/newer.spz", title: "Newer", updated_at: "2026-06-01T00:00:00.000Z" },
      ],
    });
    const result = await resolveTwinSourceData(admin, "p1", "splat", "Reality");
    expect(result?.modelUrl).toBe("/api/vnext/projects/p1/twin-models/newer/splat");
  });

  it("opens the requested model and does not fall back to a newer one", async () => {
    const models = [
      { id: "older", space_id: "space-1", status: "ready", model_format: "spz", storage_key: "orgs/x/older.spz", title: "Older", updated_at: "2026-01-01T00:00:00.000Z" },
      { id: "newer", space_id: "space-1", status: "ready", model_format: "spz", storage_key: "orgs/x/newer.spz", title: "Newer", updated_at: "2026-06-01T00:00:00.000Z" },
    ];
    const older = await resolveTwinSourceData(
      filteringAdmin({ digital_twin_spaces: [{ ...SPACE, project_id: "p1", status: "active" }], digital_twin_models: models }),
      "p1",
      "splat",
      "Reality",
      "older",
    );
    const missing = await resolveTwinSourceData(filteringAdmin({ digital_twin_spaces: [SPACE], digital_twin_models: models }), "p1", "splat", "Reality", "missing");
    expect(older?.modelUrl).toBe("/api/vnext/projects/p1/twin-models/older/splat");
    expect(missing).toBeNull();
  });
});

function filteringAdmin(tables: Record<string, Record<string, unknown>[]>) {
  return {
    from: (table: string) => {
      const filters: Array<(row: Record<string, unknown>) => boolean> = [];
      const builder = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          filters.push((row) => row[column] === value);
          return builder;
        },
        in: (column: string, values: unknown[]) => {
          filters.push((row) => values.includes(row[column]));
          return builder;
        },
        is: () => builder,
        neq: (column: string, value: unknown) => {
          filters.push((row) => row[column] !== value);
          return builder;
        },
        then: (resolve: (value: { data: Record<string, unknown>[] }) => void) =>
          resolve({ data: (tables[table] ?? []).filter((row) => filters.every((fn) => fn(row))) }),
      };
      return builder;
    },
  } as unknown as Parameters<typeof resolveTwinSourceData>[0];
}
