/** Content Studio query helpers — all require an admin (service-role) Supabase client. */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MediaAsset, MediaCollection } from "@/lib/types/content-studio";

interface OrgScope {
  orgId: string;
}

// ─── Collections ──────────────────────────────────────────────

export async function getCollections(
  supabase: SupabaseClient,
  projectId: string,
  { orgId }: OrgScope,
) {
  const { data, error } = await supabase
    .from("media_collections")
    .select("*")
    .eq("org_id", orgId)
    .eq("project_id", projectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MediaCollection[];
}

export async function getCollectionById(
  supabase: SupabaseClient,
  collectionId: string,
  { orgId }: OrgScope,
) {
  const { data, error } = await supabase
    .from("media_collections")
    .select("*")
    .eq("id", collectionId)
    .eq("org_id", orgId)
    .single();
  if (error) throw error;
  return data as MediaCollection;
}

export async function createCollection(
  supabase: SupabaseClient,
  fields: {
    orgId: string;
    projectId: string;
    createdBy: string;
    title: string;
    description?: string;
  },
) {
  const { data, error } = await supabase
    .from("media_collections")
    .insert({
      org_id: fields.orgId,
      project_id: fields.projectId,
      created_by: fields.createdBy,
      title: fields.title,
      description: fields.description ?? null,
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as MediaCollection;
}

export async function updateCollection(
  supabase: SupabaseClient,
  collectionId: string,
  updates: Partial<Pick<MediaCollection, "title" | "description" | "coverPath">>,
  { orgId }: OrgScope,
) {
  const mapped: Record<string, unknown> = {};
  if (updates.title !== undefined) mapped.title = updates.title;
  if (updates.description !== undefined) mapped.description = updates.description;
  if (updates.coverPath !== undefined) mapped.cover_path = updates.coverPath;

  const { data, error } = await supabase
    .from("media_collections")
    .update(mapped)
    .eq("id", collectionId)
    .eq("org_id", orgId)
    .select("*")
    .single();
  if (error) throw error;
  return data as MediaCollection;
}

export async function deleteCollection(
  supabase: SupabaseClient,
  collectionId: string,
  { orgId }: OrgScope,
) {
  const { error } = await supabase
    .from("media_collections")
    .delete()
    .eq("id", collectionId)
    .eq("org_id", orgId);
  if (error) throw error;
}

// ─── Assets ───────────────────────────────────────────────────

export async function getAssets(
  supabase: SupabaseClient,
  { orgId }: OrgScope,
  filters?: { collectionId?: string; mediaType?: string },
) {
  let q = supabase
    .from("media_assets")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });
  if (filters?.collectionId) q = q.eq("collection_id", filters.collectionId);
  if (filters?.mediaType) q = q.eq("media_type", filters.mediaType);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as MediaAsset[];
}

export async function getAssetById(
  supabase: SupabaseClient,
  assetId: string,
  { orgId }: OrgScope,
) {
  const { data, error } = await supabase
    .from("media_assets")
    .select("*")
    .eq("id", assetId)
    .eq("org_id", orgId)
    .single();
  if (error) throw error;
  return data as MediaAsset;
}

export async function createAsset(
  supabase: SupabaseClient,
  fields: {
    orgId: string;
    collectionId?: string;
    uploadedBy: string;
    title: string;
    s3Key: string;
    contentType: string;
    fileSizeBytes: number;
    mediaType?: string;
    width?: number;
    height?: number;
    durationSecs?: number;
    tags?: string[];
  },
) {
  const { data, error } = await supabase
    .from("media_assets")
    .insert({
      org_id: fields.orgId,
      collection_id: fields.collectionId ?? null,
      uploaded_by: fields.uploadedBy,
      title: fields.title,
      s3_key: fields.s3Key,
      content_type: fields.contentType,
      file_size_bytes: fields.fileSizeBytes,
      media_type: fields.mediaType ?? "image",
      width: fields.width ?? null,
      height: fields.height ?? null,
      duration_secs: fields.durationSecs ?? null,
      tags: fields.tags ?? [],
    })
    .select("*")
    .single();
  if (error) throw error;
  return data as MediaAsset;
}

export async function updateAsset(
  supabase: SupabaseClient,
  assetId: string,
  updates: Partial<
    Pick<MediaAsset, "title" | "tags" | "collectionId" | "thumbnailPath" | "metadata">
  >,
  { orgId }: OrgScope,
) {
  const mapped: Record<string, unknown> = {};
  if (updates.title !== undefined) mapped.title = updates.title;
  if (updates.tags !== undefined) mapped.tags = updates.tags;
  if (updates.collectionId !== undefined) mapped.collection_id = updates.collectionId;
  if (updates.thumbnailPath !== undefined) mapped.thumbnail_path = updates.thumbnailPath;
  if (updates.metadata !== undefined) mapped.metadata = updates.metadata;

  const { data, error } = await supabase
    .from("media_assets")
    .update(mapped)
    .eq("id", assetId)
    .eq("org_id", orgId)
    .select("*")
    .single();
  if (error) throw error;
  return data as MediaAsset;
}

export async function deleteAsset(
  supabase: SupabaseClient,
  assetId: string,
  { orgId }: OrgScope,
) {
  // Return asset data before deleting (for S3 cleanup)
  const { data, error: fetchErr } = await supabase
    .from("media_assets")
    .select("id, s3_key, file_size_bytes")
    .eq("id", assetId)
    .eq("org_id", orgId)
    .single();
  if (fetchErr) throw fetchErr;

  const { error } = await supabase
    .from("media_assets")
    .delete()
    .eq("id", assetId)
    .eq("org_id", orgId);
  if (error) throw error;
  return data as { id: string; s3_key: string; file_size_bytes: number };
}

export async function collectCollectionAssets(
  supabase: SupabaseClient,
  collectionId: string,
  { orgId }: OrgScope,
) {
  const { data: collection } = await supabase
    .from("media_collections")
    .select("cover_path")
    .eq("id", collectionId)
    .eq("org_id", orgId)
    .single();

  const { data: assets } = await supabase
    .from("media_assets")
    .select("id, s3_key, file_size_bytes, thumbnail_path")
    .eq("collection_id", collectionId);

  return { collection, assets: assets ?? [] };
}
