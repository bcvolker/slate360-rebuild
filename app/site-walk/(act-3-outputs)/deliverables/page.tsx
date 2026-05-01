import Link from "next/link";
import { Clock, ExternalLink, FileText, Plus } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SiteWalkDeliverable } from "@/lib/types/site-walk";

type DeliverableRow = Pick<SiteWalkDeliverable, "id" | "title" | "deliverable_type" | "status" | "share_token" | "created_at"> & {
  projects?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

export default async function SiteWalkDeliverablesPage() {
  const context = await resolveServerOrgContext();
  const deliverables = context.orgId ? await loadDeliverables(context.orgId) : [];

  return (
    <main className="min-h-[calc(100dvh-96px)] overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.14),transparent_34%),#0B0F15] px-4 py-4 text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-400">Site Walk</p>
            <h1 className="mt-1 text-2xl font-black">Deliverables</h1>
          </div>
          <Link href="/site-walk" className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-500">
            <Plus className="h-4 w-4" /> New Walk
          </Link>
        </div>

        <section className="space-y-3">
          {deliverables.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-500" />
              <p className="mt-3 font-black text-slate-300">No deliverables yet</p>
              <p className="mt-1 text-sm text-slate-500">Complete a walk and generate a report — it will appear here.</p>
              <Link href="/site-walk" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-500">
                Start a Walk
              </Link>
            </div>
          ) : (
            deliverables.map((d) => <DeliverableCard key={d.id} deliverable={d} />)
          )}
        </section>
      </div>
    </main>
  );
}

const STATUS_STYLE: Record<string, string> = {
  draft: "bg-slate-700 text-slate-300",
  in_review: "bg-yellow-700/60 text-yellow-200",
  approved: "bg-green-700/60 text-green-200",
  shared: "bg-blue-700/60 text-blue-200",
  published: "bg-blue-700/60 text-blue-200",
  archived: "bg-slate-800 text-slate-500",
};

function DeliverableCard({ deliverable }: { deliverable: DeliverableRow }) {
  const project = Array.isArray(deliverable.projects) ? deliverable.projects[0] : deliverable.projects;
  const label = deliverable.deliverable_type.replace(/_/g, " ");
  const created = new Date(deliverable.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const statusStyle = STATUS_STYLE[deliverable.status] ?? STATUS_STYLE.draft;

  return (
    <article className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-blue-400">{label}</p>
        <h2 className="mt-1 truncate font-black text-slate-50">{deliverable.title || "Untitled deliverable"}</h2>
        {project?.name && <p className="mt-0.5 text-xs text-slate-400">{project.name}</p>}
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3 w-3" /> {created}</p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-black uppercase tracking-wider ${statusStyle}`}>{deliverable.status.replace(/_/g, " ")}</span>
        {deliverable.share_token && (
          <Link href={`/share/deliverable/${deliverable.share_token}`} className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white" title="View deliverable">
            <ExternalLink className="h-4 w-4" />
          </Link>
        )}
      </div>
    </article>
  );
}

async function loadDeliverables(orgId: string): Promise<DeliverableRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_walk_deliverables")
    .select("id, title, deliverable_type, status, share_token, created_at, projects(name)")
    .eq("org_id", orgId)
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as DeliverableRow[];
}
