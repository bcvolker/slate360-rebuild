import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ProjectDashboardGrid from "@/components/project-hub/ProjectDashboardGrid";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { ClipboardList, FileCheck2, CalendarCheck2, DollarSign, Users, Camera, Pencil, MapPin, BookOpen, ShieldAlert, ChevronRight } from "lucide-react";

export default async function ProjectHubProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/project-hub/${projectId}`)}`);
  }

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
    { label: "Open RFIs", value: openRfis, sub: `${rfisData.length} total`, href: `/project-hub/${projectId}/rfis`, color: "#1E3A8A", Icon: ClipboardList },
    { label: "Submittals", value: openSubmittals, sub: "pending review", href: `/project-hub/${projectId}/submittals`, color: "#7C3AED", Icon: FileCheck2 },
    { label: "Schedule Tasks", value: pendingTasks, sub: "active tasks", href: `/project-hub/${projectId}/schedule`, color: "#FF4D00", Icon: CalendarCheck2 },
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
          <Link key={label} href={href} className="group rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition-all flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Icon size={16} style={{ color }} />
              <ChevronRight size={12} className="text-gray-300 group-hover:text-gray-500 transition-colors" />
            </div>
            <p className="text-2xl font-black text-gray-900">{value}</p>
            <div>
              <p className="text-xs font-semibold text-gray-700">{label}</p>
              {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Draggable widget grid */}
        <div className="xl:col-span-2">
          <ProjectDashboardGrid projectId={projectId} project={project} />
        </div>

        {/* Schedule snapshot + tool quick-links */}
        <div className="flex flex-col gap-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <CalendarCheck2 size={14} className="text-[#FF4D00]" /> Upcoming Schedule
              </h3>
              <Link href={`/project-hub/${projectId}/schedule`} className="text-[10px] font-bold text-[#FF4D00] hover:underline">Open Schedule →</Link>
            </div>
            {nextTasks.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">No pending tasks.</p>
            ) : (
              <ul className="space-y-2">
                {nextTasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: t.status === "In Progress" ? "#FF4D00" : "#d1d5db" }} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{t.name}</p>
                      <p className="text-[10px] text-gray-400">{t.end_date ? `Due ${new Date(t.end_date).toLocaleDateString()}` : "No due date"} · {t.status}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-black text-gray-900 mb-3">All Tools</h3>
            <div className="grid grid-cols-3 gap-2">
              {toolLinks.map(({ label, href, Icon }) => (
                <Link key={label} href={href} className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-[#FF4D00]/5 hover:border-[#FF4D00]/30 transition-all text-center">
                  <Icon size={14} className="text-gray-500" />
                  <span className="text-[10px] font-semibold text-gray-700 leading-tight">{label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}