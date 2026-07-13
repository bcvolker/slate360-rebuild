import Link from "next/link";
import { Clock, ExternalLink, FileText, Plus } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SiteWalkDeliverable } from "@/lib/types/site-walk";
import { DeliverableShareButton } from "@/components/site-walk/DeliverableShareButton";

type DeliverableRow = Pick<SiteWalkDeliverable, "id" | "title" | "deliverable_type" | "status" | "share_token" | "created_at"> & {
  projects?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

export default async function SiteWalkDeliverablesPage() {
  const context = await resolveServerOrgContext();
  const deliverables = context.orgId ? await loadDeliverables(context.orgId) : [];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden text-slate-50">
      <div className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)] no-scrollbar sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--graphite-primary)]">Site Walk</p>
            <h1 className="mt-1 text-2xl font-black">Deliverables</h1>
          </div>
          <Link href="/site-walk" className="inline-flex items-center gap-2 rounded-2xl bg-[var(--graphite-primary)] px-4 py-2 text-sm font-black text-[var(--graphite-canvas)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_85%,white)]">
            <Plus className="h-4 w-4" /> New Walk
          </Link>
        </div>

        <section className="space-y-3">
          {deliverables.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-10 text-center">
              <FileText className="mx-auto h-8 w-8 text-slate-500" />
              <p className="mt-3 font-black text-slate-300">No deliverables yet</p>
              <p className="mt-1 text-sm text-slate-500">Complete a walk and generate a report — it will appear here.</p>
              <Link href="/site-walk" className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-[var(--graphite-primary)] px-4 py-2 text-sm font-black text-[var(--graphite-canvas)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_85%,white)]">
                Start a Walk
              </Link>
            </div>
          ) : (
            deliverables.map((d) => <DeliverableCard key={d.id} deliverable={d} />)
          )}
        </section>
      </div>
    </div>
  );
}

// Token-based status styles (no hardcoded amber/green — Graphite Glass).
const STATUS_STYLE: Record<string, string> = {
  draft: "bg-white/10 text-slate-300",
  in_review: "bg-white/10 text-[var(--graphite-primary)]",
  approved: "bg-[color-mix(in_srgb,var(--graphite-primary)_20%,transparent)] text-[var(--graphite-primary)]",
  shared: "bg-[color-mix(in_srgb,var(--graphite-primary)_16%,transparent)] text-[var(--graphite-primary)]",
  published: "bg-[color-mix(in_srgb,var(--graphite-primary)_16%,transparent)] text-[var(--graphite-primary)]",
  archived: "bg-white/5 text-slate-500",
};

function DeliverableCard({ deliverable }: { deliverable: DeliverableRow }) {
  const project = Array.isArray(deliverable.projects) ? deliverable.projects[0] : deliverable.projects;
  const label = deliverable.deliverable_type.replace(/_/g, " ");
  const created = new Date(deliverable.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const statusStyle = STATUS_STYLE[deliverable.status] ?? STATUS_STYLE.draft;

  return (
    <article className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)]">
      {/* Whole card opens the owner viewer — works for drafts/unshared (no share token needed). */}
      <Link href={`/site-walk/deliverables/${deliverable.id}`} className="min-w-0 flex-1">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[var(--graphite-primary)]">{label}</p>
        <h2 className="mt-1 truncate font-black text-slate-50">{deliverable.title || "Untitled deliverable"}</h2>
        {project?.name && <p className="mt-0.5 text-xs text-slate-400">{project.name}</p>}
        <p className="mt-1 flex items-center gap-1 text-xs text-slate-500"><Clock className="h-3 w-3" /> {created}</p>
      </Link>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-black uppercase tracking-wider ${statusStyle}`}>{deliverable.status.replace(/_/g, " ")}</span>
        {/* Publish & share a PUBLIC link (mints a token on first use) — the mobile send path. */}
        <DeliverableShareButton deliverableId={deliverable.id} initialToken={deliverable.share_token ?? null} />
        {/* Open the existing public link once one exists. /view/[token] is the
            canonical viewer — /share/deliverable/[token] rendered quick-generated
            deliverables (photo/360/note/voice stops) as a blank page. */}
        {deliverable.share_token && (
          <Link href={`/view/${deliverable.share_token}`} className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white" title="Open public share link">
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
