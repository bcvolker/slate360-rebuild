import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import NewDeliverableClient from "./NewDeliverableClient";

export const metadata = { title: "New deliverable — Site Walk" };
export const dynamic = "force-dynamic";

export default async function NewDeliverablePage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/site-walk/deliverables/new");
  if (!ctx.orgId) redirect("/site-walk");

  const admin = createAdminClient();
  const { data: sessions } = await admin
    .from("site_walk_sessions")
    .select("id, title, created_at")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false })
    .limit(40);

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <Link href="/site-walk/deliverables" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-cobalt">
        <ChevronLeft className="h-3.5 w-3.5" /> All deliverables
      </Link>
      <h1 className="text-xl font-semibold">New deliverable</h1>
      <NewDeliverableClient sessions={sessions ?? []} />
    </div>
  );
}
