import { beforeEach, describe, expect, it, vi } from "vitest";

const loadThermalShareViewerDataMock = vi.fn();
vi.mock("@/lib/thermal/load-share-viewer", () => ({
  loadThermalShareViewerData: (...args: unknown[]) => loadThermalShareViewerDataMock(...args),
}));

beforeEach(() => {
  loadThermalShareViewerDataMock.mockClear();
});

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
// A client-portal publication for the exact session under test — required since P1-P3: a live
// Thermal Studio report share alone no longer counts as client-portal availability.
const PUBLISHED_SESSION_1 = [{ project_id: "p1", representation: "thermal", source_id: "session-1", revoked_at: null }];

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

  it("returns null when a live, viewable share exists but the session has no client-portal publication (P1-P3)", async () => {
    const admin = mockAdmin({
      thermal_analysis_sessions: [SESSION],
      thermal_analysis_share_tokens: [
        { session_id: "session-1", is_revoked: false, expires_at: null, layer_config: {} },
      ],
      thermal_captures: [{ id: "cap-1", session_id: "session-1", preview_path: "x.jpg", storage_path: null }],
      project_source_publications: [],
    });
    expect(await resolveThermalSourceData(admin, "p1")).toBeNull();
    expect(loadThermalShareViewerDataMock).not.toHaveBeenCalled();
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
      thermal_captures: [{ id: "cap-1", session_id: "session-1", preview_path: "x.jpg", storage_path: null }],
    });
    expect(await resolveThermalSourceData(admin, "p1")).toBeNull();
  });

  it("returns null when the share is published but the session has zero captures", async () => {
    const admin = mockAdmin({
      thermal_analysis_sessions: [SESSION],
      thermal_analysis_share_tokens: [
        { session_id: "session-1", is_revoked: false, expires_at: null, layer_config: {} },
      ],
      thermal_captures: [],
    });
    expect(await resolveThermalSourceData(admin, "p1")).toBeNull();
    expect(loadThermalShareViewerDataMock).not.toHaveBeenCalled();
  });

  it("returns null when every capture is excluded by the share's layer_config capture_ids", async () => {
    const admin = mockAdmin({
      thermal_analysis_sessions: [SESSION],
      thermal_analysis_share_tokens: [
        { session_id: "session-1", is_revoked: false, expires_at: null, layer_config: { capture_ids: ["not-this-one"] } },
      ],
      thermal_captures: [{ id: "cap-1", session_id: "session-1", preview_path: "x.jpg", storage_path: null }],
    });
    expect(await resolveThermalSourceData(admin, "p1")).toBeNull();
    expect(loadThermalShareViewerDataMock).not.toHaveBeenCalled();
  });

  it("returns null when the resolved viewer data ends up with zero signable previews, even though the predicate said available", async () => {
    loadThermalShareViewerDataMock.mockResolvedValueOnce({
      sessionId: "session-1",
      sessionName: "North wall",
      captures: [{ id: "cap-1", filename: "a.jpg", previewUrl: null }],
    });
    const admin = mockAdmin({
      thermal_analysis_sessions: [SESSION],
      thermal_analysis_share_tokens: [
        { session_id: "session-1", is_revoked: false, expires_at: null, layer_config: {} },
      ],
      thermal_captures: [{ id: "cap-1", session_id: "session-1", preview_path: "x.jpg", storage_path: null }],
      project_source_publications: PUBLISHED_SESSION_1,
    });
    expect(await resolveThermalSourceData(admin, "p1")).toBeNull();
  });

  it("A: selects the qualifying share (not merely the first published one) when an earlier share's own layer_config excludes every capture, and pairs its branding/layer_config from the SAME row", async () => {
    loadThermalShareViewerDataMock.mockResolvedValueOnce({
      sessionId: "session-1",
      sessionName: "North wall",
      captures: [{ id: "cap-1", filename: "a.jpg", previewUrl: "https://signed.example/a.jpg" }],
    });
    const admin = mockAdmin({
      thermal_analysis_sessions: [SESSION],
      thermal_analysis_share_tokens: [
        {
          id: "share-A",
          session_id: "session-1",
          is_revoked: false,
          expires_at: null,
          branding_snapshot: { brand: "A" },
          layer_config: { capture_ids: ["not-cap-1"] },
        },
        {
          id: "share-B",
          session_id: "session-1",
          is_revoked: false,
          expires_at: null,
          branding_snapshot: { brand: "B" },
          layer_config: { capture_ids: ["cap-1"] },
        },
      ],
      thermal_captures: [{ id: "cap-1", session_id: "session-1", preview_path: "x.jpg", storage_path: null }],
      project_source_publications: PUBLISHED_SESSION_1,
    });

    const result = await resolveThermalSourceData(admin, "p1");

    expect(loadThermalShareViewerDataMock).toHaveBeenCalledWith(
      "session-1",
      { brand: "B" },
      { capture_ids: ["cap-1"] },
    );
    expect(result).toEqual({
      kind: "thermal",
      sessionName: "North wall",
      captures: [{ id: "cap-1", imageUrl: "https://signed.example/a.jpg", label: "a.jpg" }],
    });
  });

  it("B: returns null when multiple published shares exist but none exposes a usable capture", async () => {
    const admin = mockAdmin({
      thermal_analysis_sessions: [SESSION],
      thermal_analysis_share_tokens: [
        { id: "share-A", session_id: "session-1", is_revoked: false, expires_at: null, layer_config: { capture_ids: ["nope"] } },
        { id: "share-B", session_id: "session-1", is_revoked: false, expires_at: null, layer_config: { capture_ids: ["also-nope"] } },
      ],
      thermal_captures: [{ id: "cap-1", session_id: "session-1", preview_path: "x.jpg", storage_path: null }],
    });
    expect(await resolveThermalSourceData(admin, "p1")).toBeNull();
    expect(loadThermalShareViewerDataMock).not.toHaveBeenCalled();
  });

  it("C: ignores an expired/revoked share that would otherwise qualify, in favor of a valid one", async () => {
    loadThermalShareViewerDataMock.mockResolvedValueOnce({
      sessionId: "session-1",
      sessionName: "North wall",
      captures: [{ id: "cap-1", filename: "a.jpg", previewUrl: "https://signed.example/a.jpg" }],
    });
    const admin = mockAdmin({
      thermal_analysis_sessions: [SESSION],
      thermal_analysis_share_tokens: [
        {
          id: "share-expired",
          session_id: "session-1",
          is_revoked: false,
          expires_at: "2020-01-01T00:00:00.000Z",
          branding_snapshot: { brand: "expired" },
          layer_config: {},
        },
        {
          id: "share-valid",
          session_id: "session-1",
          is_revoked: false,
          expires_at: null,
          branding_snapshot: { brand: "valid" },
          layer_config: {},
        },
      ],
      thermal_captures: [{ id: "cap-1", session_id: "session-1", preview_path: "x.jpg", storage_path: null }],
      project_source_publications: PUBLISHED_SESSION_1,
    });

    const result = await resolveThermalSourceData(admin, "p1");

    expect(loadThermalShareViewerDataMock).toHaveBeenCalledWith("session-1", { brand: "valid" }, {});
    expect(result).not.toBeNull();
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
      thermal_captures: [{ id: "cap-1", session_id: "session-1", preview_path: "x.jpg", storage_path: null }],
      project_source_publications: PUBLISHED_SESSION_1,
    });

    const result = await resolveThermalSourceData(admin, "p1");

    expect(loadThermalShareViewerDataMock).toHaveBeenCalledWith("session-1", { a: 1 }, { b: 2 });
    expect(result).toEqual({
      kind: "thermal",
      sessionName: "North wall",
      captures: [{ id: "cap-1", imageUrl: "https://signed.example/a.jpg", label: "a.jpg" }],
    });
  });

  it("opens the requested thermal session and does not substitute a newer one", async () => {
    loadThermalShareViewerDataMock.mockResolvedValueOnce({
      sessionId: "session-1",
      sessionName: "North wall",
      captures: [{ id: "cap-1", filename: "a.jpg", previewUrl: "https://signed.example/a.jpg" }],
    });
    const admin = mockAdmin({
      thermal_analysis_sessions: [SESSION, { id: "session-2", name: "Newer", updated_at: "2026-06-01T00:00:00.000Z" }],
      thermal_analysis_share_tokens: [
        { session_id: "session-1", is_revoked: false, expires_at: null, layer_config: {} },
        { session_id: "session-2", is_revoked: false, expires_at: null, layer_config: {} },
      ],
      thermal_captures: [
        { id: "cap-1", session_id: "session-1", preview_path: "x.jpg", storage_path: null },
        { id: "cap-2", session_id: "session-2", preview_path: "y.jpg", storage_path: null },
      ],
      project_source_publications: [
        ...PUBLISHED_SESSION_1,
        { project_id: "p1", representation: "thermal", source_id: "session-2", revoked_at: null },
      ],
    });
    const exact = await resolveThermalSourceData(admin, "p1", "session-1");
    expect(exact && "sessionName" in exact ? exact.sessionName : null).toBe("North wall");
    expect(await resolveThermalSourceData(admin, "p1", "missing")).toBeNull();
  });
});
