import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { badRequest, notFound, ok, serverError } from "@/lib/server/api-response";
import { getScopedProjectForUser } from "@/lib/projects/access";
import type { IdRouteContext } from "@/lib/types/api";

type AutoSheetsBody = {
  pageCount?: number;
};

type PlanSetRow = {
  id: string;
  org_id: string;
  project_id: string;
  title: string | null;
  page_count: number | null;
};

type ExistingSheetRow = {
  sheet_number: number | null;
};

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;
    const body = (await req.json().catch(() => null)) as AutoSheetsBody | null;

    const { data: planSet, error: setError } = await admin
      .from("site_walk_plan_sets")
      .select("id, org_id, project_id, title, page_count")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle<PlanSetRow>();
    if (setError) return serverError(setError.message);
    if (!planSet) return notFound("Plan set not found");

    const { project } = await getScopedProjectForUser(user.id, planSet.project_id, "id");
    if (!project) return badRequest("Project not found or access denied");

    const pageCount = normalizePageCount(body?.pageCount, planSet.page_count);
    if (!pageCount) return badRequest("A valid pageCount is required before sheet rows can be generated");

    const { data: existingSheets, error: existingError } = await admin
      .from("site_walk_plan_sheets")
      .select("sheet_number")
      .eq("org_id", orgId)
      .eq("plan_set_id", planSet.id)
      .returns<ExistingSheetRow[]>();
    if (existingError) return serverError(existingError.message);

    const existingNumbers = new Set((existingSheets ?? []).map((sheet) => sheet.sheet_number).filter(isSheetNumber));
    const now = new Date().toISOString();
    const rows = Array.from({ length: pageCount }, (_, index) => index + 1)
      .filter((sheetNumber) => !existingNumbers.has(sheetNumber))
      .map((sheetNumber) => ({
        org_id: orgId,
        project_id: planSet.project_id,
        plan_set_id: planSet.id,
        sheet_number: sheetNumber,
        sheet_name: pageCount === 1 ? planSet.title || "Plan sheet" : `${planSet.title || "Plan set"} — Sheet ${sheetNumber}`,
        sort_order: sheetNumber - 1,
        metadata: { extractionStatus: "auto_generated", generatedAt: now, source: "sheets-auto" },
      }));

    if (rows.length > 0) {
      const { error: insertError } = await admin
        .from("site_walk_plan_sheets")
        .upsert(rows, { onConflict: "plan_set_id,sheet_number", ignoreDuplicates: true });
      if (insertError) return serverError(insertError.message);
    }

    const { data: updatedPlanSet, error: updateError } = await admin
      .from("site_walk_plan_sets")
      .update({ page_count: pageCount, processing_status: "ready" })
      .eq("id", planSet.id)
      .eq("org_id", orgId)
      .select("*")
      .single();
    if (updateError) return serverError(updateError.message);

    const { data: sheets, error: sheetError } = await admin
      .from("site_walk_plan_sheets")
      .select("*")
      .eq("org_id", orgId)
      .eq("plan_set_id", planSet.id)
      .order("sort_order", { ascending: true });
    if (sheetError) return serverError(sheetError.message);

    return ok({ planSet: updatedPlanSet, planSets: updatedPlanSet ? [updatedPlanSet] : [], sheets: sheets ?? [] });
  });

function normalizePageCount(input: number | undefined, fallback: number | null) {
  const raw = typeof input === "number" && Number.isFinite(input) ? input : fallback;
  if (typeof raw !== "number" || !Number.isFinite(raw)) return null;
  return Math.max(1, Math.min(250, Math.floor(raw)));
}

function isSheetNumber(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value);
}