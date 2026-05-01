import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, FileText, MapPin, PackageCheck, PenLine } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";

// This route is the Act 2 walk review screen: a contained mobile-first list of captures before deliverables.
type Props = { params: Promise<{ sessionId: string }> };
type SessionRow = { id: string; title: string; status: string; project_id: string | null; projects?: { name?: string | null } | Array<{ name?: string | null }> | null };
type ItemRow = { id: string; item_type: string; title: string; description: string | null; location_label: string | null; priority: string; item_status: string; tags: string[] | null; created_at: string };

export default async function WalkReviewPage({ params }: Props) {
  const { sessionId } = await params;
  const context = await resolveServerOrgContext();
  if (!context.user || !context.orgId) return notFound();

  const admin = createAdminClient();
  const [{ data: sessionRow }, { data: itemRows }] = await Promise.all([
    admin.from("site_walk_sessions").select("id, title, status, project_id, projects(name)").eq("id", sessionId).eq("org_id", context.orgId).maybeSingle<SessionRow>(),
    admin.from("site_walk_items").select("id, item_type, title, description, location_label, priority, item_status, tags, created_at").eq("session_id", sessionId).eq("org_id", context.orgId).order("created_at", { ascending: false }),
  ]);

  if (!sessionRow) return notFound();
  const project = Array.isArray(sessionRow.projects) ? sessionRow.projects[0] : sessionRow.projects;
  const items = (itemRows ?? []) as ItemRow[];

  return (
    <main className="fixed inset-0 flex h-[100dvh] flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.18),transparent_34%),#0B0F15] text-white">
      <header className="shrink-0 border-b border-white/10 bg-[#0B0F15]/92 px-4 py-3 shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link href="/site-walk/walks" className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-black text-slate-100"><ArrowLeft className="h-4 w-4" /> Walks</Link>
          <CreateDeliverableLink sessionId={sessionId} compact />
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
          {items.length > 0 && <CreateDeliverableLink sessionId={sessionId} />}
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
  const location = getLocationLabel(item);
  const notes = item.description?.trim() || "No note added yet.";
  return (
    <Link href={`/site-walk/capture?session=${encodeURIComponent(sessionId)}&item=${encodeURIComponent(item.id)}`} className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 rounded-[1.6rem] border border-white/10 bg-white/[0.05] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-md transition hover:border-blue-300/35 hover:bg-white/[0.08]">
      <div className="relative h-28 overflow-hidden rounded-2xl border border-cyan-300/15 bg-slate-900">
        {thumbUrl ? <img src={thumbUrl} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center"><FileText className="h-6 w-6 text-slate-500" /></div>}
        <span className="absolute left-2 top-2 rounded-full bg-slate-950/80 px-2 py-0.5 text-[10px] font-black text-cyan-100">#{index}</span>
      </div>
      <div className="min-w-0 py-1">
        <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200/80"><PenLine className="h-3.5 w-3.5" /> {item.priority} priority <StatusPill value={item.item_status} /></div>
        <h2 className="mt-1 truncate text-base font-black text-white">{getItemDetail(item)}</h2>
        <p className="mt-1 flex min-w-0 items-center gap-1 truncate text-xs font-bold text-white/55"><MapPin className="h-3.5 w-3.5 shrink-0 text-blue-200" /> {location}</p>
        <TagList tags={item.tags ?? []} />
        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-400">{notes}</p>
        <p className="mt-2 text-[11px] font-bold text-slate-500">{new Date(item.created_at).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })} · Tap to edit</p>
      </div>
    </Link>
  );
}

function CreateDeliverableLink({ sessionId, compact = false }: { sessionId: string; compact?: boolean }) {
  return <Link href={`/site-walk/deliverables/new?session=${encodeURIComponent(sessionId)}`} className={`inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 font-black text-white shadow-[0_0_22px_rgba(37,99,235,0.38)] hover:bg-blue-500 ${compact ? "h-10 px-4 text-sm" : "min-h-14 w-full px-5 text-base"}`}><PackageCheck className="h-4 w-4" /> Create Deliverable</Link>;
}

function StatusPill({ value }: { value: string }) {
  return <span className="rounded-full border border-blue-300/25 bg-blue-500/15 px-2 py-0.5 text-[9px] text-blue-100">{value.replaceAll("_", " ")}</span>;
}

function TagList({ tags }: { tags: string[] }) {
  if (tags.length === 0) return <p className="mt-1 text-[11px] font-bold text-white/35">No custom tags</p>;
  return <div className="mt-2 flex flex-wrap gap-1">{tags.slice(0, 4).map((tag) => <span key={tag} className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2 py-0.5 text-[10px] font-black text-cyan-100">{tag}</span>)}</div>;
}

function getLocationLabel(item: ItemRow) {
  if (item.location_label?.trim()) return item.location_label.trim();
  return item.title.split(" — ")[0]?.trim() || "Unassigned location";
}

function getItemDetail(item: ItemRow) {
  const parts = item.title.split(" — ");
  return parts.length > 1 ? parts.slice(1).join(" — ") : item.title || "Untitled capture";
}
