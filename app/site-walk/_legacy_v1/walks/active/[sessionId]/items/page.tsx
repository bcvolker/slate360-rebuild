import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import WalkItemsBrowse, { type BrowseItem } from "@/components/site-walk/WalkItemsBrowse";
import { ArrowLeft, Camera } from "lucide-react";

export const metadata = { title: "Items — Site Walk" };
export const dynamic = "force-dynamic";

type Params = { sessionId: string };

export default async function WalkItemsBrowsePage({ params }: { params: Promise<Params> }) {
  const { sessionId } = await params;
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect(`/login?next=/site-walk/walks/active/${sessionId}/items`);
  if (!ctx.orgId) redirect("/site-walk/walks");

  const admin = createAdminClient();

  const { data: session } = await admin
    .from("site_walk_sessions")
    .select("id, title, project_id")
    .eq("id", sessionId)
    .eq("org_id", ctx.orgId)
    .maybeSingle();

  if (!session) notFound();

  const { data: rows } = await admin
    .from("site_walk_items")
    .select(
      "id, item_type, title, description, s3_key, item_status, priority, created_at, sort_order"
    )
    .eq("session_id", sessionId)
    .eq("org_id", ctx.orgId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const items: BrowseItem[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    item_type: r.item_type as string,
    title: (r.title as string | null) ?? "",
    description: (r.description as string | null) ?? "",
    has_photo: r.item_type === "photo" && !!r.s3_key,
    item_status: (r.item_status as string | null) ?? "open",
    priority: (r.priority as string | null) ?? null,
    created_at: r.created_at as string,
  }));

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100">
      <header className="sticky top-0 z-10 bg-[#0a0a0a]/90 backdrop-blur border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href={`/site-walk/walks/active/${sessionId}`}
            className="p-2 -ml-2 rounded-md hover:bg-white/5"
            aria-label="Back to walk"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Walk items</p>
            <h1 className="text-base font-semibold truncate">{session.title || "Untitled walk"}</h1>
          </div>
          <Link
            href={`/site-walk/walks/active/${sessionId}`}
            className="inline-flex items-center gap-1.5 bg-cobalt hover:bg-cobalt/90 text-primary-foreground text-xs font-medium px-3 py-2 rounded-md"
          >
            <Camera className="w-3.5 h-3.5" /> Capture
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <WalkItemsBrowse sessionId={sessionId} initialItems={items} />
      </main>
    </div>
  );
}
