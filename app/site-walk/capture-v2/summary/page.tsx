import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Camera, FileText } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { excludeDeletedSiteWalkItems } from "@/lib/site-walk/item-filters";
import { SITE_WALK_CAPTURE_V2_ROUTES } from "@/lib/site-walk/capture-v2-routes";

type Props = {
  searchParams: Promise<{ session?: string }>;
};

type SessionRow = {
  id: string;
  title: string;
  status: string;
  project_id: string | null;
  projects?: { name?: string | null } | Array<{ name?: string | null }> | null;
};

type ItemRow = {
  id: string;
  item_type: string;
  title: string;
  description: string | null;
  item_status: string;
  created_at: string;
};

export default async function CaptureV2SummaryPage({ searchParams }: Props) {
  const { session: sessionId } = await searchParams;
  const context = await resolveServerOrgContext();

  if (!context.user || !context.orgId || !sessionId) {
    return notFound();
  }

  const admin = createAdminClient();
  let itemsQuery = admin
    .from("site_walk_items")
    .select("id, item_type, title, description, item_status, created_at")
    .eq("session_id", sessionId)
    .eq("org_id", context.orgId);
  itemsQuery = excludeDeletedSiteWalkItems(itemsQuery);

  const [{ data: sessionRow }, { data: itemRows }] = await Promise.all([
    admin
      .from("site_walk_sessions")
      .select("id, title, status, project_id, projects(name)")
      .eq("id", sessionId)
      .eq("org_id", context.orgId)
      .maybeSingle<SessionRow>(),
    itemsQuery.order("created_at", { ascending: false }),
  ]);

  if (!sessionRow) return notFound();

  const project = Array.isArray(sessionRow.projects) ? sessionRow.projects[0] : sessionRow.projects;
  const items = (itemRows ?? []) as ItemRow[];

  return (
    <main className="flex h-full min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.07),transparent_34%),#0B0F15] text-white">
      <header className="shrink-0 border-b border-white/10 bg-[#0B0F15]/92 px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)] shadow-[0_18px_60px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <Link
            href="/site-walk/walks"
            className="inline-flex h-10 items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-3 text-sm font-black text-slate-100"
          >
            <ArrowLeft className="h-4 w-4" /> Walks
          </Link>
          {sessionRow.status !== "completed" && (
            <Link
              href={buildV2CaptureUrl(sessionId)}
              className="inline-flex h-10 items-center gap-2 rounded-2xl bg-amber-500 px-4 text-sm font-black text-slate-950"
            >
              Resume capture
            </Link>
          )}
        </div>
        <div className="mx-auto mt-4 max-w-5xl">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300/80">
            Walk Summary
          </p>
          <h1 className="mt-1 truncate text-2xl font-black tracking-tight sm:text-3xl">
            {sessionRow.title}
          </h1>
          <p className="mt-1 text-sm font-bold text-slate-400">
            {project?.name ?? "Ad-hoc walk"} · {items.length} capture
            {items.length === 1 ? "" : "s"} · {sessionRow.status}
          </p>
        </div>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto px-4 py-4 no-scrollbar">
        <div className="mx-auto max-w-5xl space-y-3 pb-[calc(5rem+env(safe-area-inset-bottom))]">
          {items.length === 0 ? (
            <EmptySummary sessionId={sessionId} />
          ) : (
            items.map((item, index) => (
              <SummaryItemCard key={item.id} item={item} index={items.length - index} />
            ))
          )}
        </div>
      </section>
    </main>
  );
}

function EmptySummary({ sessionId }: { sessionId: string }) {
  return (
    <div className="rounded-[2rem] border border-dashed border-amber-400/20 bg-white/[0.04] p-6 text-center">
      <Camera className="mx-auto h-8 w-8 text-amber-300" />
      <h2 className="mt-3 text-xl font-black">No captures yet</h2>
      <p className="mx-auto mt-2 max-w-sm text-sm font-bold text-slate-400">
        This walk has no saved stops. Return to capture to add photos or notes.
      </p>
      <Link
        href={buildV2CaptureUrl(sessionId, "camera")}
        className="mt-5 inline-flex rounded-2xl bg-amber-500 px-5 py-3 text-sm font-black text-slate-950"
      >
        Capture first photo
      </Link>
    </div>
  );
}

function SummaryItemCard({ item, index }: { item: ItemRow; index: number }) {
  const isPhoto = item.item_type === "photo";
  const thumbUrl = isPhoto ? `/api/site-walk/items/${encodeURIComponent(item.id)}/image` : null;

  return (
    <article className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 rounded-[1.6rem] border border-white/10 bg-white/[0.05] p-2 shadow-[0_18px_50px_rgba(0,0,0,0.22)] backdrop-blur-md">
      <div className="relative h-28 overflow-hidden rounded-2xl border border-amber-400/20 bg-slate-900">
        {thumbUrl ? (
          <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FileText className="h-6 w-6 text-slate-500" />
          </div>
        )}
        <span className="absolute left-2 top-2 rounded-full bg-slate-950/80 px-2 py-0.5 text-[10px] font-black text-amber-200">
          #{index}
        </span>
      </div>
      <div className="min-w-0 py-1">
        <p className="text-[10px] font-black uppercase tracking-[0.12em] text-amber-300/80">
          {item.item_status}
        </p>
        <h2 className="mt-1 truncate text-base font-black text-white">{item.title}</h2>
        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-slate-400">
          {item.description?.trim() || "No note added yet."}
        </p>
        <p className="mt-2 text-[11px] font-bold text-slate-500">
          {new Date(item.created_at).toLocaleString([], {
            dateStyle: "medium",
            timeStyle: "short",
          })}
        </p>
      </div>
    </article>
  );
}

function buildV2CaptureUrl(sessionId: string, quick?: string) {
  const params = new URLSearchParams({ session: sessionId });
  if (quick) params.set("quick", quick);
  return `${SITE_WALK_CAPTURE_V2_ROUTES.capture}?${params.toString()}`;
}
