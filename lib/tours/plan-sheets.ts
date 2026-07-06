import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/s3";

const SIGN_EXPIRES_SECONDS = 3600;

export type PlanSheetSummary = {
  id: string;
  planSetId: string;
  sheetNumber: number;
  sheetName: string | null;
  imageUrl: string | null;
  width: number;
  height: number;
};

export type PlanSetSummary = {
  id: string;
  title: string;
  sheets: PlanSheetSummary[];
};

/**
 * Lists a project's plan sets/sheets for the tour's plan-pin authoring UI —
 * reuses Site Walk's existing rasterized sheets (site_walk_plan_sets/
 * site_walk_plan_sheets) rather than duplicating rasterization for tours.
 * Signs each sheet's best-available image (rasterized > thumbnail > original),
 * mirroring app/api/site-walk/plan-sheets/[id]/image/route.ts's fallback chain.
 */
export async function listProjectPlanSets(
  admin: SupabaseClient,
  projectId: string,
): Promise<PlanSetSummary[]> {
  const { data: planSets } = await admin
    .from("site_walk_plan_sets")
    .select("id, title")
    .eq("project_id", projectId)
    .neq("processing_status", "archived")
    .order("created_at", { ascending: false });
  if (!planSets?.length) return [];

  const { data: sheets } = await admin
    .from("site_walk_plan_sheets")
    .select("id, plan_set_id, sheet_number, sheet_name, image_s3_key, thumbnail_s3_key, rasterized_key, rasterized_width, rasterized_height")
    .in("plan_set_id", planSets.map((p) => p.id))
    .order("sort_order", { ascending: true });

  const sheetsBySet = new Map<string, PlanSheetSummary[]>();
  for (const sheet of sheets ?? []) {
    const key = sheet.rasterized_key ?? sheet.thumbnail_s3_key ?? sheet.image_s3_key ?? null;
    const summary: PlanSheetSummary = {
      id: sheet.id,
      planSetId: sheet.plan_set_id,
      sheetNumber: sheet.sheet_number,
      sheetName: sheet.sheet_name,
      imageUrl: key ? await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: SIGN_EXPIRES_SECONDS }) : null,
      width: sheet.rasterized_width ?? 0,
      height: sheet.rasterized_height ?? 0,
    };
    const list = sheetsBySet.get(sheet.plan_set_id) ?? [];
    list.push(summary);
    sheetsBySet.set(sheet.plan_set_id, list);
  }

  return planSets.map((set) => ({
    id: set.id,
    title: set.title,
    sheets: sheetsBySet.get(set.id) ?? [],
  }));
}
