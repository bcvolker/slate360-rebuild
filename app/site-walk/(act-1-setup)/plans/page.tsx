import Link from "next/link";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { MasterPlanRoomClient } from "./_components/MasterPlanRoomClient";
import type { PlanRoomProject } from "./_components/plan-room-types";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";

export default async function SiteWalkPlansPage() {
  const context = await resolveServerOrgContext();
  if (!context.user || !context.orgId) {
    return (
      <main className="min-h-[calc(100vh-160px)] bg-[#0B0F15] px-4 py-6 text-slate-50 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-xl font-black text-slate-100">Sign in required</h1>
          <p className="mt-2 text-sm text-slate-400">Plans requires an active organization workspace.</p>
        </div>
      </main>
    );
  }

  const admin = createAdminClient();
  const { data: projectRows } = await admin
    .from("projects")
    .select("id, name, description")
    .eq("org_id", context.orgId)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(25);

  const projects = (projectRows ?? []) as PlanRoomProject[];
  const initialProjectId = projects[0]?.id ?? null;
  const { planSets, sheets } = initialProjectId
    ? await loadPlanRoom(admin, context.orgId, initialProjectId)
    : { planSets: [], sheets: [] };

  return (
    <main className="min-h-[calc(100vh-160px)] bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.14),transparent_34%),#0B0F15] px-4 py-4 text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-5">
        <MasterPlanRoomClient projects={projects} initialPlanSets={planSets} initialSheets={sheets} />

        <Link href="/site-walk" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-bold text-slate-300 hover:bg-white/10">
          ← Back to Site Walk
        </Link>
      </div>
    </main>
  );
}

async function loadPlanRoom(admin: ReturnType<typeof createAdminClient>, orgId: string, projectId: string) {
  const [setsResult, sheetsResult] = await Promise.all([
    admin.from("site_walk_plan_sets").select("*").eq("org_id", orgId).eq("project_id", projectId).neq("processing_status", "archived").order("created_at", { ascending: false }),
    admin.from("site_walk_plan_sheets").select("*").eq("org_id", orgId).eq("project_id", projectId).order("sort_order", { ascending: true }),
  ]);
  return {
    planSets: (setsResult.data ?? []) as SiteWalkPlanSet[],
    sheets: (sheetsResult.data ?? []) as SiteWalkPlanSheet[],
  };
}
