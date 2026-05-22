import Link from "next/link";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { CaptureNoSsrBoundary } from "@/components/capture-v2/CaptureNoSsrBoundary";
import type { CaptureV2Session } from "@/components/capture-v2/session-types";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";

type Props = {
  searchParams: Promise<{
    session?: string;
    plan?: string;
    quick?: string;
    launch?: string;
    item?: string;
  }>;
};

type SessionRow = CaptureV2Session & {
  projects?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

export default async function CaptureV2Page({ searchParams }: Props) {
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
      .select(
        "id, project_id, title, status, started_at, completed_at, is_ad_hoc, client_session_id, sync_state, last_synced_at, projects(name)",
      )
      .eq("id", sessionId)
      .eq("org_id", context.orgId)
      .maybeSingle<SessionRow>();
    data = result.data ?? null;
  } catch (error) {
    console.error("Capture V2 session load failed", error);
  }

  if (!data) return <NoActiveSession />;

  const project = Array.isArray(data.projects) ? data.projects[0] : data.projects;
  const session: CaptureV2Session = { ...data, project_name: project?.name ?? null };
  const planRoom = session.project_id
    ? await loadProjectPlanRoom(session.project_id, context.orgId)
    : { planSets: [], sheets: [] };
  const showPlanCanvas = plan !== "skip" && !!session.project_id;
  const showStartChoice = showPlanCanvas && !plan && !quick && !item;

  return (
    <CaptureNoSsrBoundary
      session={session}
      showPlanCanvas={showPlanCanvas}
      showStartChoice={showStartChoice}
      autoOpenCamera={quick === "camera"}
      launchId={launch ?? null}
      initialItemId={item ?? null}
      planSets={planRoom.planSets}
      planSheets={planRoom.sheets}
    />
  );
}

async function loadProjectPlanRoom(projectId: string, orgId: string) {
  try {
    const admin = createAdminClient();
    const [setsResult, sheetsResult] = await Promise.all([
      admin
        .from("site_walk_plan_sets")
        .select("*")
        .eq("project_id", projectId)
        .eq("org_id", orgId)
        .neq("processing_status", "archived")
        .order("created_at", { ascending: false }),
      admin
        .from("site_walk_plan_sheets")
        .select("*")
        .eq("project_id", projectId)
        .eq("org_id", orgId)
        .order("sort_order", { ascending: true }),
    ]);
    return {
      planSets: (setsResult.data ?? []) as SiteWalkPlanSet[],
      sheets: (sheetsResult.data ?? []) as SiteWalkPlanSheet[],
    };
  } catch {
    return { planSets: [], sheets: [] };
  }
}

function NoActiveSession() {
  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden bg-[#0B0F15] text-slate-50">
      <div className="flex min-h-0 flex-1 items-center justify-center px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-[max(env(safe-area-inset-top),1rem)]">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/60 p-6 text-center shadow-lg shadow-black/40 backdrop-blur-md">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">Capture</p>
          <h1 className="mt-2 text-2xl font-black text-white">Start a walk first</h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400">
            Capture V2 requires an active database session.
          </p>
          <Link
            href="/site-walk"
            className="mt-5 inline-flex rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-400"
          >
            Back to Site Walk
          </Link>
        </div>
      </div>
    </main>
  );
}
