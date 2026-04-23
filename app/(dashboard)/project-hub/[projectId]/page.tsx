import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ProjectDashboardGrid from "@/components/project-hub/ProjectDashboardGrid";
import { createAdminClient } from "@/lib/supabase/admin";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ClipboardList, FileCheck2, CalendarCheck2, DollarSign, Users, Camera, Pencil, MapPin, BookOpen, ShieldAlert, ChevronRight } from "lucide-react";

export default async function ProjectHubProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const { user, tier } = await resolveServerOrgContext();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/project-hub/${projectId}`)}`);
  }

  const userName =
    (typeof user.user_metadata?.full_name === "string" && user.user_metadata.full_name.trim()) ||
    (typeof user.user_metadata?.name === "string" && user.user_metadata.name.trim()) ||
    (typeof user.email === "string" && user.email.split("@")[0]) ||
    "User";
  const userSummary = { name: userName, email: user.email ?? "" };

  const { project: rawProject } = await getScopedProjectForUser(user.id, projectId, "id, name, status, metadata, description, created_at");
  if (!rawProject) notFound();

  const project = rawProject as any;

  // Parallel stats queries — wrapped in try/catch to handle missing tables gracefully
  const admin = createAdminClient();
  let rfisData: any[] = [];
  let submittalsData: any[] = [];
  let allTasks: any[] = [];
  let budgetData: any = null;
  let memberCount = 0;

  try {
    const safe = <T,>(p: PromiseLike<{ data: T | null }>): Promise<{ data: T | null }> =>
      Promise.resolve(p).catch(() => ({ data: null }));

    const [rfis, submittals, tasks, budget, members] = await Promise.all([
      safe(admin.from("project_rfis").select("id, status").eq("project_id", projectId)),
      safe(admin.from("project_submittals").select("id, status").eq("project_id", projectId)),
      safe(admin.from("project_tasks").select("id, status, name, start_date, end_date").eq("project_id", projectId).order("start_date", { ascending: true }).limit(20)),
      safe(admin.from("project_budgets").select("total_budget, spent").eq("project_id", projectId).maybeSingle()),
      safe(admin.from("project_members").select("id").eq("project_id", projectId)),
    ]);
    rfisData = (rfis.data as any[]) ?? [];
    submittalsData = (submittals.data as any[]) ?? [];
    allTasks = (tasks.data as any[]) ?? [];
    budgetData = budget.data;
    memberCount = (members.data as any[] | null)?.length ?? 0;
  } catch {
    // If tables don't exist yet, gracefully degrade to zeros
  }

  const openRfis = rfisData.filter((r: any) => r.status === "open" || r.status === "Open").length;
  const openSubmittals = submittalsData.filter((s: any) => s.status !== "approved" && s.status !== "Approved").length;
  const pendingTasks = allTasks.filter((t: any) => t.status !== "Completed" && t.status !== "Done").length;

  const stats = [
    { label: "Open RFIs", value: openRfis, sub: `${rfisData.length} total`, href: `/project-hub/${projectId}/rfis`, color: "#3B82F6", Icon: ClipboardList },
    { label: "Submittals", value: openSubmittals, sub: "pending review", href: `/project-hub/${projectId}/submittals`, color: "#7C3AED", Icon: FileCheck2 },
    { label: "Schedule Tasks", value: pendingTasks, sub: "active tasks", href: `/project-hub/${projectId}/schedule`, color: "#3B82F6", Icon: CalendarCheck2 },
    { label: "Budget", value: "View", sub: "Financials", href: `/project-hub/${projectId}/budget`, color: "#059669", Icon: DollarSign },
    { label: "Team Members", value: memberCount, sub: "on this project", href: `/project-hub/${projectId}`, color: "#0891B2", Icon: Users },
    { label: "Punch List", value: "View", sub: "Open items", href: `/project-hub/${projectId}/punch-list`, color: "#DC2626", Icon: ShieldAlert },
  ];

  const toolLinks = [
    { label: "RFIs", href: `/project-hub/${projectId}/rfis`, Icon: ClipboardList },
    { label: "Submittals", href: `/project-hub/${projectId}/submittals`, Icon: FileCheck2 },
    { label: "Schedule", href: `/project-hub/${projectId}/schedule`, Icon: CalendarCheck2 },
    { label: "Budget", href: `/project-hub/${projectId}/budget`, Icon: DollarSign },
    { label: "Daily Logs", href: `/project-hub/${projectId}/daily-logs`, Icon: BookOpen },
    { label: "Photos", href: `/project-hub/${projectId}/photos`, Icon: Camera },
    { label: "Drawings", href: `/project-hub/${projectId}/drawings`, Icon: Pencil },
    { label: "SlateDrop", href: `/project-hub/${projectId}/slatedrop`, Icon: MapPin },
    { label: "Punch List", href: `/project-hub/${projectId}/punch-list`, Icon: ShieldAlert },
  ];

  const nextTasks = allTasks.filter((t: any) => t.status !== "Completed" && t.status !== "Done").slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map(({ label, value, sub, href, color, Icon }) => (
          <Link key={label} href={href} className="surface-raised-interactive group p-4 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Icon size={16} style={{ color }} />
              <ChevronRight size={12} className="text-muted-foreground group-hover:text-cobalt transition-colors" />
            </div>
            <p className="text-2xl font-black text-foreground">{value}</p>
            <div>
              <p className="text-xs font-semibold text-foreground">{label}</p>
              {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Draggable widget grid */}
        <div className="xl:col-span-2">
          <ProjectDashboardGrid projectId={projectId} project={project} user={userSummary} tier={tier} />
        </div>

        {/* Schedule snapshot + tool quick-links */}
        <div className="flex flex-col gap-4">
          <div className="surface-raised p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-foreground flex items-center gap-2">
                <CalendarCheck2 size={14} className="text-[#3B82F6]" /> Upcoming Schedule
              </h3>
              <Link href={`/project-hub/${projectId}/schedule`} className="text-[10px] font-bold text-[#3B82F6] hover:underline">Open Schedule →</Link>
            </div>
            {nextTasks.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No pending tasks.</p>
            ) : (
              <ul className="space-y-2">
                {nextTasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-muted/30 border border-app">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: t.status === "In Progress" ? "#3B82F6" : "#d1d5db" }} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground">{t.end_date ? `Due ${new Date(t.end_date).toLocaleDateString()}` : "No due date"} · {t.status}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="surface-raised p-5">
            <h3 className="text-sm font-black text-foreground mb-3">All Tools</h3>
            <div className="grid grid-cols-3 gap-2">
              {toolLinks.map(({ label, href, Icon }) => (
                <Link key={label} href={href} className="surface-raised-interactive flex flex-col items-center gap-1.5 p-2.5 text-center">
                  <Icon size={14} className="text-muted-foreground" />
                  <span className="text-[10px] font-semibold text-foreground leading-tight">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}