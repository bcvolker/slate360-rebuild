import Link from "next/link";
import { CameraViewfinder } from "@/components/site-walk/capture/CameraViewfinder";
import { CaptureBottomSheet } from "@/components/site-walk/capture/CaptureBottomSheet";
import { DualModeToggle } from "@/components/site-walk/capture/DualModeToggle";
import { PlanViewer } from "@/components/site-walk/capture/PlanViewer";
import { SyncQueueIndicator } from "@/components/site-walk/capture/SyncQueueIndicator";
import { UnifiedVectorToolbar } from "@/components/site-walk/capture/UnifiedVectorToolbar";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteWalkSessionProvider } from "./_components/SiteWalkSessionProvider";
import { WalkHeader } from "./_components/WalkHeader";
import type { ActiveWalkSession } from "./_components/session-shell-types";

type Props = {
  searchParams: Promise<{ session?: string }>;
};

type SessionRow = ActiveWalkSession & {
  projects?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

export default async function SiteWalkCapturePage({ searchParams }: Props) {
  const { session: sessionId } = await searchParams;
  const context = await resolveServerOrgContext();

  if (!context.user || !context.orgId || !sessionId) {
    return <NoActiveSession />;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("site_walk_sessions")
    .select("id, project_id, title, status, started_at, completed_at, is_ad_hoc, client_session_id, sync_state, last_synced_at, projects(name)")
    .eq("id", sessionId)
    .eq("org_id", context.orgId)
    .maybeSingle<SessionRow>();

  if (!data) return <NoActiveSession />;

  const project = Array.isArray(data.projects) ? data.projects[0] : data.projects;
  const session: ActiveWalkSession = { ...data, project_name: project?.name ?? null };

  return (
    <SiteWalkSessionProvider initialSession={session}>
      <main className="min-h-[calc(100vh-160px)] bg-slate-50 px-4 py-4 text-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
          <WalkHeader />

          <DualModeToggle />

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-1">
              <CameraViewfinder sessionId={session.id} />
              <PlanViewer sessionId={session.id} projectId={session.project_id} />
            </div>
            <aside className="space-y-4">
              <SyncQueueIndicator />
              <UnifiedVectorToolbar />
              <CaptureBottomSheet />
            </aside>
          </section>
        </div>
      </main>
    </SiteWalkSessionProvider>
  );
}

function NoActiveSession() {
  return (
    <main className="min-h-[calc(100vh-160px)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-300 bg-white p-6 text-center">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-800">Capture</p>
        <h1 className="mt-2 text-2xl font-black text-slate-900">Start a walk first</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-700">
          The capture shell now requires an active database session so offline tracking and safe exit controls stay consistent.
        </p>
        <Link href="/site-walk" className="mt-5 inline-flex rounded-xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-700">
          Back to Site Walk
        </Link>
      </div>
    </main>
  );
}
