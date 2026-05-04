import Link from "next/link";
import { ArrowRight, ClipboardCheck, Clock, FolderOpen } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SiteWalkAssignment, AssignmentPriority, AssignmentStatus } from "@/lib/types/site-walk";

type AssignmentRow = Pick<SiteWalkAssignment, "id" | "title" | "priority" | "status" | "due_date" | "session_id">;

export default async function SiteWalkAssignedWorkPage() {
  const context = await resolveServerOrgContext();
  const assignments = context.orgId && context.user ? await loadAssignments(context.orgId, context.user.id) : [];

  return (
    <main className="min-h-[calc(100dvh-96px)] overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.07),transparent_34%),#0B0F15] px-4 py-4 text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl space-y-4">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-400">Site Walk</p>
          <h1 className="mt-1 text-2xl font-black">Assigned Work</h1>
        </div>

        <section className="space-y-3">
          {assignments.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/20 bg-white/5 p-10 text-center">
              <ClipboardCheck className="mx-auto h-8 w-8 text-slate-500" />
              <p className="mt-3 font-black text-slate-300">No assigned items</p>
              <p className="mt-1 text-sm text-slate-500">Items assigned to you from Site Walk sessions will appear here.</p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Link href="/projects" className="inline-flex items-center gap-2 rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-black text-slate-200 hover:bg-white/20">
                  <FolderOpen className="h-4 w-4" /> Projects
                </Link>
                <Link href="/site-walk" className="inline-flex items-center gap-2 rounded-2xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-400">
                  Site Walk Home
                </Link>
              </div>
            </div>
          ) : (
            assignments.map((a) => <AssignmentCard key={a.id} assignment={a} />)
          )}
        </section>
      </div>
    </main>
  );
}

const PRIORITY_COLOR: Record<AssignmentPriority, string> = {
  low: "text-slate-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

const STATUS_STYLE: Record<AssignmentStatus, string> = {
  pending: "bg-slate-700 text-slate-300",
  acknowledged: "bg-slate-600/60 text-slate-300",
  in_progress: "bg-yellow-700/60 text-yellow-200",
  done: "bg-green-700/60 text-green-200",
  rejected: "bg-red-900/60 text-red-300",
};

function AssignmentCard({ assignment }: { assignment: AssignmentRow }) {
  const due = assignment.due_date
    ? new Date(assignment.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null;
  const statusStyle = STATUS_STYLE[assignment.status] ?? "bg-slate-700 text-slate-300";

  return (
    <Link href={`/site-walk/walks/${assignment.session_id}`} className="flex items-center justify-between gap-4 rounded-3xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm transition hover:border-amber-400/40 hover:bg-white/10">
      <div className="min-w-0 flex-1">
        <h2 className="truncate font-black text-slate-50">{assignment.title}</h2>
        <div className="mt-1 flex items-center gap-3 text-xs">
          <span className={`font-black uppercase ${PRIORITY_COLOR[assignment.priority]}`}>{assignment.priority}</span>
          {due && <span className="flex items-center gap-1 text-slate-500"><Clock className="h-3 w-3" /> Due {due}</span>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <span className={`rounded-full px-2 py-0.5 text-xs font-black uppercase tracking-wider ${statusStyle}`}>
          {assignment.status.replace(/_/g, " ")}
        </span>
        <ArrowRight className="h-4 w-4 text-slate-500" />
      </div>
    </Link>
  );
}

async function loadAssignments(orgId: string, userId: string): Promise<AssignmentRow[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("site_walk_assignments")
    .select("id, title, priority, status, due_date, session_id")
    .eq("org_id", orgId)
    .eq("assigned_to", userId)
    .neq("status", "done")
    .order("created_at", { ascending: false })
    .limit(100);
  return (data ?? []) as AssignmentRow[];
}
