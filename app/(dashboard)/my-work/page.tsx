import Link from "next/link";
import { ArrowRight, ClipboardCheck, Clock, FolderOpen, Plus } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SiteWalkAssignment, AssignmentPriority, AssignmentStatus } from "@/lib/types/site-walk";

export const metadata = {
  title: "My Work — Slate360",
};

type AssignmentRow = Pick<SiteWalkAssignment, "id" | "title" | "priority" | "status" | "due_date" | "session_id">;

export default async function MyWorkPage() {
  const { user, orgId } = await resolveServerOrgContext();

  const assignments: AssignmentRow[] = [];
  if (orgId && user) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("site_walk_assignments")
      .select("id, title, priority, status, due_date, session_id")
      .eq("org_id", orgId)
      .eq("assigned_to", user.id)
      .neq("status", "done")
      .order("created_at", { ascending: false })
      .limit(50);
    assignments.push(...((data ?? []) as AssignmentRow[]));
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8 lg:py-8">
      <header>
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-400">My Work</p>
        <h1 className="mt-1 text-2xl font-black text-slate-50">Tasks &amp; reviews</h1>
      </header>

      {assignments.length > 0 ? (
        <section className="space-y-3">
          {assignments.map((a) => (
            <Link key={a.id} href={`/site-walk/walks/${a.session_id}`} className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition hover:border-blue-500/40 hover:bg-white/10">
              <div className="min-w-0 flex-1">
                <p className="truncate font-black text-slate-50">{a.title}</p>
                <div className="mt-0.5 flex items-center gap-3 text-xs">
                  <span className={priorityColor(a.priority)}>{a.priority}</span>
                  {a.due_date && <span className="flex items-center gap-1 text-slate-500"><Clock className="h-3 w-3" /> {formatDate(a.due_date)}</span>}
                </div>
              </div>
              <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-black uppercase tracking-wide ${statusColor(a.status)}`}>
                {a.status.replace(/_/g, " ")}
              </span>
            </Link>
          ))}
        </section>
      ) : (
        <section className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-10 text-center">
          <ClipboardCheck className="mx-auto h-7 w-7 text-slate-500" />
          <p className="mt-3 text-sm font-black text-slate-300">No active assignments</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Items assigned to you from Site Walk sessions will appear here.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link href="/projects" className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-slate-200 hover:bg-white/20">
              <FolderOpen className="h-4 w-4" /> Projects
            </Link>
            <Link href="/site-walk" className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-black text-white hover:bg-blue-500">
              <Plus className="h-4 w-4" /> Start a Walk
            </Link>
          </div>
        </section>
      )}

      <section className="rounded-3xl border border-white/10 bg-white/5 p-4">
        <Link href="/site-walk/assigned-work" className="flex items-center justify-between text-sm text-slate-400 hover:text-slate-200">
          <span>All assigned items in Site Walk</span>
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    </div>
  );
}

function priorityColor(p: AssignmentPriority) {
  return p === "critical" ? "font-black text-red-400" : p === "high" ? "font-black text-orange-400" : p === "medium" ? "font-black text-yellow-400" : "font-black text-slate-400";
}

function statusColor(s: AssignmentStatus) {
  return s === "acknowledged" ? "bg-blue-700/60 text-blue-200" : s === "in_progress" ? "bg-yellow-700/60 text-yellow-200" : "bg-slate-700 text-slate-300";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
