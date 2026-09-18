import { describe, expect, it, vi } from "vitest";

const loadThermalShareViewerDataMock = vi.fn();
vi.mock("@/lib/thermal/load-share-viewer", () => ({
  loadThermalShareViewerData: (...args: unknown[]) => loadThermalShareViewerDataMock(...args),
}));

const { resolveThermalSourceData } = await import("./resolve-thermal-source");

function chain(data: unknown[]) {
  const builder = {
    select: () => builder,
    eq: () => builder,
    in: () => builder,
    is: () => builder,
    then: (resolve: (value: { data: unknown[] }) => void) => resolve({ data }),
  };
  return builder;
}

function mockAdmin(tables: Record<string, unknown[]>) {
  return { from: (table: string) => chain(tables[table] ?? []) } as unknown as Parameters<
    typeof resolveThermalSourceData
  >[0];
}

const SESSION = { id: "session-1", name: "North wall", updated_at: "2026-01-01T00:00:00.000Z" };

describe("resolveThermalSourceData", () => {
  it("returns null when no session exists for the project", async () => {
    const admin = mockAdmin({ thermal_analysis_sessions: [] });
    expect(await resolveThermalSourceData(admin, "p1")).toBeNull();
    expect(loadThermalShareViewerDataMock).not.toHaveBeenCalled();
  });

  it("returns null when a session exists but has no share token at all (never published)", async () => {
    const admin = mockAdmin({
      thermal_analysis_sessions: [SESSION],
      thermal_analysis_share_tokens: [],
    });
    expect(await resolveThermalSourceData(admin, "p1")).toBeNull();
  });

  it("returns null when the only share token is revoked", async () => {
    const admin = mockAdmin({
      thermal_analysis_sessions: [SESSION],
      thermal_analysis_share_tokens: [{ session_id: "session-1", is_revoked: true, expires_at: null }],
    });
    expect(await resolveThermalSourceData(admin, "p1")).toBeNull();
  });

  it("returns null when the only share token is expired, even though not revoked", async () => {
    const admin = mockAdmin({
      thermal_analysis_sessions: [SESSION],
      thermal_analysis_share_tokens: [
        { session_id: "session-1", is_revoked: false, expires_at: "2020-01-01T00:00:00.000Z" },
      ],
    });
    expect(await resolveThermalSourceData(admin, "p1")).toBeNull();
  });

  it("calls loadThermalShareViewerData directly with the session id — no public token is minted or exposed", async () => {
    loadThermalShareViewerDataMock.mockResolvedValueOnce({
      sessionId: "session-1",
      sessionName: "North wall",
      captures: [
        { id: "cap-1", filename: "a.jpg", previewUrl: "https://signed.example/a.jpg" },
        { id: "cap-2", filename: "b.jpg", previewUrl: null },
      ],
    });
    const admin = mockAdmin({
      thermal_analysis_sessions: [SESSION],
      thermal_analysis_share_tokens: [
        { session_id: "session-1", is_revoked: false, expires_at: null, branding_snapshot: { a: 1 }, layer_config: { b: 2 } },
      ],
    });

    const result = await resolveThermalSourceData(admin, "p1");

    expect(loadThermalShareViewerDataMock).toHaveBeenCalledWith("session-1", { a: 1 }, { b: 2 });
    expect(result).toEqual({
      kind: "thermal",
      sessionName: "North wall",
      captures: [{ id: "cap-1", imageUrl: "https://signed.example/a.jpg", label: "a.jpg" }],
    });
  });
});
