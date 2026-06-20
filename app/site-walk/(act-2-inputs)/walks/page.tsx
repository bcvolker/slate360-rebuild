import Link from "next/link";
import { Activity, BriefcaseBusiness, CheckCircle2, Clock, Footprints, Plus, UserRound } from "lucide-react";
import type { LiveWalkSummary } from "@/components/site-walk/live/live-walk-types";
import { elapsedLabel } from "@/components/site-walk/live/live-walk-utils";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { excludeDeletedSiteWalkItems } from "@/lib/site-walk/item-filters";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/s3";
import { DeleteWalkButton } from "@/components/site-walk/walks/DeleteWalkButton";
import { WalkBulkManager } from "@/components/site-walk/walks/WalkBulkManager";
import { buildCaptureLaunchUrl, buildWalkResumeUrl } from "@/lib/site-walk/capture-v2-config";

type SessionRow = {
  id: string;
  title: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  created_by: string;
  project_id: string | null;
  projects?: { name?: string | null } | Array<{ name?: string | null }> | null;
};
type ProfileRow = { id: string; email: string | null; full_name: string | null; display_name: string | null };
type CountRow = { session_id: string };
type PhotoRow = { session_id: string; s3_key: string | null };

export default async function SiteWalksPage() {
  const context = await resolveServerOrgContext();
  const walks = context.orgId ? await loadWalks(context.orgId) : [];

  const inProgress = walks.filter((w) => w.status === "in_progress");
  const completed = walks.filter((w) => w.status !== "in_progress");
  const worksiteCount = new Set(walks.map((walk) => walk.projectName).filter(Boolean)).size;
  const itemCount = walks.reduce((sum, walk) => sum + walk.itemCount, 0);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-7xl flex-1 flex-col gap-3 px-4 py-4 sm:px-6 lg:px-8">
        <section className="shrink-0 rounded-3xl border border-white/10 bg-white/[0.045] p-3 backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-400">Site Walk</p>
              <h1 className="truncate text-xl font-black text-white">Worksites</h1>
            </div>
            <Link href="/site-walk/setup" className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-2xl bg-amber-500 px-3 text-xs font-black text-slate-950 hover:bg-amber-400">
              <Plus className="h-4 w-4" /> New Worksite
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <SummaryBadge label="Worksites" value={String(worksiteCount)} />
            <SummaryBadge label="Active" value={String(inProgress.length)} />
            <SummaryBadge label="Reports" value={String(completed.length)} />
            <SummaryBadge label="Items" value={String(itemCount)} />
          </div>
          {walks.length > 0 && (
            <div className="mt-3 border-t border-white/10 pt-3">
              <WalkBulkManager
                walks={walks.map((w) => ({
                  id: w.id,
                  title: w.title,
                  projectName: w.projectName,
                  hasPlan: w.hasPlan,
                }))}
              />
            </div>
          )}
        </section>

        <div className="min-h-0 flex-1 overflow-y-auto pb-[max(env(safe-area-inset-bottom),1rem)] no-scrollbar">
          <div className="space-y-4">
            {inProgress.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-400">Active Walks</h2>
                <div className="grid gap-2">
                  {inProgress.map((walk) => <WalkCard key={walk.id} walk={walk} />)}
                </div>
              </section>
            )}

            {completed.length > 0 && (
              <section className="space-y-2">
                <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Completed Reports</h2>
                <div className="grid gap-2">
                  {completed.map((walk) => <WalkCard key={walk.id} walk={walk} />)}
                </div>
              </section>
            )}

            {walks.length === 0 && (
              <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-sm font-bold text-slate-400">
                No worksites yet. Create a worksite to organize walks, plans, captures, reports, and files.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WalkCard({ walk }: { walk: LiveWalkSummary }) {
  const isComplete = walk.status === "completed";
  return (
    <div className="relative group overflow-hidden rounded-3xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm transition hover:border-amber-400/40 hover:bg-white/10">
      {/* Thumbnail */}
      {walk.thumbnailUrl && (
        <div className="absolute inset-0 opacity-10 group-hover:opacity-15 transition-opacity">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={walk.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0B0F15] via-[#0B0F15]/80 to-transparent" />
        </div>
      )}

      <div className="relative flex items-start gap-4">
        {/* Thumbnail icon (when no photo, show placeholder) */}
        {!walk.thumbnailUrl && (
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-500 sm:flex">
            <Footprints className="h-5 w-5" />
          </div>
        )}
        {walk.thumbnailUrl && (
          <div className="hidden h-12 w-12 shrink-0 overflow-hidden rounded-2xl border border-white/10 sm:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={walk.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.16em] text-amber-400">{walk.projectName ?? "No worksite"}</p>
              <Link href={buildWalkResumeUrl(walk.id, walk.status)} className="mt-0.5 block truncate text-base font-black text-slate-50 transition-colors hover:text-amber-200">
                {walk.title}
              </Link>
              {isComplete && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="h-3 w-3" /> Completed
                </span>
              )}
            </div>
            <DeleteWalkButton walkId={walk.id} walkTitle={walk.title} />
          </div>

          <div className="mt-2 flex flex-wrap gap-2">
            <Metric icon={<UserRound className="h-3.5 w-3.5" />} label="Walker" value={walk.walkerName} />
            <Metric icon={<Clock className="h-3.5 w-3.5" />} label="Elapsed" value={elapsedLabel(walk.startedAt)} />
            <Metric icon={<Activity className="h-3.5 w-3.5" />} label="Items" value={String(walk.itemCount)} />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {isComplete ? (
              <Link
                href={buildWalkResumeUrl(walk.id, walk.status)}
                className="inline-flex min-h-10 items-center rounded-2xl border border-white/15 bg-white/5 px-3 text-xs font-black text-white hover:border-amber-400/40"
              >
                View report
              </Link>
            ) : (
              <Link
                href={buildCaptureLaunchUrl({ session: walk.id })}
                className="inline-flex min-h-10 items-center rounded-2xl bg-amber-500 px-3 text-xs font-black text-slate-950 hover:bg-amber-400"
              >
                Resume walk
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-[11px] font-black text-slate-300">
      <BriefcaseBusiness className="h-3.5 w-3.5 text-slate-500" /> {label} <span className="text-amber-200">{value}</span>
    </span>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-400">
      <span className="text-slate-500">{icon}</span>
      <span className="font-black uppercase tracking-wider text-[10px]">{label}</span>
      <span className="text-slate-200 font-bold">{value}</span>
    </div>
  );
}

async function loadWalks(orgId: string): Promise<LiveWalkSummary[]> {
  const admin = createAdminClient();

  const { data: sessions } = await admin
    .from("site_walk_sessions")
    .select("id, title, status, started_at, completed_at, created_by, project_id, projects(name)")
    .eq("org_id", orgId)
    .in("status", ["in_progress", "completed"])
    .order("started_at", { ascending: false })
    .limit(100);

  const rows = (sessions ?? []) as SessionRow[];
  if (rows.length === 0) return [];

  // Projects that have an uploaded plan set — their walks are worth keeping.
  const { data: planSets } = await admin
    .from("site_walk_plan_sets")
    .select("project_id, processing_status")
    .eq("org_id", orgId);
  const planProjectIds = new Set(
    (planSets ?? [])
      .filter((p) => p.processing_status !== "archived" && p.project_id)
      .map((p) => p.project_id as string),
  );

  const sessionIds = rows.map((r) => r.id);
  const creatorIds = Array.from(new Set(rows.map((r) => r.created_by)));

  const [{ data: itemRows }, { data: profiles }, { data: firstPhotos }] = await Promise.all([
    excludeDeletedSiteWalkItems(
      admin.from("site_walk_items").select("session_id").eq("org_id", orgId).in("session_id", sessionIds),
    ),
    admin.from("profiles").select("id, email, full_name, display_name").in("id", creatorIds),
    excludeDeletedSiteWalkItems(
      admin
        .from("site_walk_items")
        .select("session_id, s3_key")
        .eq("org_id", orgId)
        .in("session_id", sessionIds)
        .eq("item_type", "photo")
        .not("s3_key", "is", null)
        .order("captured_at", { ascending: true })
        .limit(sessionIds.length * 2),
    ),
  ]);

  const counts = countItems((itemRows ?? []) as CountRow[]);
  const profileMap = new Map((profiles ?? [] as ProfileRow[]).map((p) => [p.id, p]));

  // Keep only first photo per session
  const firstPhotoMap = new Map<string, string>();
  for (const photo of (firstPhotos ?? []) as PhotoRow[]) {
    if (!firstPhotoMap.has(photo.session_id) && photo.s3_key) {
      firstPhotoMap.set(photo.session_id, photo.s3_key);
    }
  }

  // Generate presigned URLs for all thumbnails (local signing — no network calls)
  const thumbnailUrls = new Map<string, string>();
  await Promise.all(
    Array.from(firstPhotoMap.entries()).map(async ([sessionId, s3Key]) => {
      try {
        const url = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }), { expiresIn: 900 });
        thumbnailUrls.set(sessionId, url);
      } catch {
        // skip if signing fails (missing creds in this env)
      }
    })
  );

  return rows.map((row) => {
    const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
    const profile = profileMap.get(row.created_by);
    return {
      id: row.id,
      title: row.title,
      status: row.status as LiveWalkSummary["status"],
      projectId: row.project_id,
      hasPlan: row.project_id ? planProjectIds.has(row.project_id) : false,
      projectName: project?.name ?? null,
      walkerName: profile?.full_name ?? profile?.display_name ?? profile?.email ?? "Field user",
      startedAt: row.started_at,
      completedAt: row.completed_at ?? null,
      itemCount: counts.get(row.id) ?? 0,
      thumbnailUrl: thumbnailUrls.get(row.id) ?? null,
    };
  });
}

function countItems(rows: CountRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.session_id, (counts.get(row.session_id) ?? 0) + 1);
  return counts;
}

