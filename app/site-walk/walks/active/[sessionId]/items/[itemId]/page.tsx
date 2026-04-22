import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import ResolutionCapture from "@/components/site-walk/ResolutionCapture";
import { ArrowLeft, Pencil, FileText } from "lucide-react";

export const metadata = { title: "Item — Site Walk" };
export const dynamic = "force-dynamic";

type Params = { sessionId: string; itemId: string };

const STATUS_STYLES: Record<string, string> = {
  open: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  in_progress: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  resolved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  verified: "bg-emerald-500/25 text-emerald-200 border-emerald-500/40",
  closed: "bg-slate-500/15 text-slate-300 border-slate-500/30",
  na: "bg-slate-500/10 text-slate-400 border-slate-500/20",
};

export default async function ItemDetailPage({ params }: { params: Promise<Params> }) {
  const { sessionId, itemId } = await params;
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect(`/login?next=/site-walk/walks/active/${sessionId}/items/${itemId}`);
  if (!ctx.orgId) redirect("/site-walk/walks");

  const admin = createAdminClient();
  const { data: item } = await admin
    .from("site_walk_items")
    .select("id, session_id, item_type, title, description, s3_key, item_status, priority, before_item_id, item_relationship, audio_s3_key, created_at")
    .eq("id", itemId)
    .eq("org_id", ctx.orgId)
    .maybeSingle();

  if (!item || item.session_id !== sessionId) notFound();

  // Lookup parent if this is a follow-up
  let parentItem: { id: string; title: string | null } | null = null;
  if (item.before_item_id) {
    const { data: parent } = await admin
      .from("site_walk_items")
      .select("id, title")
      .eq("id", item.before_item_id)
      .eq("org_id", ctx.orgId)
      .maybeSingle();
    parentItem = parent ?? null;
  }

  const isPhoto = item.item_type === "photo" && !!item.s3_key;
  const status = (item.item_status as string) ?? "open";
  const needsResolution = isPhoto && (status === "open" || status === "in_progress") && !item.before_item_id;
  const imageUrl = isPhoto ? `/api/site-walk/items/${item.id}/image` : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100">
      <header className="sticky top-0 z-10 bg-[#0a0a0a]/90 backdrop-blur border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href={`/site-walk/walks/active/${sessionId}`}
            className="p-2 -ml-2 rounded-md hover:bg-white/5"
            aria-label="Back to walk"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold flex-1 truncate">{item.title || "Untitled item"}</h1>
          <span className={`text-[11px] px-2 py-0.5 rounded-full border ${STATUS_STYLES[status] ?? STATUS_STYLES.open}`}>
            {status.replace("_", " ")}
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        {parentItem && (
          <Link
            href={`/site-walk/walks/active/${sessionId}/items/${parentItem.id}`}
            className="block text-xs text-cobalt hover:underline"
          >
            ← Linked to: {parentItem.title || "original item"} ({item.item_relationship})
          </Link>
        )}

        {imageUrl && (
          <div className="rounded-xl overflow-hidden border border-white/10 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imageUrl} alt={item.title || "Item"} className="w-full max-h-[60vh] object-contain" />
          </div>
        )}

        {item.description && (
          <p className="text-sm text-slate-300 whitespace-pre-wrap">{item.description}</p>
        )}

        <div className="flex flex-wrap gap-2">
          {isPhoto && (
            <Link
              href={`/site-walk/walks/active/${sessionId}/items/${item.id}/markup`}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-md bg-white/5 hover:bg-white/10 border border-white/10"
            >
              <Pencil className="w-3.5 h-3.5" /> Markup
            </Link>
          )}
          <Link
            href={`/site-walk/walks/active/${sessionId}/items/${item.id}/annotate`}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs rounded-md bg-white/5 hover:bg-white/10 border border-white/10"
          >
            <FileText className="w-3.5 h-3.5" /> Notes
          </Link>
        </div>

        {needsResolution && imageUrl && (
          <ResolutionCapture
            beforeItemId={item.id}
            beforeImageUrl={imageUrl}
            sessionId={sessionId}
          />
        )}
      </main>
    </div>
  );
}
