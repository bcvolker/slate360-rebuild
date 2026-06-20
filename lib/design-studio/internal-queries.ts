import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { DesignSession } from "./internal-types";

/** List a CEO's Design Studio sessions, newest first. Server-only. */
export async function listDesignSessions(orgId: string): Promise<DesignSession[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("design_sessions")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DesignSession[];
}

export interface ImportableTwin {
  id: string;
  title: string;
  model_format: string;
  storage_key: string;
  project_id: string | null;
}

/** List ready Digital Twin models in the org that can be imported into a session. */
export async function listImportableTwins(orgId: string): Promise<ImportableTwin[]> {
  const supabase = createAdminClient();
  const { data: spaces, error: spaceErr } = await supabase
    .from("digital_twin_spaces")
    .select("id, project_id")
    .eq("org_id", orgId);
  if (spaceErr) throw spaceErr;
  const spaceIds = (spaces ?? []).map((s) => s.id);
  if (spaceIds.length === 0) return [];
  const projectBySpace = new Map((spaces ?? []).map((s) => [s.id, s.project_id as string | null]));

  const { data: models, error: modelErr } = await supabase
    .from("digital_twin_models")
    .select("id, title, model_format, storage_key, space_id, status")
    .in("space_id", spaceIds)
    .eq("status", "ready")
    .order("created_at", { ascending: false });
  if (modelErr) throw modelErr;

  return (models ?? [])
    .filter((m) => ["spz", "glb", "gltf", "usdz"].includes(m.model_format))
    .map((m) => ({
      id: m.id,
      title: m.title,
      model_format: m.model_format,
      storage_key: m.storage_key,
      project_id: projectBySpace.get(m.space_id) ?? null,
    }));
}
