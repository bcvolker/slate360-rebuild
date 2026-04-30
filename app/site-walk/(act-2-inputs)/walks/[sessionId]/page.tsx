import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, FileText, PackageCheck, PenLine } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";

// This route is the Act 2 walk review screen: a contained mobile-first list of captures before deliverables.
type Props = { params: Promise<{ sessionId: string }> };
type SessionRow = { id: string; title: string; status: string; project_id: string | null; projects?: { name?: string | null } | Array<{ name?: string | null }> | null };
type ItemRow = { id: string; item_type: string; title: string; description: string | null; category: string | null; priority: string; item_status: string; created_at: string };

export default async function WalkReviewPage({ params }: Props) {
  const { sessionId } = await params;
  const context = await resolveServerOrgContext();
  if (!context.user || !context.orgId) return notFound();

  const admin = createAdminClient();
  const [{ data: sessionRow }, { data: itemRows }] = await Promise.all([
    admin.from("site_walk_sessions").select("id, title, status, project_id, projects(name)").eq("id", sessionId).eq("org_id", context.orgId).maybeSingle<SessionRow>(),
    admin.from("site_walk_items").select("id, item_type, title, description, category, priority, item_status, created_at").eq("session_id", sessionId).eq("org_id", context.orgId).order("created_at", { ascending: false }),
  ]);

  if (!sessionRow) return notFound();
  const project = Array.isArray(sessionRow.projects) ? sessionRow.projects[0] : sessionRow.projects;
  const items = (itemRows ?? []) as ItemRow[];

  return (
    <main className="fixed inset-0 flex h-[100dvh] flex-col overflow-hidden bg-slate-950 text-white">
      <header className="shrink-0 border-b border-cyan-300/10 bg-slate-950/95 px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.35)]">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link href="/site-walk/walks" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-black text-slate-100"><ArrowLeft className="h-4 w-4" /> Walks</Link>
          <Link href={`/site-walk/deliverables/new?session=${encodeURIComponent(sessionId)}`} className="inline-flex h-10 items-center gap-2 rounded-2xl bg-cyan-300 px-4 text-sm font-black text-slate-950"><PackageCheck className="h-4 w-4" /> Create Deliverables</Link>
        </div>
        <div className="mx-auto mt-4 max-w-5xl">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200/80">Walk Summary</p>
          <h1 className="mt-1 truncate text-2xl font-black tracking-tight sm:text-3xl">{sessionRow.title}</h1>
          <p className="mt-1 text-sm font-bold text-slate-400">{project?.name ?? "Ad-hoc walk"} · {items.length} capture{items.length === 1 ? "" : "s"}</p>
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
        <div className="mx-auto max-w-5xl space-y-3 pb-[calc(5rem+env(safe-area-inset-bottom))]">
          {items.length === 0 ? <EmptyReview sessionId={sessionId} /> : items.map((item, index) => <CaptureReviewCard key={item.id} item={item} index={items.length - index} sessionId={sessionId} />)}
        </div>
      </section>
    </main>
  );
}

function EmptyReview({ sessionId }: { sessionId: string }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-cyan-300/20 bg-white/[0.04] p-6 text-center">
      <Camera className="mx-auto h-8 w-8 text-cyan-200" />
      <h2 className="mt-3 text-xl font-black">No captures yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm font-bold text-slate-400">Start with one photo, markup, or note before creating deliverables.</p>
      <Link href={`/site-walk/capture?session=${encodeURIComponent(sessionId)}&quick=camera`} className="mt-5 inline-flex rounded-2xl bg-cyan-300 px-5 py-3 text-sm font-black text-slate-950">Capture first photo</Link>
    </div>
  );
}

function CaptureReviewCard({ item, index, sessionId }: { item: ItemRow; index: number; sessionId: string }) {
  const isPhoto = item.item_type === "photo";
  const thumbUrl = isPhoto ? `/api/site-walk/items/${encodeURIComponent(item.id)}/image` : null;
  return (
    <Link href={`/site-walk/capture?session=${encodeURIComponent(sessionId)}&item=${encodeURIComponent(item.id)}`} className="grid grid-cols-[92px_minmax(0,1fr)] gap-3 rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.2)] transition hover:border-cyan-300/30 hover:bg-white/[0.07]">
      <div className="relative h-24 overflow-hidden rounded-2xl border border-cyan-300/15 bg-slate-900">
        {thumbUrl ? <img src={thumbUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><FileText className="h-6 w-6 text-slate-500" /></div>}
        <span className="absolute left-2 top-2 rounded-full bg-slate-950/80 px-2 py-0.5 text-[10px] font-black text-cyan-100">#{index}</span>
      </div>
      <div className="min-w-0 py-1">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200/80"><PenLine className="h-3.5 w-3.5" /> {item.category ?? "Observation"} · {item.priority}</div>
        <h2 className="mt-1 truncate text-base font-black text-white">{item.title || "Untitled capture"}</h2>
        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-400">{item.description || "No note added yet."}</p>
        <p className="mt-2 text-[11px] font-bold text-slate-500">{new Date(item.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · Tap to edit</p>
      </div>
    </Link>
  );
}
