import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import ProjectInbox from "@/components/site-walk/ProjectInbox";
import { ArrowLeft, Camera, FileImage, FileText, Inbox } from "lucide-react";

export const metadata = { title: "Project — Site Walk" };
export const dynamic = "force-dynamic";

type Params = { projectId: string };

export default async function ProjectSiteWalkDashboard({ params }: { params: Promise<Params> }) {
  const { projectId } = await params;
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect(`/login?next=/site-walk/projects/${projectId}`);
  if (!ctx.orgId) redirect("/site-walk/walks");

  const admin = createAdminClient();

  const { data: project } = await admin
    .from("projects")
    .select("id, name")
    .eq("id", projectId)
    .eq("org_id", ctx.orgId)
    .maybeSingle();

  if (!project) notFound();

  // Real counts (no mocks). All scoped to org+project, items via session join.
  const [sessionsRes, openItemsRes, plansRes, deliverablesRes, inboxItemsRes] = await Promise.all([
    admin
      .from("site_walk_sessions")
      .select("id", { count: "exact", head: true })
      .eq("org_id", ctx.orgId)
      .eq("project_id", projectId),
    admin
      .from("site_walk_items")
      .select("id, site_walk_sessions!inner(project_id)", { count: "exact", head: true })
      .eq("org_id", ctx.orgId)
      .eq("site_walk_sessions.project_id", projectId)
      .in("item_status", ["open", "in_progress"]),
    admin
      .from("site_walk_plans")
      .select("id, site_walk_sessions!inner(project_id)", { count: "exact", head: true })
      .eq("org_id", ctx.orgId)
      .eq("site_walk_sessions.project_id", projectId),
    admin
      .from("site_walk_deliverables")
      .select("id, site_walk_sessions!inner(project_id)", { count: "exact", head: true })
      .eq("org_id", ctx.orgId)
      .eq("site_walk_sessions.project_id", projectId),
    admin
      .from("site_walk_items")
      .select(
        "id, session_id, title, item_type, item_status, priority, before_item_id, item_relationship, created_at, site_walk_sessions!inner(project_id)"
      )
      .eq("org_id", ctx.orgId)
      .eq("site_walk_sessions.project_id", projectId)
      .in("item_status", ["open", "in_progress"])
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const sessionCount = sessionsRes.count ?? 0;
  const openCount = openItemsRes.count ?? 0;
  const plansCount = plansRes.count ?? 0;
  const deliverablesCount = deliverablesRes.count ?? 0;
  const initialInboxItems = (inboxItemsRes.data ?? []).map((row) => ({
    id: row.id as string,
    session_id: row.session_id as string,
    title: (row.title as string | null) ?? null,
    item_type: row.item_type as string,
    item_status: row.item_status as string,
    priority: (row.priority as string | null) ?? null,
    before_item_id: (row.before_item_id as string | null) ?? null,
    item_relationship: (row.item_relationship as string | null) ?? null,
    created_at: row.created_at as string,
  }));

  const tiles = [
    { label: "Walks", count: sessionCount, href: `/site-walk/walks?projectId=${projectId}`, icon: Camera },
    { label: "Plans", count: plansCount, href: `/site-walk/walks?projectId=${projectId}`, icon: FileImage },
    { label: "Deliverables", count: deliverablesCount, href: `/site-walk/walks?projectId=${projectId}`, icon: FileText },
    { label: "Open Items", count: openCount, href: "#inbox", icon: Inbox },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100">
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/site-walk/walks" className="p-2 -ml-2 rounded-md hover:bg-white/5" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Site Walk</p>
            <h1 className="text-lg font-semibold truncate">{project.name}</h1>
          </div>
          <form action={`/api/site-walk/sessions`} method="post">
            <input type="hidden" name="project_id" value={projectId} />
            <Link
              href={`/site-walk/walks?projectId=${projectId}&new=1`}
              className="inline-flex items-center gap-2 bg-cobalt hover:bg-cobalt/90 text-white text-sm font-medium px-3 py-2 rounded-md"
            >
              <Camera className="w-4 h-4" /> Start Walk
            </Link>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <Link
                key={t.label}
                href={t.href}
                className="rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] p-4 transition-colors"
              >
                <Icon className="w-4 h-4 text-slate-400 mb-2" />
                <p className="text-2xl font-semibold tabular-nums">{t.count}</p>
                <p className="text-xs text-slate-400">{t.label}</p>
              </Link>
            );
          })}
        </section>

        <section id="inbox" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-200">Field ↔ Office Inbox</h2>
            <span className="text-[11px] text-slate-500">Realtime</span>
          </div>
          <ProjectInbox projectId={projectId} initialItems={initialInboxItems} />
        </section>
      </main>
    </div>
  );
}
