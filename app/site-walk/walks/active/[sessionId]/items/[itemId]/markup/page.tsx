import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import MarkupClient from "./MarkupClient";

export const metadata = { title: "Markup — Site Walk" };
export const dynamic = "force-dynamic";

type Params = { sessionId: string; itemId: string };

export default async function MarkupPage({ params }: { params: Promise<Params> }) {
  const { sessionId, itemId } = await params;
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect(`/login?next=/site-walk/walks/active/${sessionId}/items/${itemId}/markup`);
  if (!ctx.orgId) redirect("/site-walk/walks");

  const admin = createAdminClient();
  const { data: item } = await admin
    .from("site_walk_items")
    .select("id, session_id, item_type, title, s3_key, metadata")
    .eq("id", itemId)
    .eq("org_id", ctx.orgId)
    .maybeSingle();

  if (!item || item.session_id !== sessionId) notFound();
  if (item.item_type !== "photo" || !item.s3_key) {
    redirect(`/site-walk/walks/active/${sessionId}/items/${itemId}/annotate`);
  }

  const initialSvg =
    typeof (item.metadata as Record<string, unknown> | null)?.markupSvg === "string"
      ? ((item.metadata as Record<string, unknown>).markupSvg as string)
      : null;

  return (
    <MarkupClient
      sessionId={sessionId}
      itemId={item.id}
      title={item.title || "Photo"}
      imageUrl={`/api/site-walk/items/${item.id}/image`}
      initialSvg={initialSvg}
    />
  );
}
