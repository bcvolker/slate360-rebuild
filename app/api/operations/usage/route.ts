import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, forbidden } from "@/lib/server/api-response";

export const dynamic = "force-dynamic";

interface UsageRow {
  org_id: string;
  org_name: string | null;
  storage_used_bytes: number | string | null;
  storage_limit_bytes: number | string | null;
  storage_percent_used: number | string | null;
  total_processing_jobs: number | string | null;
  projects_count: number | string | null;
}

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined) return 0;
  if (typeof v === "number") return v;
  const parsed = Number(v);
  return Number.isFinite(parsed) ? parsed : 0;
}

export const GET = (req: NextRequest) =>
  withAuth(req, async () => {
    const { canAccessOperationsConsole } = await resolveServerOrgContext();
    if (!canAccessOperationsConsole) return forbidden("Operations Console access required");

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("org_usage_summary")
      .select(
        "org_id, org_name, storage_used_bytes, storage_limit_bytes, storage_percent_used, total_processing_jobs, projects_count",
      )
      .order("storage_used_bytes", { ascending: false })
      .limit(50)
      .returns<UsageRow[]>();

    // Graceful fallback if view is missing or empty
    if (error) {
      console.error("[/api/operations/usage] supabase error:", error);
      return ok({ usage: [] });
    }

    const usage = (data ?? []).map((row) => ({
      org_id: row.org_id,
      org_name: row.org_name ?? "Unknown Org",
      storage_bytes: num(row.storage_used_bytes),
      storage_limit_bytes: num(row.storage_limit_bytes),
      storage_percent: num(row.storage_percent_used),
      processing_jobs: num(row.total_processing_jobs),
      projects_count: num(row.projects_count),
    }));

    return ok({ usage });
  });
