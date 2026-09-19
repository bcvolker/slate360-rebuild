import { describe, expect, it } from "vitest";
import { loadPortfolioEvidence } from "./load-portfolio-evidence";

/**
 * Minimal chainable, thenable stand-in for the Supabase admin client. Every
 * query-builder method used by load-portfolio-evidence.ts (.select/.in/.is/
 * .neq/.eq) returns the same builder; awaiting it resolves to { data }.
 */
function chain(data: unknown[]) {
  const builder = {
    select: () => builder,
    in: () => builder,
    is: () => builder,
    neq: () => builder,
    eq: () => builder,
    then: (resolve: (value: { data: unknown[] }) => void) => resolve({ data }),
  };
  return builder;
}

type Tables = Record<string, unknown[]>;

function mockAdmin(tables: Tables) {
  return {
    from: (table: string) => chain(tables[table] ?? []),
  } as unknown as Parameters<typeof loadPortfolioEvidence>[0];
}

describe("loadPortfolioEvidence — drone is not a client-renderable representation", () => {
  it("does not add 'drone' merely because a drone_photo source asset exists", async () => {
    const admin = mockAdmin({
      digital_twin_captures: [
        { id: "cap-1", project_id: "p1", uploaded_at: "2026-01-01T00:00:00.000Z", created_at: "2026-01-01T00:00:00.000Z" },
      ],
      digital_twin_capture_assets: [
        { capture_id: "cap-1", asset_kind: "drone_photo", storage_key: "orgs/x/cap-1/drone.jpg" },
      ],
    });

    const result = await loadPortfolioEvidence(admin, ["p1"]);

    expect(result.p1.representations).not.toContain("drone");
  });

  it("does not add 'drone' for a drone_video source asset either", async () => {
    const admin = mockAdmin({
      digital_twin_captures: [
        { id: "cap-1", project_id: "p1", uploaded_at: "2026-01-01T00:00:00.000Z", created_at: "2026-01-01T00:00:00.000Z" },
      ],
      digital_twin_capture_assets: [
        { capture_id: "cap-1", asset_kind: "drone_video", storage_key: "orgs/x/cap-1/drone.mp4" },
      ],
    });

    const result = await loadPortfolioEvidence(admin, ["p1"]);

    expect(result.p1.representations).not.toContain("drone");
  });

  it("keeps a drone-only project's representations empty — the Explore CTA (VnextProjectOverview's hasRepresentations = representations.length > 0) would not render", async () => {
    const admin = mockAdmin({
      digital_twin_captures: [
        { id: "cap-1", project_id: "p1", uploaded_at: "2026-01-01T00:00:00.000Z", created_at: "2026-01-01T00:00:00.000Z" },
      ],
      digital_twin_capture_assets: [
        { capture_id: "cap-1", asset_kind: "drone_photo", storage_key: "orgs/x/cap-1/drone.jpg" },
        { capture_id: "cap-1", asset_kind: "drone_video", storage_key: "orgs/x/cap-1/drone.mp4" },
      ],
    });

    const result = await loadPortfolioEvidence(admin, ["p1"]);

    expect(result.p1.representations).toEqual([]);
    const hasRepresentations = result.p1.representations.length > 0;
    expect(hasRepresentations).toBe(false);
  });

  it("still documents a drone-only capture's timestamp — raw evidence is unaffected, only the representation flag is withheld", async () => {
    const admin = mockAdmin({
      digital_twin_captures: [
        { id: "cap-1", project_id: "p1", uploaded_at: "2026-03-05T00:00:00.000Z", created_at: "2026-03-05T00:00:00.000Z" },
      ],
      digital_twin_capture_assets: [
        { capture_id: "cap-1", asset_kind: "drone_photo", storage_key: "orgs/x/cap-1/drone.jpg" },
      ],
    });

    const result = await loadPortfolioEvidence(admin, ["p1"]);

    expect(result.p1.timestamps).toContain("2026-03-05T00:00:00.000Z");
    expect(result.p1.representations).toEqual([]);
  });

  it("still flags reality, geometry, 360, plan, and thermal normally alongside an unrelated drone asset", async () => {
    const admin = mockAdmin({
      digital_twin_spaces: [{ id: "space-1", project_id: "p1", updated_at: "2026-01-01T00:00:00.000Z" }],
      digital_twin_models: [
        { id: "model-1", space_id: "space-1", model_format: "spz", storage_key: "orgs/x/model.spz", preview_storage_key: "orgs/x/preview.jpg", status: "ready" },
        { id: "model-2", space_id: "space-1", model_format: "glb", storage_key: "orgs/x/model.glb", preview_storage_key: null, status: "ready" },
      ],
      digital_twin_captures: [
        { id: "cap-1", project_id: "p1", uploaded_at: "2026-01-02T00:00:00.000Z", created_at: "2026-01-02T00:00:00.000Z" },
      ],
      digital_twin_capture_assets: [
        { capture_id: "cap-1", asset_kind: "panorama_360", storage_key: "orgs/x/cap-1/pano.jpg" },
        { capture_id: "cap-1", asset_kind: "drone_photo", storage_key: "orgs/x/cap-1/drone.jpg" },
      ],
      site_walk_items: [
        { id: "item-1", project_id: "p1", item_type: "photo_360", s3_key: "orgs/x/item-1/pano.jpg", captured_at: "2026-01-02T12:00:00.000Z" },
      ],
      site_walk_plan_sheets: [
        { id: "sheet-1", project_id: "p1", thumbnail_s3_key: "orgs/x/plan-thumb.jpg", rasterized_key: null, image_s3_key: null },
      ],
      thermal_analysis_sessions: [{ id: "thermal-1", project_id: "p1", updated_at: "2026-01-03T00:00:00.000Z" }],
      thermal_analysis_share_tokens: [{ session_id: "thermal-1", is_revoked: false, expires_at: null, layer_config: null }],
      thermal_captures: [{ id: "tcap-1", session_id: "thermal-1", preview_path: "orgs/x/thermal/a.jpg", storage_path: null }],
    });

    const result = await loadPortfolioEvidence(admin, ["p1"]);

    expect(result.p1.representations).toEqual(
      expect.arrayContaining(["reality", "geometry", "360", "plan", "thermal"]),
    );
    expect(result.p1.representations).not.toContain("drone");
    // Hero URLs must use the vNext-scoped, project-access-contract routes, never the legacy
    // punchwalk/digital_twin standalone-app-gated, single-org routes.
    expect(result.p1.realityPreviewUrl).toBe("/api/vnext/projects/p1/twin-models/model-1/preview-image");
    expect(result.p1.planUrl).toBe("/api/vnext/projects/p1/plan-sheets/sheet-1/image");
    // The 360 flag/URL must come from the proven site_walk_items path, not the unserveable
    // digital_twin_capture_assets.panorama_360 row also present in this fixture.
    expect(result.p1.pano360Url).toBe("/api/vnext/projects/p1/items/item-1/image");
    for (const url of [result.p1.realityPreviewUrl, result.p1.planUrl, result.p1.pano360Url]) {
      expect(url).not.toContain("/api/site-walk/");
      expect(url).not.toContain("/api/digital-twin/models/");
    }
  });

  it("does NOT flag '360' merely because a digital_twin_capture_assets panorama_360 row exists — no serving route exists for that table", async () => {
    const admin = mockAdmin({
      digital_twin_captures: [
        { id: "cap-1", project_id: "p1", uploaded_at: "2026-01-01T00:00:00.000Z", created_at: "2026-01-01T00:00:00.000Z" },
      ],
      digital_twin_capture_assets: [
        { capture_id: "cap-1", asset_kind: "panorama_360", storage_key: "orgs/x/cap-1/pano.jpg" },
      ],
    });

    const result = await loadPortfolioEvidence(admin, ["p1"]);

    expect(result.p1.representations).not.toContain("360");
    expect(result.p1.pano360Url).toBeNull();
  });
});

