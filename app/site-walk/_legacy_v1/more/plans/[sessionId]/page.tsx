import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import PlansClient from "./PlansClient";

export const metadata = { title: "Session Plans — Site Walk" };
export const dynamic = "force-dynamic";

type Params = { sessionId: string };

export default async function SessionPlansPage({ params }: { params: Promise<Params> }) {
  const { sessionId } = await params;
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect(`/login?next=/site-walk/more/plans/${sessionId}`);
  if (!ctx.orgId) redirect("/site-walk/more/plans");

  const admin = createAdminClient();
  const { data: session } = await admin
    .from("site_walk_sessions")
    .select("id, title")
    .eq("id", sessionId)
    .eq("org_id", ctx.orgId)
    .maybeSingle();

  if (!session) notFound();

  const { data: items } = await admin
    .from("site_walk_items")
    .select("id, title, item_type")
    .eq("session_id", sessionId)
    .eq("org_id", ctx.orgId)
    .order("sort_order", { ascending: true });

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-4">
      <Link href="/site-walk/more/plans" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-cobalt">
        <ChevronLeft className="h-3.5 w-3.5" /> All sessions
      </Link>
      <h1 className="text-xl font-semibold truncate">{session.title}</h1>
      <PlansClient sessionId={sessionId} items={items ?? []} />
    </div>
  );
}
