import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import AnnotateClient from "./AnnotateClient";

export const metadata = { title: "Annotate — Site Walk" };
export const dynamic = "force-dynamic";

type Params = { sessionId: string; itemId: string };

export default async function AnnotatePage({ params }: { params: Promise<Params> }) {
  const { sessionId, itemId } = await params;
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect(`/login?next=/site-walk/walks/active/${sessionId}/items/${itemId}/annotate`);
  if (!ctx.orgId) redirect("/site-walk/walks");

  const admin = createAdminClient();
  const { data: item } = await admin
    .from("site_walk_items")
    .select("id, session_id, item_type, title, description, s3_key, sort_order")
    .eq("id", itemId)
    .eq("org_id", ctx.orgId)
    .maybeSingle();

  if (!item || item.session_id !== sessionId) notFound();

  // Load siblings for prev/next nav (lightweight: id + sort_order only)
  const { data: siblings } = await admin
    .from("site_walk_items")
    .select("id, sort_order")
    .eq("session_id", sessionId)
    .eq("org_id", ctx.orgId)
    .order("sort_order", { ascending: true });

  const list = siblings ?? [];
  const idx = list.findIndex((s) => s.id === itemId);
  const prevId = idx > 0 ? list[idx - 1].id : null;
  const nextId = idx >= 0 && idx < list.length - 1 ? list[idx + 1].id : null;

  return (
    <AnnotateClient
      sessionId={sessionId}
      itemId={item.id}
      title={item.title || ""}
      description={item.description ?? ""}
      hasPhoto={item.item_type === "photo" && !!item.s3_key}
      thumbnailUrl={item.item_type === "photo" && item.s3_key ? `/api/site-walk/items/${item.id}/image` : null}
      prevItemId={prevId}
      nextItemId={nextId}
      position={idx + 1}
      total={list.length}
    />
  );
}
