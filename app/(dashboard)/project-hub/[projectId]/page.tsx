import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import ProjectDashboardGrid from "@/components/project-hub/ProjectDashboardGrid";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getScopedProjectForUser } from "@/lib/projects/access";
import {
  ClipboardList,
  FileCheck2,
  CalendarCheck2,
  DollarSign,
  Users,
  Camera,
  Pencil,
  MapPin,
  BookOpen,
  ShieldAlert,
  ChevronRight,
} from "lucide-react";

type ProjectHubProjectPageProps = {
  params: Promise<{ projectId: string }>;
};

type StatCard = {
  label: string;
  value: string | number;
  sub?: string;
  href: string;
  color: string;
  Icon: React.ElementType;
};

export default async function ProjectHubProjectPage({ params }: ProjectHubProjectPageProps) {
  const { projectId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/project-hub/${projectId}`)}`);
  }

  const { project: rawProject } = await getScopedProjectForUser(user.id, projectId, "id, name, status, metadata, description, created_at");

  if (!rawProject) {
    notFound();
  }

  type ProjectRow = {
    id: string;
    name: string;
    status: string;
    metadata: Record<string, unknown> | null;
    description?: string | null;
    created_at?: string;
  };
  const project = rawProject as unknown as ProjectRow;

  // ── Parallel stats queries ──────────────────────────────────────────────
  const admin = createAdminClient();
  const [rfis, submittals, tasks, budget, members] =
    await Promise.all([
      admin.from("project_rfis").select("id, status").eq("project_id", projectId),
      admin.from("project_submittals").select("id, status").eq("project_id", projectId),
      admin.from("project_tasks").select("id, status, name, start_date, end_date").eq("project_id", projectId).order("start_date", { ascending: true }).limit(20),
      admin.from("project_budgets").select("total_budget, spent").eq("project_id", projectId).maybeSingle(),
      admin.from("project_members").select("id").eq("project_id", projectId),
    ]);

  const openRfis = (rfis.data ?? []).filter((r) => r.status === "open" || r.status === "Open").length;
  const totalRfis = rfis.data?.length ?? 0;
  const openSubmittals = (submittals.data ?? []).filter((s) => s.status !== "approved" && s.status !== "Approved").length;
  const totalSubmittals = submittals.data?.length ?? 0;

  const allTasks = tasks.data ?? [];
  const pendingTasks = allTasks.filter((t) => t.status !== "Completed" && t.status !== "Done").length;
  const upcomingTasks = allTasks.filter((t) => {
    if (!t.end_date) return false;
    const due = new Date(t.end_date);
    const now = new Date();
    const inOneWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return due >= now && due <= inOneWeek;
  });

  const budgetTotal = (budget.data as { total_budget?: number | null; spent?: number | null } | null)?.total_budget ?? null;
  const budgetSpent = (budget.data as { total_budget?: number | null; spent?: number | null } | null)?.spent ?? null;
  const budgetPct = budgetTotal && budgetSpent ? Math.round((budgetSpent / budgetTotal) * 100) : null;

  const memberCount = members.data?.length ?? 0;

  const stats: StatCard[] = [
    {
      label: "Open RFIs",
      value: openRfis,
      sub: `${totalRfis} total`,
      href: `/project-hub/${projectId}/rfis`,
      color: "#1E3A8A",
      Icon: ClipboardList,
    },
    {
      label: "Submittals",
      value: openSubmittals,
      sub: `${totalSubmittals} total • pending review`,
      href: `/project-hub/${projectId}/submittals`,
      color: "#7C3AED",
      Icon: FileCheck2,
    },
    {
      label: "Schedule Tasks",
      value: pendingTasks,
      sub: upcomingTasks.length > 0 ? `${upcomingTasks.length} due this week` : "No deadlines this week",
      href: `/project-hub/${projectId}/schedule`,
      color: "#FF4D00",
      Icon: CalendarCheck2,
    },
    {
      label: "Budget",
      value: budgetTotal ? `$${(budgetTotal / 1000).toFixed(0)}k` : "—",
      sub: budgetPct !== null ? `${budgetPct}% spent` : "Not configured",
      href: `/project-hub/${projectId}/budget`,
      color: "#059669",
      Icon: DollarSign,
    },
    {
      label: "Team Members",
      value: memberCount,
      sub: "on this project",
      href: `/project-hub/${projectId}`,
      color: "#0891B2",
      Icon: Users,
    },
    {
      label: "Punch List",
      value: "View",
      sub: "Open items & inspections",
      href: `/project-hub/${projectId}/punch-list`,
      color: "#DC2626",
      Icon: ShieldAlert,
    },
  ];

  const toolLinks = [
    { label: "RFIs", href: `/project-hub/${projectId}/rfis`, Icon: ClipboardList },
    { label: "Submittals", href: `/project-hub/${projectId}/submittals`, Icon: FileCheck2 },
    { label: "Schedule", href: `/project-hub/${projectId}/schedule`, Icon: CalendarCheck2 },
    { label: "Budget", href: `/project-hub/${projectId}/budget`, Icon: DollarSign },
    { label: "Daily Logs", href: `/project-hub/${projectId}/daily-logs`, Icon: BookOpen },
    { label: "Photos", href: `/project-hub/${projectId}/photos`, Icon: Camera },
    { label: "Drawings", href: `/project-hub/${projectId}/drawings`, Icon: Pencil },
    { label: "Files", href: `/project-hub/${projectId}/files`, Icon: MapPin },
    { label: "Punch List", href: `/project-hub/${projectId}/punch-list`, Icon: ShieldAlert },
  ];

  // ── Upcoming tasks snippet ───────────────────────────────────────────────
  const nextTasks = allTasks
    .filter((t) => t.status !== "Completed" && t.status !== "Done")
    .slice(0, 4);

  const meta = project.metadata;
  const address = typeof meta?.address === "string" ? meta.address : null;
  const description = typeof project.description === "string" ? project.description : null;

  return (
    <div className="space-y-8">

      {/* ── Project meta strip ─────────────────────────────────────── */}
      {(address || description) && (
        <div className="flex flex-wrap gap-4 text-sm text-gray-500">
          {address && (
            <span className="flex items-center gap-1.5">
              <MapPin size={13} className="text-[#FF4D00]" />
              {address}
            </span>
          )}
          {description && <span className="text-gray-400">— {description}</span>}
        </div>
      )}

      {/* ── Stats grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {stats.map(({ label, value, sub, href, color, Icon }) => (
          <Link
            key={label}
            href={href}
            className="group rounded-2xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow-md hover:border-gray-300 transition-all flex flex-col gap-2"
          >
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

      {/* ── Two-column content: grid + schedule snapshot ───────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

        {/* Draggable widget grid (takes 2/3 width on xl) */}
        <div className="xl:col-span-2">
          <ProjectDashboardGrid projectId={projectId} project={project} />
        </div>

        {/* Schedule snapshot + tool quick-links (1/3 width) */}
        <div className="flex flex-col gap-4">

          {/* Upcoming tasks */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-gray-900 flex items-center gap-2">
                <CalendarCheck2 size={14} className="text-[#FF4D00]" />
                Upcoming Schedule
              </h3>
              <Link href={`/project-hub/${projectId}/schedule`} className="text-[10px] font-bold text-[#FF4D00] hover:underline">
                Open Schedule →
              </Link>
            </div>
            {nextTasks.length === 0 ? (
              <p className="text-xs text-gray-400 py-2">No pending tasks. Add tasks in the Schedule view.</p>
            ) : (
              <ul className="space-y-2">
                {nextTasks.map((t) => (
                  <li key={t.id} className="flex items-start gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: t.status === "In Progress" ? "#FF4D00" : "#d1d5db" }} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">{t.name}</p>
                      <p className="text-[10px] text-gray-400">
                        {t.end_date ? `Due ${new Date(t.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : "No due date"}
                        {" · "}{t.status}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Tool quick-links */}
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-black text-gray-900 mb-3">All Tools</h3>
            <div className="grid grid-cols-3 gap-2">
              {toolLinks.map(({ label, href, Icon }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex flex-col items-center gap-1.5 p-2.5 rounded-xl border border-gray-100 bg-gray-50 hover:bg-[#FF4D00]/5 hover:border-[#FF4D00]/30 transition-all text-center"
                >
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
