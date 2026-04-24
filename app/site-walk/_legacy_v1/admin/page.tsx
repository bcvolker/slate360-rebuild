import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArrowLeft, Camera, FileText, Folder, Users, Eye } from "lucide-react";

export const metadata = { title: "Leadership View — Site Walk" };
export const dynamic = "force-dynamic";

/**
 * Org-wide leadership view.
 * Read-access for owner / admin / viewer roles. Lists every project in the
 * org with rolled-up walk + open-item + deliverable counts, plus the most
 * recent walks across the org. This is what ASU directors see during beta
 * to observe their PM team's site-walk activity.
 */
export default async function SiteWalkAdminPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/site-walk/admin");
  if (!ctx.orgId) redirect("/site-walk/walks");

  const canView = ctx.isAdmin || ctx.isViewer || ctx.isSlateCeo;
  if (!canView) redirect("/site-walk/walks");

  const admin = createAdminClient();

  const [projectsRes, recentWalksRes, openItemsRes, totalsRes] = await Promise.all([
    admin
      .from("projects")
      .select("id, name, status, created_at")
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: false })
      .limit(100),
    admin
      .from("site_walk_sessions")
      .select(
        "id, title, status, started_at, completed_at, created_at, project_id, created_by, projects(name), profiles!site_walk_sessions_created_by_fkey(full_name)"
      )
      .eq("org_id", ctx.orgId)
      .order("created_at", { ascending: false })
      .limit(25),
    admin
      .from("site_walk_items")
      .select("id, session_id, site_walk_sessions!inner(project_id)")
      .eq("org_id", ctx.orgId)
      .in("item_status", ["open", "in_progress"]),
    Promise.all([
      admin
        .from("site_walk_sessions")
        .select("id", { count: "exact", head: true })
        .eq("org_id", ctx.orgId),
      admin
        .from("site_walk_deliverables")
        .select("id", { count: "exact", head: true })
        .eq("org_id", ctx.orgId),
      admin
        .from("organization_members")
        .select("user_id", { count: "exact", head: true })
        .eq("org_id", ctx.orgId),
    ]),
  ]);

  const projects = projectsRes.data ?? [];
  const recentWalks = recentWalksRes.data ?? [];
  const openItems = openItemsRes.data ?? [];
  const [walkCount, deliverableCount, memberCount] = totalsRes.map((r) => r.count ?? 0);

  // Walk counts per project
  const walksByProject = recentWalks.reduce<Record<string, number>>((acc, w) => {
    const pid = w.project_id as string;
    acc[pid] = (acc[pid] ?? 0) + 1;
    return acc;
  }, {});

  // Open item counts per project (via session join already in payload)
  const openByProject = openItems.reduce<Record<string, number>>((acc, it) => {
    const session = it.site_walk_sessions as { project_id: string } | { project_id: string }[] | null;
    const pid = Array.isArray(session) ? session[0]?.project_id : session?.project_id;
    if (!pid) return acc;
    acc[pid] = (acc[pid] ?? 0) + 1;
    return acc;
  }, {});

  const tiles = [
    { label: "Projects", count: projects.length, icon: Folder },
    { label: "Walks", count: walkCount, icon: Camera },
    { label: "Open items", count: openItems.length, icon: FileText },
    { label: "Deliverables", count: deliverableCount, icon: FileText },
    { label: "Org members", count: memberCount, icon: Users },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100">
      <header className="border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/site-walk/walks" className="p-2 -ml-2 rounded-md hover:bg-white/5" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-500 flex items-center gap-1.5">
              <Eye className="h-3 w-3" /> Leadership view · {ctx.orgName ?? "Organization"}
            </p>
            <h1 className="text-lg font-semibold truncate">All projects &amp; walks</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        {/* KPIs */}
        <section className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <div
                key={t.label}
                className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
              >
                <Icon className="w-4 h-4 text-slate-400 mb-2" />
                <p className="text-2xl font-semibold tabular-nums">{t.count}</p>
                <p className="text-xs text-slate-400">{t.label}</p>
              </div>
            );
          })}
        </section>

        {/* Projects table */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">Projects</h2>
          {projects.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center border border-white/10 rounded-xl">
              No projects in this organization yet.
            </p>
          ) : (
            <div className="rounded-xl border border-white/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-white/[0.03] text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">Project</th>
                    <th className="text-right px-4 py-2 font-medium">Recent walks</th>
                    <th className="text-right px-4 py-2 font-medium">Open items</th>
                    <th className="text-right px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => (
                    <tr key={p.id as string} className="border-t border-white/5 hover:bg-white/[0.02]">
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/site-walk/projects/${p.id}`}
                          className="text-slate-100 hover:text-cobalt font-medium"
                        >
                          {(p.name as string) || "Untitled"}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-300">
                        {walksByProject[p.id as string] ?? 0}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-slate-300">
                        {openByProject[p.id as string] ?? 0}
                      </td>
                      <td className="px-4 py-2.5 text-right text-xs text-slate-400 capitalize">
                        {(p.status as string) || "active"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Recent walks across org */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-200">Recent walks (org-wide)</h2>
          {recentWalks.length === 0 ? (
            <p className="text-sm text-slate-500 py-6 text-center border border-white/10 rounded-xl">
              No walks logged yet.
            </p>
          ) : (
            <ul className="space-y-2">
              {recentWalks.map((w) => {
                const proj = w.projects as { name: string } | { name: string }[] | null;
                const projName = Array.isArray(proj) ? proj[0]?.name : proj?.name;
                const author = w.profiles as { full_name: string } | { full_name: string }[] | null;
                const authorName = Array.isArray(author) ? author[0]?.full_name : author?.full_name;
                const status = (w.status as string) || "draft";
                const when = (w.completed_at as string | null) ?? (w.started_at as string | null) ?? (w.created_at as string);
                return (
                  <li
                    key={w.id as string}
                    className="rounded-lg border border-white/10 bg-white/[0.02] p-3 flex items-center gap-3 hover:border-cobalt/30 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/site-walk/walks/active/${w.id}/items`}
                        className="text-sm font-medium text-slate-100 hover:text-cobalt block truncate"
                      >
                        {(w.title as string) || "Untitled walk"}
                      </Link>
                      <p className="text-[11px] text-slate-500 truncate">
                        {projName ?? "—"} · {authorName ?? "Unknown"} · {new Date(when).toLocaleString()}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border whitespace-nowrap ${
                        status === "completed"
                          ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                          : status === "in_progress"
                          ? "bg-blue-500/15 text-blue-300 border-blue-500/30"
                          : "bg-slate-500/15 text-slate-300 border-slate-500/30"
                      }`}
                    >
                      {status.replace("_", " ")}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
