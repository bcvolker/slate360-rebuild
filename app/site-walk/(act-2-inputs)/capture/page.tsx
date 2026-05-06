import Link from "next/link";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { CaptureNoSsrBoundary } from "./_components/CaptureNoSsrBoundary";
import type { ActiveWalkSession } from "./_components/session-shell-types";

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
  const hasPlanSheets = session.project_id ? await hasProjectPlanSheets(session.project_id, context.orgId) : false;
  const showPlanCanvas = plan !== "skip" && !!session.project_id && hasPlanSheets;
  const showStartChoice = showPlanCanvas && !plan && !quick && !item;

  return <CaptureNoSsrBoundary session={session} showPlanCanvas={showPlanCanvas} showStartChoice={showStartChoice} autoOpenCamera={quick === "camera"} launchId={launch ?? null} initialItemId={item ?? null} />;
}

async function hasProjectPlanSheets(projectId: string, orgId: string) {
  try {
    const admin = createAdminClient();
    const { data } = await admin.from("site_walk_plan_sheets").select("id").eq("project_id", projectId).eq("org_id", orgId).limit(1);
    return (data?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

function NoActiveSession() {
  return (
    <main className="min-h-[calc(100vh-160px)] bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.07),transparent_34%),#0B0F15] px-4 py-6 text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-center shadow-lg shadow-black/40 backdrop-blur-md">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">Capture</p>
        <h1 className="mt-2 text-2xl font-black text-white">Start a walk first</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-400">
          The capture shell now requires an active database session so offline tracking and safe exit controls stay consistent.
        </p>
        <Link href="/site-walk" className="mt-5 inline-flex rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-400">
          Back to Site Walk
        </Link>
      </div>
    </main>
  );
}
