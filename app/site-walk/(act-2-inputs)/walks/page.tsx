import Link from "next/link";
import { Activity, CheckCircle2, Clock, Footprints, UserRound } from "lucide-react";
import type { LiveWalkSummary } from "@/components/site-walk/live/live-walk-types";
import { elapsedLabel } from "@/components/site-walk/live/live-walk-utils";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/s3";
import { DeleteWalkButton } from "@/components/site-walk/walks/DeleteWalkButton";

type SessionRow = {
  id: string;
  title: string;
  status: string;
  started_at: string | null;
  completed_at: string | null;
  created_by: string;
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

  return (
    <main className="min-h-[calc(100dvh-96px)] overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.07),transparent_34%),#0B0F15] px-4 py-4 text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">

        {/* Stats */}
        <section className="grid gap-3 lg:grid-cols-3">
          <StatCard label="In progress" value={String(inProgress.length)} />
          <StatCard label="Items captured" value={String(walks.reduce((sum, w) => sum + w.itemCount, 0))} />
          <StatCard label="Completed walks" value={String(completed.length)} />
        </section>

        {/* In-progress */}
        {inProgress.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-amber-400">In Progress</h2>
            <div className="grid gap-3">
              {inProgress.map((walk) => <WalkCard key={walk.id} walk={walk} />)}
            </div>
          </section>
        )}

        {/* Completed */}
        {completed.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Completed</h2>
            <div className="grid gap-3">
              {completed.map((walk) => <WalkCard key={walk.id} walk={walk} />)}
            </div>
          </section>
        )}

        {walks.length === 0 && (
          <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-8 text-center text-sm font-bold text-slate-400">
            No walks yet. Start a walk from a phone and it will appear here.
          </div>
        )}
      </div>
    </main>
  );
}

function WalkCard({ walk }: { walk: LiveWalkSummary }) {
  const isComplete = walk.status === "completed";
  return (
    <div className="relative group rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:border-amber-400/40 hover:bg-white/10 overflow-hidden">
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
          <div className="hidden sm:flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-slate-500">
            <Footprints className="h-6 w-6" />
          </div>
        )}
        {walk.thumbnailUrl && (
          <div className="hidden sm:block h-14 w-14 shrink-0 rounded-2xl overflow-hidden border border-white/10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={walk.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-amber-400 truncate">{walk.projectName ?? "Ad-hoc walk"}</p>
              <Link href={`/site-walk/walks/${walk.id}`} className="mt-1 block text-xl font-black text-slate-50 hover:text-amber-200 transition-colors truncate">
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

          <div className="mt-3 flex flex-wrap gap-3">
            <Metric icon={<UserRound className="h-3.5 w-3.5" />} label="Walker" value={walk.walkerName} />
            <Metric icon={<Clock className="h-3.5 w-3.5" />} label="Elapsed" value={elapsedLabel(walk.startedAt)} />
            <Metric icon={<Activity className="h-3.5 w-3.5" />} label="Items" value={String(walk.itemCount)} />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-black text-slate-50">{value}</p>
    </div>
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
    .select("id, title, status, started_at, completed_at, created_by, projects(name)")
    .eq("org_id", orgId)
    .in("status", ["in_progress", "completed"])
    .order("started_at", { ascending: false })
    .limit(100);

  const rows = (sessions ?? []) as SessionRow[];
  if (rows.length === 0) return [];

  const sessionIds = rows.map((r) => r.id);
  const creatorIds = Array.from(new Set(rows.map((r) => r.created_by)));

  const [{ data: itemRows }, { data: profiles }, { data: firstPhotos }] = await Promise.all([
    admin.from("site_walk_items").select("session_id").eq("org_id", orgId).in("session_id", sessionIds),
    admin.from("profiles").select("id, email, full_name, display_name").in("id", creatorIds),
    // Fetch the earliest photo item per session
    admin
      .from("site_walk_items")
      .select("session_id, s3_key")
      .eq("org_id", orgId)
      .in("session_id", sessionIds)
      .eq("item_type", "photo")
      .not("s3_key", "is", null)
      .order("captured_at", { ascending: true })
      .limit(sessionIds.length * 2),
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

