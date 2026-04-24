import { redirect } from "next/navigation";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Deliverables — Site Walk" };
export const dynamic = "force-dynamic";

type Row = {
  id: string;
  title: string;
  status: string;
  deliverable_type: string;
  share_token: string | null;
  updated_at: string;
  session_id: string;
};

export default async function DeliverablesPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/site-walk/deliverables");
  if (!ctx.orgId) redirect("/site-walk");

  const admin = createAdminClient();
  const { data } = await admin
    .from("site_walk_deliverables")
    .select("id, title, status, deliverable_type, share_token, updated_at, session_id")
    .eq("org_id", ctx.orgId)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(50);

  const rows: Row[] = data ?? [];

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      <header>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <FileText className="h-5 w-5 text-cobalt" /> Deliverables
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Reports built from your walks. Pick a session to draft a new one.
        </p>
      </header>

      <Link
        href="/site-walk/deliverables/new"
        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-cobalt hover:bg-cobalt-hover text-primary-foreground text-sm"
      >
        <Plus className="h-4 w-4" /> New deliverable
      </Link>

      {rows.length === 0 ? (
        <p className="text-sm text-slate-500">No deliverables yet.</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/site-walk/deliverables/${r.id}`}
                className="block p-3 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-cobalt/[0.06] hover:border-cobalt/30 transition"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-100 truncate">{r.title}</span>
                  <span className="text-xs text-slate-500 capitalize">{r.status}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5 capitalize">
                  {r.deliverable_type.replace("_", " ")} · updated {new Date(r.updated_at).toLocaleDateString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
