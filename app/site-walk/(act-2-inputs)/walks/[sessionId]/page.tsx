import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { LiveWalkView } from "@/components/site-walk/live/LiveWalkView";
import type { LiveWalkItem, LiveWalkSession } from "@/components/site-walk/live/live-walk-types";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";

type Props = { params: Promise<{ sessionId: string }> };
type SessionRow = { id: string; title: string; status: string; started_at: string | null; created_by: string; projects?: { name?: string | null } | Array<{ name?: string | null }> | null };
type ProfileRow = { id: string; email: string | null; full_name: string | null; display_name: string | null };

export default async function LiveWalkPage({ params }: Props) {
  const { sessionId } = await params;
  const context = await resolveServerOrgContext();
  if (!context.user || !context.orgId) return notFound();

  const admin = createAdminClient();
  const { data: sessionRow } = await admin
    .from("site_walk_sessions")
    .select("id, title, status, started_at, created_by, projects(name)")
    .eq("id", sessionId)
    .eq("org_id", context.orgId)
    .maybeSingle<SessionRow>();

  if (!sessionRow) return notFound();

  const [{ data: itemsData }, profileResult] = await Promise.all([
    admin
      .from("site_walk_items")
      .select("id, session_id, created_by, item_type, title, description, file_id, location_label, category, priority, item_status, assigned_to, sync_state, upload_state, markup_data, created_at, updated_at")
      .eq("session_id", sessionId)
      .eq("org_id", context.orgId)
      .order("created_at", { ascending: false }),
    admin.from("profiles").select("id, email, full_name, display_name").eq("id", sessionRow.created_by).maybeSingle<ProfileRow>(),
  ]);

  const project = Array.isArray(sessionRow.projects) ? sessionRow.projects[0] : sessionRow.projects;
  const profile = profileResult.data;
  const session: LiveWalkSession = {
    id: sessionRow.id,
    title: sessionRow.title,
    status: sessionRow.status,
    startedAt: sessionRow.started_at,
    projectName: project?.name ?? null,
    walkerName: profile?.full_name ?? profile?.display_name ?? profile?.email ?? "Field user",
  };

  return (
    <main className="min-h-[calc(100vh-160px)] bg-slate-50 px-4 py-5 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-4">
        <Link href="/site-walk/walks" className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-black text-slate-800 hover:border-blue-300">
          <ArrowLeft className="h-4 w-4" /> Active Walks
        </Link>
        <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-800">Live Command Center</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight">{session.title}</h1>
          <p className="mt-2 text-sm font-bold text-slate-600">{session.projectName ?? "Ad-hoc walk"} · {session.walkerName}</p>
        </section>
        <LiveWalkView session={session} initialItems={(itemsData ?? []) as LiveWalkItem[]} />
      </div>
    </main>
  );
}
