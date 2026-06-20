import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveTwinViewerKind } from "@/lib/digital-twin/viewer-format";
import type { DesignSession, DesignVariant } from "./internal-types";

/**
 * Create a Design Studio session from an existing Digital Twin model.
 * Reference-not-copy: the twin's R2 storage_key is snapshotted onto the session;
 * no bytes move. A baseline "Original" variant is created as the starting point.
 */
export async function createSessionFromTwin(
  admin: SupabaseClient,
  args: { orgId: string; userId: string; twinModelId: string; projectId?: string | null; title?: string },
): Promise<{ session: DesignSession; baseVariant: DesignVariant }> {
  const { orgId, userId, twinModelId } = args;

  const { data: model, error: modelErr } = await admin
    .from("digital_twin_models")
    .select("id, title, model_format, storage_key, space_id, status")
    .eq("id", twinModelId)
    .single();
  if (modelErr || !model) throw new Error("Twin model not found");
  if (model.status !== "ready") throw new Error("Twin model is not ready");

  // Scope check: the model's space must belong to this org.
  const { data: space, error: spaceErr } = await admin
    .from("digital_twin_spaces")
    .select("org_id, project_id")
    .eq("id", model.space_id)
    .single();
  if (spaceErr || !space || space.org_id !== orgId) throw new Error("Twin model not accessible");

  const viewerKind = resolveTwinViewerKind(model.model_format, model.storage_key);
  if (viewerKind === "unsupported") throw new Error(`Format ${model.model_format} is not supported in Design Studio`);

  const { data: session, error: sessErr } = await admin
    .from("design_sessions")
    .insert({
      org_id: orgId,
      project_id: args.projectId ?? space.project_id ?? null,
      created_by: userId,
      title: args.title ?? model.title ?? "Design session",
      source_twin_model_id: model.id,
      source_storage_key: model.storage_key,
      source_format: model.model_format,
      source_viewer_kind: viewerKind,
    })
    .select("*")
    .single();
  if (sessErr || !session) throw new Error(sessErr?.message ?? "Failed to create session");

  const { data: base, error: varErr } = await admin
    .from("design_variants")
    .insert({
      org_id: orgId,
      session_id: session.id,
      label: "Original",
      tier: "base",
      status: "ready",
      model_format: model.model_format,
      preview_storage_key: model.storage_key,
    })
    .select("*")
    .single();
  if (varErr || !base) throw new Error(varErr?.message ?? "Failed to create base variant");

  await admin.from("design_sessions").update({ active_variant_id: base.id }).eq("id", session.id);

  return { session: { ...session, active_variant_id: base.id } as DesignSession, baseVariant: base as DesignVariant };
}
