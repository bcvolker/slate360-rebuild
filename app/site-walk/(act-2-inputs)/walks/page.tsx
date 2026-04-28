import Link from "next/link";
import { Activity, Clock, UserRound } from "lucide-react";
import type { LiveWalkSummary } from "@/components/site-walk/live/live-walk-types";
import { elapsedLabel } from "@/components/site-walk/live/live-walk-utils";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";

type SessionRow = { id: string; title: string; started_at: string | null; created_by: string; projects?: { name?: string | null } | Array<{ name?: string | null }> | null };
type ProfileRow = { id: string; email: string | null; full_name: string | null; display_name: string | null };
type CountRow = { session_id: string };

export default async function SiteWalksPage() {
  const context = await resolveServerOrgContext();
  const walks = context.orgId ? await loadActiveWalks(context.orgId) : [];

  return (
    <main className="min-h-[calc(100vh-160px)] bg-slate-50 px-4 py-6 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-800">Active walks</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">Live field command center</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">
            Watch in-progress walks across active projects, then drill into a real-time Location → Item feed as field captures arrive.
          </p>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <StatCard label="In progress" value={String(walks.length)} />
          <StatCard label="Items captured" value={String(walks.reduce((sum, walk) => sum + walk.itemCount, 0))} />
          <StatCard label="Active walkers" value={String(new Set(walks.map((walk) => walk.walkerName)).size)} />
        </section>

        <section className="grid gap-3">
          {walks.map((walk) => <WalkCard key={walk.id} walk={walk} />)}
          {walks.length === 0 && <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm font-bold text-slate-600 shadow-sm">No in-progress walks right now. Start a walk from a phone and it will appear here.</div>}
        </section>
      </div>
    </main>
  );
}

function WalkCard({ walk }: { walk: LiveWalkSummary }) {
  return (
    <Link href={`/site-walk/walks/${walk.id}`} className="grid gap-4 rounded-3xl border border-slate-300 bg-white p-5 shadow-sm transition hover:border-blue-300 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,0.5fr))] lg:items-center">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-800">{walk.projectName ?? "Ad-hoc walk"}</p>
        <h2 className="mt-1 text-xl font-black text-slate-950">{walk.title}</h2>
      </div>
      <Metric icon={<UserRound className="h-4 w-4" />} label="Person walking" value={walk.walkerName} />
      <Metric icon={<Clock className="h-4 w-4" />} label="Time elapsed" value={elapsedLabel(walk.startedAt)} />
      <Metric icon={<Activity className="h-4 w-4" />} label="Items" value={String(walk.itemCount)} />
    </Link>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm"><p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-slate-950">{value}</p></div>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <div className="rounded-2xl bg-slate-50 p-3"><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.12em] text-slate-500">{icon}{label}</p><p className="mt-1 truncate text-sm font-black text-slate-950">{value}</p></div>;
}

async function loadActiveWalks(orgId: string): Promise<LiveWalkSummary[]> {
  const admin = createAdminClient();
  const { data: sessions } = await admin
    .from("site_walk_sessions")
    .select("id, title, started_at, created_by, projects(name)")
    .eq("org_id", orgId)
    .eq("status", "in_progress")
    .order("started_at", { ascending: false })
    .limit(50);
  const rows = (sessions ?? []) as SessionRow[];
  if (rows.length === 0) return [];

  const sessionIds = rows.map((row) => row.id);
  const creatorIds = Array.from(new Set(rows.map((row) => row.created_by)));
  const [{ data: itemRows }, { data: profiles }] = await Promise.all([
    admin.from("site_walk_items").select("session_id").eq("org_id", orgId).in("session_id", sessionIds),
    admin.from("profiles").select("id, email, full_name, display_name").in("id", creatorIds),
  ]);
  const counts = countItems((itemRows ?? []) as CountRow[]);
  const profileMap = new Map((profiles ?? [] as ProfileRow[]).map((profile) => [profile.id, profile]));

  return rows.map((row) => {
    const project = Array.isArray(row.projects) ? row.projects[0] : row.projects;
    const profile = profileMap.get(row.created_by);
    return {
      id: row.id,
      title: row.title,
      projectName: project?.name ?? null,
      walkerName: profile?.full_name ?? profile?.display_name ?? profile?.email ?? "Field user",
      startedAt: row.started_at,
      itemCount: counts.get(row.id) ?? 0,
    };
  });
}

function countItems(rows: CountRow[]) {
  const counts = new Map<string, number>();
  for (const row of rows) counts.set(row.session_id, (counts.get(row.session_id) ?? 0) + 1);
  return counts;
}
