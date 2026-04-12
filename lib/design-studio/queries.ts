/** Design Studio query helpers — all require an admin (service-role) Supabase client. */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProjectModel, ModelFile } from "@/lib/types/design-studio";

interface OrgScope {
  orgId: string;
}

// ─── Models ───────────────────────────────────────────────────

export async function getModels(
  supabase: SupabaseClient,
  projectId: string,
  { orgId }: OrgScope,
) {
  const { data, error } = await supabase
    .from("project_models")
    .select("*")
    .eq("org_id", orgId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ProjectModel[];
}

export async function getModelById(
  supabase: SupabaseClient,
  modelId: string,
  { orgId }: OrgScope,
) {
  const { data, error } = await supabase
    .from("project_models")
    .select("*")
    .eq("id", modelId)
    .eq("org_id", orgId)
    .single();
  if (error) throw error;
  return data as ProjectModel;
}

export async function createModel(
  supabase: SupabaseClient,
  fields: {
    orgId: string;
    projectId: string;
    createdBy: string;
    title: string;
    description?: string;
    modelType?: string;
  },
) {
  const { data, error } = await supabase
    .from("project_models")
    .insert({
      org_id: fields.orgId,
      project_id: fields.projectId,
      created_by: fields.createdBy,
      title: fields.title,
      description: fields.description ?? null,
      model_type: fields.modelType ?? "generic",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ProjectModel;
}

export async function updateModel(
  supabase: SupabaseClient,
  modelId: string,
  updates: Partial<Pick<ProjectModel, "title" | "description" | "status" | "modelType" | "thumbnailPath">>,
  { orgId }: OrgScope,
) {
  const mapped: Record<string, unknown> = {};
  if (updates.title !== undefined) mapped.title = updates.title;
  if (updates.description !== undefined) mapped.description = updates.description;
  if (updates.status !== undefined) mapped.status = updates.status;
  if (updates.modelType !== undefined) mapped.model_type = updates.modelType;
  if (updates.thumbnailPath !== undefined) mapped.thumbnail_path = updates.thumbnailPath;

  const { data, error } = await supabase
    .from("project_models")
    .update(mapped)
    .eq("id", modelId)
    .eq("org_id", orgId)
    .select("*")
    .single();
  if (error) throw error;
  return data as ProjectModel;
}

export async function deleteModel(
  supabase: SupabaseClient,
  modelId: string,
  { orgId }: OrgScope,
) {
  const { error } = await supabase
    .from("project_models")
    .delete()
    .eq("id", modelId)
    .eq("org_id", orgId);
  if (error) throw error;
}

// ─── Files ────────────────────────────────────────────────────

export async function getModelFiles(
  supabase: SupabaseClient,
  modelId: string,
) {
  const { data, error } = await supabase
    .from("model_files")
    .select("*")
    .eq("model_id", modelId)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ModelFile[];
}

export async function createModelFile(
  supabase: SupabaseClient,
  fields: {
    modelId: string;
    filename: string;
    s3Key: string;
    contentType: string;
    fileSizeBytes: number;
    fileRole?: string;
  },
) {
  const { data, error } = await supabase
    .from("model_files")
    .insert({
      model_id: fields.modelId,
      filename: fields.filename,
      s3_key: fields.s3Key,
      content_type: fields.contentType,
      file_size_bytes: fields.fileSizeBytes,
      file_role: fields.fileRole ?? "primary",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as ModelFile;
}

export async function deleteModelFile(
  supabase: SupabaseClient,
  fileId: string,
  modelId: string,
) {
  // Return file data before deleting (for S3 cleanup)
  const { data, error: fetchErr } = await supabase
    .from("model_files")
    .select("id, s3_key, file_size_bytes")
    .eq("id", fileId)
    .eq("model_id", modelId)
    .single();
  if (fetchErr) throw fetchErr;

  const { error } = await supabase
    .from("model_files")
    .delete()
    .eq("id", fileId)
    .eq("model_id", modelId);
  if (error) throw error;
  return data as { id: string; s3_key: string; file_size_bytes: number };
}

export async function collectModelAssets(
  supabase: SupabaseClient,
  modelId: string,
  { orgId }: OrgScope,
) {
  const { data: model } = await supabase
    .from("project_models")
    .select("thumbnail_path")
    .eq("id", modelId)
    .eq("org_id", orgId)
    .single();

  const { data: files } = await supabase
    .from("model_files")
    .select("id, s3_key, file_size_bytes")
    .eq("model_id", modelId);

  return { model, files: files ?? [] };
}
