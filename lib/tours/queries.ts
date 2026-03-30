import { SupabaseClient } from "@supabase/supabase-js";
import { ProjectTour, TourScene } from "../types/tours";

// Base interface for Tour queries
interface TourParams {
  orgId: string;
}

export async function getTours(supabase: SupabaseClient, { orgId }: TourParams) {
  const { data, error } = await supabase
    .from("project_tours")
    .select("*")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data as ProjectTour[];
}

export async function getTourById(supabase: SupabaseClient, tourId: string, { orgId }: TourParams) {
  const { data, error } = await supabase
    .from("project_tours")
    .select("*")
    .eq("id", tourId)
    .eq("org_id", orgId)
    .single();

  if (error) throw error;
  return data as ProjectTour;
}

export async function createTour(
  supabase: SupabaseClient,
  {
    orgId,
    projectId,
    createdBy,
    title,
    description,
  }: {
    orgId: string;
    projectId?: string | null;
    createdBy: string;
    title: string;
    description?: string | null;
  }
) {
  const { data, error } = await supabase
    .from("project_tours")
    .insert({
      org_id: orgId,
      project_id: projectId || null,
      created_by: createdBy,
      title,
      description,
      status: "draft",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as ProjectTour;
}

export async function updateTour(
  supabase: SupabaseClient,
  tourId: string,
  updates: Partial<ProjectTour>,
  { orgId }: TourParams
) {
  const safeUpdates: any = { ...updates };
  // remove un-updatable keys
  delete safeUpdates.id;
  delete safeUpdates.orgId;
  delete safeUpdates.createdAt;

  const { data, error } = await supabase
    .from("project_tours")
    .update(safeUpdates)
    .eq("id", tourId)
    .eq("org_id", orgId)
    .select("*")
    .single();

  if (error) throw error;
  return data as ProjectTour;
}

export async function deleteTour(supabase: SupabaseClient, tourId: string, { orgId }: TourParams) {
  // Return scenes first so we can physically delete the files
  const { data: scenes } = await supabase
    .from("tour_scenes")
    .select("id, panorama_path, thumbnail_path, file_size_bytes")
    .eq("tour_id", tourId);

  // Return the tour to delete its logo asset if it exists
  const { data: tour } = await supabase
    .from("project_tours")
    .select("logo_asset_path")
    .eq("id", tourId)
    .eq("org_id", orgId)
    .single();

  // Delete from database (triggers ON DELETE CASCADE for scenes)
  const { error } = await supabase
    .from("project_tours")
    .delete()
    .eq("id", tourId)
    .eq("org_id", orgId);

  if (error) throw error;

  return { scenes, tour };
}

export async function getTourScenes(supabase: SupabaseClient, tourId: string) {
  const { data, error } = await supabase
    .from("tour_scenes")
    .select("*")
    .eq("tour_id", tourId)
    .order("sort_order", { ascending: true });

  if (error) throw error;
  return data as TourScene[];
}

export async function createScene(
  supabase: SupabaseClient,
  {
    tourId,
    title,
    panoramaPath,
    thumbnailPath,
    fileSizeBytes,
  }: {
    tourId: string;
    title: string;
    panoramaPath: string;
    thumbnailPath?: string | null;
    fileSizeBytes: number;
  }
) {
  // Auto-increment sort order for new scenes
  const { data: maxScene } = await supabase
    .from("tour_scenes")
    .select("sort_order")
    .eq("tour_id", tourId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();

  const nextSortOrder = maxScene ? maxScene.sort_order + 1 : 0;

  const { data, error } = await supabase
    .from("tour_scenes")
    .insert({
      tour_id: tourId,
      title,
      panorama_path: panoramaPath,
      thumbnail_path: thumbnailPath || null,
      file_size_bytes: fileSizeBytes,
      sort_order: nextSortOrder,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data as TourScene;
}

export async function deleteScene(supabase: SupabaseClient, sceneId: string, tourId: string) {
  const { data, error } = await supabase
    .from("tour_scenes")
    .delete()
    .eq("id", sceneId)
    .eq("tour_id", tourId)
    .select("*")
    .single();

  if (error) throw error;
  return data as TourScene;
}
