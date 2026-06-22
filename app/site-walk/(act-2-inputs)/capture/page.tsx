import Link from "next/link";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { CaptureNoSsrBoundary } from "./_components/CaptureNoSsrBoundary";
import type { ActiveWalkSession } from "./_components/session-shell-types";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";

type Props = {
  searchParams: Promise<{ session?: string; plan?: string; quick?: string; launch?: string; item?: string }>;
};

type SessionRow = ActiveWalkSession & {
  projects?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

export default async function SiteWalkCapturePage({ searchParams }: Props) {
  const { session: sessionId, plan, quick, launch, item } = await searchParams;
  const context = await resolveServerOrgContext();

  if (!context.user || !context.orgId || !sessionId) {
    return <NoActiveSession />;
  }

  let data: SessionRow | null = null;
  try {
    const admin = createAdminClient();
    const result = await admin
      .from("site_walk_sessions")
      .select("id, project_id, title, status, started_at, completed_at, is_ad_hoc, client_session_id, sync_state, last_synced_at, projects(name)")
      .eq("id", sessionId)
      .eq("org_id", context.orgId)
      .maybeSingle<SessionRow>();
    data = result.data ?? null;
  } catch (error) {
    console.error("Site Walk session load failed", error);
  }

  if (!data) return <NoActiveSession />;

  const project = Array.isArray(data.projects) ? data.projects[0] : data.projects;
  const session: ActiveWalkSession = { ...data, project_name: project?.name ?? null };
  const planRoom = session.project_id ? await loadProjectPlanRoom(session.project_id, context.orgId) : { planSets: [], sheets: [] };
  const showPlanCanvas = plan !== "skip" && !!session.project_id;
  const showStartChoice = showPlanCanvas && !plan && !quick && !item;

  return <CaptureNoSsrBoundary session={session} showPlanCanvas={showPlanCanvas} showStartChoice={showStartChoice} autoOpenCamera={quick === "camera"} launchId={launch ?? null} initialItemId={item ?? null} planSets={planRoom.planSets} planSheets={planRoom.sheets} />;
}

async function loadProjectPlanRoom(projectId: string, orgId: string) {
  try {
    const admin = createAdminClient();
    const [setsResult, sheetsResult] = await Promise.all([
      admin.from("site_walk_plan_sets").select("*").eq("project_id", projectId).eq("org_id", orgId).neq("processing_status", "archived").order("created_at", { ascending: false }),
      admin.from("site_walk_plan_sheets").select("*").eq("project_id", projectId).eq("org_id", orgId).order("sort_order", { ascending: true }),
    ]);
    return { planSets: (setsResult.data ?? []) as SiteWalkPlanSet[], sheets: (sheetsResult.data ?? []) as SiteWalkPlanSheet[] };
  } catch {
    return { planSets: [], sheets: [] };
  }
}

function NoActiveSession() {
  return (
    <main className="min-h-[calc(100vh-160px)] bg-[radial-gradient(circle_at_top,color-mix(in_srgb,var(--graphite-primary)_7%,transparent),transparent_34%),#0B0F15] px-4 py-6 text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-center shadow-lg shadow-black/40 backdrop-blur-md">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--graphite-primary)]">Capture</p>
        <h1 className="mt-2 text-2xl font-black text-white">Start a walk first</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
          The capture shell now requires an active database session so offline tracking and safe exit controls stay consistent.
        </p>
        <Link href="/site-walk" className="mt-5 inline-flex rounded-xl bg-[var(--graphite-primary)] px-4 py-2 text-sm font-black text-[var(--graphite-canvas)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_85%,white)]">
          Back to Site Walk
        </Link>
      </div>
    </main>
  );
}
