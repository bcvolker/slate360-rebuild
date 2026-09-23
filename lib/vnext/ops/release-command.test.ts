import { describe, expect, it } from "vitest";
import { applyReleaseAction, type ReleaseAction } from "./release-command";

type Representation = "reality" | "geometry" | "pano360" | "plans" | "thermal";

function releaseAdmin(options: {
  representation: Representation;
  belongs?: boolean;
  included?: boolean;
  decision?: "approved" | "rejected" | null;
  published?: boolean;
}) {
  const calls: string[] = [];
  const belongs = options.belongs !== false;
  const included = options.included !== false;
  const admin = {
    from(table: string) {
      const builder: Record<string, unknown> = {};
      const self = () => builder;
      builder.select = self;
      builder.eq = self;
      builder.is = self;
      builder.in = self;
      builder.limit = self;
      builder.upsert = async () => {
        calls.push(`upsert:${table}`);
        return { error: null };
      };
      builder.insert = async () => {
        calls.push(`insert:${table}`);
        return { error: null };
      };
      builder.update = () => {
        calls.push(`update:${table}`);
        return builder;
      };
      builder.maybeSingle = async () => {
        if (!belongs && table !== "project_source_reviews" && table !== "project_source_publications") return { data: null };
        if (table === "digital_twin_models") {
          const mesh = options.representation === "geometry";
          return { data: { id: "source", model_format: mesh ? "glb" : "spz", storage_key: mesh ? "a.glb" : "a.spz" } };
        }
        if (table === "site_walk_items") return { data: { s3_key: "pano.jpg" } };
        if (table === "site_walk_plan_sheets") return { data: { thumbnail_s3_key: "sheet.jpg", rasterized_key: null, image_s3_key: null } };
        if (table === "thermal_analysis_sessions") return { data: { org_id: "org", name: "North", branding_config: {}, metadata: {} } };
        if (table === "project_source_reviews") return { data: options.decision ? { decision: options.decision } : null };
        if (table === "project_source_publications") return { data: options.published ? { id: "pub" } : null };
        return { data: null };
      };
      builder.then = (resolve: (value: { data: unknown; error: null }) => void) => {
        if (table === "project_client_capabilities") {
          const ids = ["reality", "geometry", "pano360", "plans", "thermal", "items", "documents", "history", "compare"];
          resolve({
            data: ids.map((id) => ({ project_id: "p1", capability_id: id, included: included && id === options.representation })),
            error: null,
          });
          return;
        }
        if (table === "thermal_captures") {
          resolve({ data: belongs ? [{ preview_path: "preview.jpg", storage_path: null }] : [], error: null });
          return;
        }
        if (table === "thermal_analysis_share_tokens") {
          resolve({ data: options.published ? [{ id: "token" }] : [], error: null });
          return;
        }
        resolve({ data: [], error: null });
      };
      return builder;
    },
    rpc(name: string, args: { p_representation: string; p_source_id: string }) {
      calls.push(`rpc:${name}:${args.p_representation}:${args.p_source_id}`);
      return Promise.resolve({ error: null });
    },
  };
  return { admin, calls };
}

function publish(representation: Representation, sourceId: string, options: Parameters<typeof releaseAdmin>[0]) {
  const script = releaseAdmin(options);
  return applyReleaseAction(script.admin, {
    projectId: "p1",
    representation,
    sourceId,
    action: "publish",
    actorId: "owner",
  }).then((result) => ({ result, calls: script.calls }));
}

describe("release command", () => {
  it("refuses to publish a source that has not been approved", async () => {
    const unreviewed = await publish("reality", "model-b", { representation: "reality", decision: null });
    const rejected = await publish("reality", "model-b", { representation: "reality", decision: "rejected" });
    expect(unreviewed.result).toMatchObject({ ok: false, status: 409 });
    expect(rejected.result).toMatchObject({ ok: false, status: 409 });
    expect(unreviewed.calls.some((call) => call.startsWith("rpc:"))).toBe(false);
    expect(rejected.calls.some((call) => call.startsWith("rpc:"))).toBe(false);
  });

  it("publishes an approved included source without revoking another source", async () => {
    for (const representation of ["reality", "plans", "pano360"] as const) {
      const sourceId = representation === "reality" ? "model-b" : representation === "plans" ? "sheet-b" : "station-2";
      const { result, calls } = await publish(representation, sourceId, { representation, decision: "approved" });
      expect(result).toEqual({ ok: true });
      expect(calls).toContain(`rpc:publish_project_source:${representation}:${sourceId}`);
      expect(calls.some((call) => call.startsWith("update:"))).toBe(false);
    }
  });

  it("refuses to publish a service that is not included", async () => {
    const { result, calls } = await publish("reality", "model-r", { representation: "reality", decision: "approved", included: false });
    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(calls.some((call) => call.startsWith("rpc:"))).toBe(false);
  });

  it("does not publish a source from another project", async () => {
    const { result } = await publish("reality", "other", { representation: "reality", belongs: false, decision: "approved" });
    expect(result).toMatchObject({ ok: false, status: 404 });
  });

  it("unpublishes one source and leaves its approval in place", async () => {
    const script = releaseAdmin({ representation: "reality", decision: "approved", published: true });
    const result = await applyReleaseAction(script.admin, {
      projectId: "p1",
      representation: "reality",
      sourceId: "model-a",
      action: "revoke" satisfies ReleaseAction,
      actorId: "owner",
    });
    expect(result).toEqual({ ok: true });
    expect(script.calls).toContain("rpc:revoke_project_source:reality:model-a");
    expect(script.calls.some((call) => call.startsWith("upsert:"))).toBe(false);
  });

  it("refuses to reject a source that is still published", async () => {
    const script = releaseAdmin({ representation: "reality", published: true, decision: "approved" });
    const result = await applyReleaseAction(script.admin, {
      projectId: "p1",
      representation: "reality",
      sourceId: "model-a",
      action: "reject",
      actorId: "owner",
    });
    expect(result).toMatchObject({ ok: false, status: 409 });
    expect(script.calls.some((call) => call.startsWith("upsert:"))).toBe(false);
  });

  it("requires an included approved thermal session before creating a share", async () => {
    const unreviewed = await publish("thermal", "session-1", { representation: "thermal", decision: null });
    const hidden = await publish("thermal", "session-1", { representation: "thermal", decision: "approved", included: false });
    const ready = await publish("thermal", "session-1", { representation: "thermal", decision: "approved" });
    expect(unreviewed.result).toMatchObject({ ok: false, status: 409 });
    expect(hidden.result).toMatchObject({ ok: false, status: 409 });
    expect(ready.result).toEqual({ ok: true });
    expect(ready.calls).toContain("insert:thermal_analysis_share_tokens");
  });
});
