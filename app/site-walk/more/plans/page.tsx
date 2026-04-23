import { redirect } from "next/navigation";
import Link from "next/link";
import { Map as MapIcon, Plus } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata = { title: "Plans — Site Walk" };
export const dynamic = "force-dynamic";

export default async function PlansGatewayPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/site-walk/more/plans");
  if (!ctx.orgId) redirect("/site-walk");

  const admin = createAdminClient();
  const { data: sessions } = await admin
    .from("site_walk_sessions")
    .select("id, title, status, created_at")
    .eq("org_id", ctx.orgId)
    .order("created_at", { ascending: false })
    .limit(40);

  return (
    <div className="p-4 max-w-2xl mx-auto space-y-5">
      <header>
        <h1 className="text-xl font-semibold flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-cobalt" /> Plans &amp; Pins
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Pick a session to upload floor plans and pin captured items to locations.
        </p>
      </header>

      {(!sessions || sessions.length === 0) ? (
        <div className="text-center py-10 border border-dashed border-white/10 rounded-xl">
          <p className="text-sm text-slate-400 mb-3">No sessions yet.</p>
          <Link
            href="/site-walk/walks"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cobalt hover:bg-cobalt-hover text-primary-foreground text-sm"
          >
            <Plus className="h-4 w-4" /> Start a walk
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link
                href={`/site-walk/more/plans/${s.id}`}
                className="block p-3 rounded-lg border border-white/10 bg-white/[0.02] hover:bg-cobalt/[0.06] hover:border-cobalt/30 transition"
              >
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-slate-100 truncate">{s.title}</span>
                  <span className="text-xs text-slate-500 capitalize">{s.status}</span>
                </div>
                <div className="text-xs text-slate-500 mt-0.5">
                  {new Date(s.created_at).toLocaleDateString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