describe("loadPortfolioEvidence — thermal availability matches Explore's actual renderability", () => {
  const SESSION_ROW = { id: "thermal-1", project_id: "p1", updated_at: "2026-01-03T00:00:00.000Z" };
  const CAPTURE_ROW = { id: "tcap-1", session_id: "thermal-1", preview_path: "orgs/x/thermal/a.jpg", storage_path: null };

  it("does not flag thermal when the only share is revoked", async () => {
    const admin = mockAdmin({
      thermal_analysis_sessions: [SESSION_ROW],
      thermal_analysis_share_tokens: [{ session_id: "thermal-1", is_revoked: true, expires_at: null, layer_config: null }],
      thermal_captures: [CAPTURE_ROW],
    });
    const result = await loadPortfolioEvidence(admin, ["p1"]);
    expect(result.p1.representations).not.toContain("thermal");
  });

  it("does not flag thermal when the only share is expired", async () => {
    const admin = mockAdmin({
      thermal_analysis_sessions: [SESSION_ROW],
      thermal_analysis_share_tokens: [
        { session_id: "thermal-1", is_revoked: false, expires_at: "2020-01-01T00:00:00.000Z", layer_config: null },
      ],
      thermal_captures: [CAPTURE_ROW],
    });
    const result = await loadPortfolioEvidence(admin, ["p1"]);
    expect(result.p1.representations).not.toContain("thermal");
  });

  it("does not flag thermal for a published share with zero captures — the drift this correction fixes", async () => {
    const admin = mockAdmin({
      thermal_analysis_sessions: [SESSION_ROW],
      thermal_analysis_share_tokens: [{ session_id: "thermal-1", is_revoked: false, expires_at: null, layer_config: null }],
      thermal_captures: [],
    });
    const result = await loadPortfolioEvidence(admin, ["p1"]);
    expect(result.p1.representations).not.toContain("thermal");
  });

  it("does not flag thermal when every capture is excluded by the share's layer_config", async () => {
    const admin = mockAdmin({
      thermal_analysis_sessions: [SESSION_ROW],
      thermal_analysis_share_tokens: [
        { session_id: "thermal-1", is_revoked: false, expires_at: null, layer_config: { capture_ids: ["not-this-one"] } },
      ],
      thermal_captures: [CAPTURE_ROW],
    });
    const result = await loadPortfolioEvidence(admin, ["p1"]);
    expect(result.p1.representations).not.toContain("thermal");
  });

  it("flags thermal for a published share with at least one viewable capture", async () => {
    const admin = mockAdmin({
      thermal_analysis_sessions: [SESSION_ROW],
      thermal_analysis_share_tokens: [{ session_id: "thermal-1", is_revoked: false, expires_at: null, layer_config: null }],
      thermal_captures: [CAPTURE_ROW],
    });
    const result = await loadPortfolioEvidence(admin, ["p1"]);
    expect(result.p1.representations).toContain("thermal");
  });
});
