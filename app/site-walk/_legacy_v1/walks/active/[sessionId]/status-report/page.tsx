import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import StatusReportClient from "./StatusReportClient";
import { ArrowLeft } from "lucide-react";

export const metadata = { title: "Status Report — Site Walk" };
export const dynamic = "force-dynamic";

type Params = { sessionId: string };

export default async function StatusReportPage({ params }: { params: Promise<Params> }) {
  const { sessionId } = await params;
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect(`/login?next=/site-walk/walks/active/${sessionId}/status-report`);
  if (!ctx.orgId) redirect("/site-walk/walks");

  const admin = createAdminClient();

  const { data: session } = await admin
    .from("site_walk_sessions")
    .select("id, title, project_id, projects(name)")
    .eq("id", sessionId)
    .eq("org_id", ctx.orgId)
    .maybeSingle();

  if (!session) notFound();

  const { count: openCount } = await admin
    .from("site_walk_items")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("org_id", ctx.orgId)
    .in("item_status", ["open", "in_progress"]);

  const { count: totalCount } = await admin
    .from("site_walk_items")
    .select("id", { count: "exact", head: true })
    .eq("session_id", sessionId)
    .eq("org_id", ctx.orgId);

  const proj = session.projects as { name: string } | { name: string }[] | null;
  const projectName = Array.isArray(proj) ? proj[0]?.name : proj?.name;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100">
      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link
            href={`/site-walk/walks/active/${sessionId}`}
            className="p-2 -ml-2 rounded-md hover:bg-white/5"
            aria-label="Back to walk"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Status report</p>
            <h1 className="text-base font-semibold truncate">{session.title || "Untitled walk"}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <StatusReportClient
          sessionId={sessionId}
          sessionTitle={session.title ?? "Untitled walk"}
          projectName={projectName ?? null}
          totalItems={totalCount ?? 0}
          openItems={openCount ?? 0}
        />
      </main>
    </div>
  );
}
