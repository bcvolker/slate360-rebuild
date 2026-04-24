import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import DeliverableDetailClient from "./DeliverableDetailClient";

export const metadata = { title: "Deliverable — Site Walk" };
export const dynamic = "force-dynamic";

type Params = { id: string };

export default async function DeliverableDetailPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect(`/login?next=/site-walk/deliverables/${id}`);
  if (!ctx.orgId) redirect("/site-walk");

  const admin = createAdminClient();
  const { data: del } = await admin
    .from("site_walk_deliverables")
    .select("id, title, status, deliverable_type, content, share_token, share_revoked, session_id")
    .eq("id", id)
    .eq("org_id", ctx.orgId)
    .maybeSingle();

  if (!del) notFound();

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-4">
      <Link href="/site-walk/deliverables" className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-cobalt">
        <ChevronLeft className="h-3.5 w-3.5" /> All deliverables
      </Link>
      <DeliverableDetailClient deliverable={del} />
    </div>
  );
}
