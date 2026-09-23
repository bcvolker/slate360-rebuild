import "server-only";

import { randomBytes } from "crypto";
import { resolveTwinViewerKind } from "@/lib/digital-twin/viewer-format";
import { planSheetHasImage } from "@/lib/vnext/explore/resolve-plan-source";
import { isReleaseRepresentation, type ReleaseRepresentation, type ReviewDecision } from "@/lib/vnext/release/release-rules";

type Admin = any;

export type ReleaseAction = "approve" | "reject" | "publish" | "revoke";

export function parseReleaseAction(value: unknown): ReleaseAction | null {
  return value === "approve" || value === "reject" || value === "publish" || value === "revoke" ? value : null;
}

export async function sourceBelongsToProject(
  admin: Admin,
  projectId: string,
  representation: ReleaseRepresentation,
  sourceId: string,
): Promise<boolean> {
  if (representation === "reality" || representation === "geometry") {
    const { data } = await admin.from("digital_twin_models").select("id, model_format, storage_key, status, digital_twin_spaces!inner(project_id)").eq("id", sourceId).eq("status", "ready").is("deleted_at", null).eq("digital_twin_spaces.project_id", projectId).maybeSingle();
    if (!data) return false;
    const kind = resolveTwinViewerKind(String(data.model_format ?? ""), String(data.storage_key ?? ""));
    return representation === "reality" ? kind === "splat" : kind === "model";
  }
  if (representation === "pano360") {
    const { data } = await admin.from("site_walk_items").select("id, s3_key").eq("id", sourceId).eq("project_id", projectId).eq("item_type", "photo_360").is("deleted_at", null).maybeSingle();
    return Boolean(data?.s3_key && String(data.s3_key).trim());
  }
  if (representation === "plans") {
    const { data } = await admin.from("site_walk_plan_sheets").select("id, thumbnail_s3_key, rasterized_key, image_s3_key").eq("id", sourceId).eq("project_id", projectId).maybeSingle();
    return Boolean(data && planSheetHasImage(data));
  }
  const { data } = await admin.from("thermal_analysis_sessions").select("id").eq("id", sourceId).eq("project_id", projectId).is("deleted_at", null).maybeSingle();
  if (!data) return false;
  const captures = await admin.from("thermal_captures").select("id, preview_path, storage_path").eq("session_id", sourceId).is("deleted_at", null);
  return Array.isArray(captures.data) && captures.data.some((row: { preview_path?: string | null; storage_path?: string | null }) => row.preview_path || row.storage_path);
}

export async function applyReleaseAction(
  admin: Admin,
  input: { projectId: string; representation: string; sourceId: string; action: ReleaseAction; actorId: string; note?: string | null; needsRecapture?: boolean },
): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  if (!isReleaseRepresentation(input.representation)) return { ok: false, status: 400, error: "Unknown representation" };
  const belongs = await sourceBelongsToProject(admin, input.projectId, input.representation, input.sourceId);
  if (!belongs) return { ok: false, status: 404, error: "Source not found" };
  if (input.action === "approve" || input.action === "reject") {
    const decision: ReviewDecision = input.action === "approve" ? "approved" : "rejected";
    const note = input.note?.trim() ? input.note.trim().slice(0, 500) : null;
    const { error } = await admin.from("project_source_reviews").upsert({
      project_id: input.projectId,
      representation: input.representation,
      source_id: input.sourceId,
      decision,
      note,
      needs_recapture: input.needsRecapture === true,
      reviewed_at: new Date().toISOString(),
      reviewed_by: input.actorId,
    }, { onConflict: "project_id,representation,source_id" });
    return error ? { ok: false, status: 500, error: "Review could not be saved" } : { ok: true };
  }
  if (input.representation === "thermal") return input.action === "publish" ? publishThermal(admin, input) : revokeThermal(admin, input.sourceId);
  const rpc = input.action === "publish" ? "publish_project_source" : "revoke_project_source";
  const { error } = await admin.rpc(rpc, {
    p_project_id: input.projectId,
    p_representation: input.representation,
    p_source_id: input.sourceId,
    p_actor: input.actorId,
  });
  return error ? { ok: false, status: 500, error: "Publication could not be saved" } : { ok: true };
}

async function publishThermal(admin: Admin, input: { sourceId: string; actorId: string }): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const existing = await admin.from("thermal_analysis_share_tokens").select("id").eq("session_id", input.sourceId).eq("is_revoked", false).is("expires_at", null).limit(1);
  if (Array.isArray(existing.data) && existing.data.length > 0) return { ok: true };
  const session = await admin.from("thermal_analysis_sessions").select("org_id, name, branding_config, metadata").eq("id", input.sourceId).maybeSingle();
  const meta = (session.data?.metadata ?? {}) as Record<string, unknown>;
  const { error } = await admin.from("thermal_analysis_share_tokens").insert({
    token: randomBytes(24).toString("base64url"),
    org_id: session.data?.org_id ?? null,
    session_id: input.sourceId,
    created_by: input.actorId,
    role: "view",
    label: session.data?.name ?? "Thermal",
    expires_at: null,
    is_revoked: false,
    layer_config: { linked_space_id: typeof meta.linked_space_id === "string" ? meta.linked_space_id : null },
    branding_snapshot: session.data?.branding_config ?? {},
  });
  return error ? { ok: false, status: 500, error: "Thermal could not be published" } : { ok: true };
}

async function revokeThermal(admin: Admin, sessionId: string): Promise<{ ok: true } | { ok: false; status: number; error: string }> {
  const { error } = await admin.from("thermal_analysis_share_tokens").update({ is_revoked: true }).eq("session_id", sessionId).eq("is_revoked", false);
  return error ? { ok: false, status: 500, error: "Thermal could not be revoked" } : { ok: true };
}
