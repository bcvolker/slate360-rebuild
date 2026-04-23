import { notFound, redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { SiteWalkSessionProvider } from "@/components/site-walk/SiteWalkSessionProvider";
import type { CapturedItem } from "@/components/site-walk/SiteWalkSessionProvider";

export const dynamic = "force-dynamic";

type Params = { sessionId: string };

interface ItemRow {
  id: string;
  item_type: string;
  title: string | null;
  s3_key: string | null;
  captured_at: string;
}

/**
 * Wraps every route under /site-walk/walks/active/[sessionId]/* with the
 * SiteWalkSessionProvider so the capture screen, markup screen, and
 * annotate screen all share one in-memory draft and one synced item list.
 *
 * Initial items are server-loaded so the "12 items" badge renders without
 * a client round-trip on first paint.
 */
export default async function ActiveSessionLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<Params>;
}) {
  const { sessionId } = await params;
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect(`/login?next=/site-walk/walks/active/${sessionId}`);
  if (!ctx.orgId) redirect("/site-walk/walks");

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("site_walk_sessions")
    .select("id")
    .eq("id", sessionId)
    .eq("org_id", ctx.orgId)
    .maybeSingle();

  if (!session) notFound();

  const { data: rows } = await admin
    .from("site_walk_items")
    .select("id, item_type, title, s3_key, captured_at")
    .eq("session_id", sessionId)
    .eq("org_id", ctx.orgId)
    .order("captured_at", { ascending: false })
    .limit(200);

  const initialItems: CapturedItem[] = (rows ?? []).map((r: ItemRow) => ({
    id: r.id,
    type: r.item_type,
    title: r.title ?? "",
    capturedAt: r.captured_at,
  }));

  return (
    <SiteWalkSessionProvider sessionId={sessionId} initialItems={initialItems}>
      {children}
    </SiteWalkSessionProvider>
  );
}
