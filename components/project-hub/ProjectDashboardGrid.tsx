"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart2,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  Clock,
  ClipboardList,
  DollarSign,
  FileCheck2,
  FileText,
  FolderOpen,
  Info,
  Layers,
  MapPin,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  Sun,
  TrendingDown,
  TrendingUp,
  Zap,
} from "lucide-react";
import WidgetCard from "@/components/widgets/WidgetCard";
import WidgetCustomizeDrawer from "@/components/widgets/WidgetCustomizeDrawer";
import CompanyProfileModal from "@/components/shared/CompanyProfileModal";
import { loadWidgetPrefs, saveWidgetPrefs, WIDGET_PREFS_SCHEMA_VERSION } from "@/components/widgets/widget-prefs-storage";
import { WeatherWidgetBody } from "@/components/widgets/WidgetBodies";
import type { WidgetMeta, WidgetPref, WidgetSize } from "@/components/widgets/widget-meta";
import { getWidgetSpan } from "@/components/widgets/widget-meta";
import LocationMap from "@/components/dashboard/LocationMap";
import { useProjectProfile } from "@/lib/hooks/useProjectProfile";

/* ─── Types ──────────────────────────────────────────────────── */
type ProjectGridProject = {
  name?: string;
  description?: string | null;
  status?: string;
  created_at?: string;
  metadata?: { location?: string; address?: string; city?: string; state?: string };
};
type RecentFile   = { id: string; name: string };
type TaskSnap     = { id: string; name: string; status: string; end_date: string | null; percent_complete: number };
type BudgetTotals = { budget: number; spent: number; changeOrders: number };

/* ─── Widget metadata ─────────────────────────────────────────── */
const PROJECT_WIDGET_META: WidgetMeta[] = [
  { id: "project-info",      label: "Project Info",       icon: Info,           color: "#1E3A8A" },
  { id: "location",          label: "Site Location",      icon: MapPin,         color: "#1E3A8A" },
  { id: "weather",           label: "Weather",            icon: Sun,            color: "#0891B2" },
  { id: "budget-snapshot",   label: "Budget Snapshot",    icon: BarChart2,      color: "#059669" },
  { id: "schedule-snapshot", label: "Schedule Snapshot",  icon: CalendarCheck2, color: "#FF4D00" },
  { id: "quick-actions",     label: "Quick Actions",      icon: Zap,            color: "#7C3AED" },
  { id: "slatedrop",         label: "SlateDrop",          icon: FolderOpen,     color: "#FF4D00" },
  { id: "continue",          label: "Continue Working",   icon: Clock,          color: "#FF4D00" },
];

function fmtUsd(v: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", notation: "compact", maximumFractionDigits: 1 }).format(v);
}

function buildProjectDefaultPrefs(): WidgetPref[] {
  return PROJECT_WIDGET_META.map((widget, index) => ({
    id: widget.id,
    visible: true,
    size: "default" as WidgetSize,
    order: index,
  }));
}

export default function ProjectDashboardGrid({
  projectId,
  project,
}: {
  projectId: string;
  project: ProjectGridProject;
}) {
  const [files, setFiles]                 = useState<RecentFile[]>([]);
  const [tasks, setTasks]                 = useState<TaskSnap[]>([]);
  const [budgetTotals, setBudgetTotals]   = useState<BudgetTotals | null>(null);
  const [rfiCount, setRfiCount]           = useState<{ open: number; total: number } | null>(null);
  const [subCount, setSubCount]           = useState<{ pending: number; total: number } | null>(null);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [profileOpen, setProfileOpen]     = useState(false);
  const [dragIdx, setDragIdx]             = useState<number | null>(null);

  const { company, project: profile, saveCompany } = useProjectProfile(projectId);

  const storageKey = `slate360-project-widgets-v${WIDGET_PREFS_SCHEMA_VERSION}-${projectId}`;
  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPref[]>(() =>
    loadWidgetPrefs(storageKey, buildProjectDefaultPrefs()),
  );

  /* ── Fetch widget data ───────────────────────────────────────── */
  useEffect(() => {
    let active = true;
    const fetchAll = async () => {
      try {
        const [filesRes, tasksRes, budgetRes, rfiRes, subRes] = await Promise.allSettled([
          fetch(`/api/projects/${projectId}/recent-files`, { cache: "no-store" }).then((r) => r.json()),
          fetch(`/api/projects/${projectId}/schedule`, { cache: "no-store" }).then((r) => r.json()),
          fetch(`/api/projects/${projectId}/budget`, { cache: "no-store" }).then((r) => r.json()),
          fetch(`/api/projects/${projectId}/rfis`, { cache: "no-store" }).then((r) => r.json()),
          fetch(`/api/projects/${projectId}/submittals`, { cache: "no-store" }).then((r) => r.json()),
        ]);
        if (!active) return;

        if (filesRes.status === "fulfilled") {
          const p = filesRes.value as { files?: RecentFile[] };
          setFiles(Array.isArray(p.files) ? p.files : []);
        }
        if (tasksRes.status === "fulfilled") {
          const p = tasksRes.value as { tasks?: TaskSnap[] };
          setTasks(Array.isArray(p.tasks) ? p.tasks : []);
        }
        if (budgetRes.status === "fulfilled") {
          const p = budgetRes.value as { budgetRows?: Array<{ budget_amount: number; spent_amount: number; change_order_amount: number }> };
          const rows = p.budgetRows ?? [];
          if (rows.length > 0) {
            setBudgetTotals(rows.reduce((acc, r) => ({
              budget: acc.budget + Number(r.budget_amount ?? 0),
              spent:  acc.spent  + Number(r.spent_amount  ?? 0),
              changeOrders: acc.changeOrders + Number(r.change_order_amount ?? 0),
            }), { budget: 0, spent: 0, changeOrders: 0 }));
          }
        }
        if (rfiRes.status === "fulfilled") {
          const p = rfiRes.value as { rfis?: Array<{ status: string }> };
          const rfis = p.rfis ?? [];
          setRfiCount({ open: rfis.filter((r) => r.status === "open" || r.status === "Open").length, total: rfis.length });
        }
        if (subRes.status === "fulfilled") {
          const p = subRes.value as { submittals?: Array<{ status: string }> };
          const subs = p.submittals ?? [];
          setSubCount({ pending: subs.filter((s) => s.status === "Pending" || s.status === "Submitted").length, total: subs.length });
        }
      } catch { /* non-critical */ }
    };
    void fetchAll();
    return () => { active = false; };
  }, [projectId]);

  useEffect(() => { saveWidgetPrefs(storageKey, widgetPrefs); }, [storageKey, widgetPrefs]);

  const orderedVisible = useMemo(
    () => [...widgetPrefs].filter((p) => p.visible).sort((a, b) => a.order - b.order),
    [widgetPrefs],
  );

  const toggleVisible = useCallback((id: string) => setWidgetPrefs((prev) => prev.map((p) => p.id === id ? { ...p, visible: !p.visible } : p)), []);
  const setWidgetSize = useCallback((id: string, s: WidgetSize) => setWidgetPrefs((prev) => prev.map((p) => p.id === id ? { ...p, size: s } : p)), []);
  const moveOrder     = useCallback((id: string, dir: -1 | 1) => {
    setWidgetPrefs((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const idx    = sorted.findIndex((p) => p.id === id);
      const tgt    = idx + dir;
      if (idx < 0 || tgt < 0 || tgt >= sorted.length) return prev;
      return sorted.map((p, i) => {
        if (i === idx) return { ...p, order: sorted[tgt].order };
        if (i === tgt) return { ...p, order: sorted[idx].order };
        return p;
      });
    });
  }, []);

  const handleDragStart = useCallback((idx: number) => setDragIdx(idx), []);
  const handleDragEnd   = useCallback(() => setDragIdx(null), []);
  const handleDragOver  = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setWidgetPrefs((prev) => {
      const visible = [...prev].filter((p) => p.visible).sort((a, b) => a.order - b.order);
      const ids     = visible.map((p) => p.id);
      const [moved] = ids.splice(dragIdx, 1);
      ids.splice(idx, 0, moved);
      return prev.map((p) => { const vi = ids.indexOf(p.id); return vi >= 0 ? { ...p, order: vi } : p; });
    });
    setDragIdx(idx);
  }, [dragIdx]);

  /* ── Derived stats ───────────────────────────────────────────── */
  const locationStr   = profile.projectAddress || project.metadata?.location || project.metadata?.address || "";
  const cityState     = [project.metadata?.city, project.metadata?.state].filter(Boolean).join(", ");
  const activeTasks   = tasks.filter((t) => t.status !== "Completed" && t.status !== "Done");
  const upcomingTasks = activeTasks.slice(0, 4);
  const overallPct    = tasks.length > 0 ? Math.round(tasks.reduce((s, t) => s + (t.percent_complete ?? 0), 0) / tasks.length) : 0;
  const revisedBudget = budgetTotals ? budgetTotals.budget + budgetTotals.changeOrders : 0;
  const pctSpent      = revisedBudget > 0 ? Math.min(100, Math.round(((budgetTotals?.spent ?? 0) / revisedBudget) * 100)) : 0;
  const variance      = revisedBudget - (budgetTotals?.spent ?? 0);

  /* ── renderBody ──────────────────────────────────────────────── */
  const renderBody = (id: string, isExpanded: boolean) => {

    /* PROJECT INFO */
    if (id === "project-info") {
      return (
        <div className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50 border border-slate-100 p-4 flex-1 space-y-3">
          <div className="flex items-start gap-2.5">
            <Building2 size={18} className="text-[#1E3A8A] mt-0.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900 truncate">{project.name ?? "—"}</p>
              {(locationStr || cityState) && (
                <p className="text-[10px] text-gray-500 flex items-center gap-1 mt-0.5">
                  <MapPin size={9} />{locationStr || cityState}
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/70 rounded-lg p-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Status</p>
              <p className="text-xs font-bold text-gray-800 capitalize mt-0.5">{project.status ?? "Active"}</p>
            </div>
            <div className="bg-white/70 rounded-lg p-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Created</p>
              <p className="text-xs font-bold text-gray-800 mt-0.5">
                {project.created_at ? new Date(project.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
              </p>
            </div>
            {rfiCount !== null && (
              <div className="bg-white/70 rounded-lg p-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Open RFIs</p>
                <p className="text-xs font-bold text-[#1E3A8A] mt-0.5">{rfiCount.open} <span className="text-gray-400 font-normal">/ {rfiCount.total}</span></p>
              </div>
            )}
            {subCount !== null && (
              <div className="bg-white/70 rounded-lg p-2">
                <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Pending Docs</p>
                <p className="text-xs font-bold text-amber-600 mt-0.5">{subCount.pending} <span className="text-gray-400 font-normal">/ {subCount.total}</span></p>
              </div>
            )}
          </div>
          {isExpanded && project.description && (
            <p className="text-xs text-gray-500 leading-relaxed border-t border-gray-100 pt-3">{project.description}</p>
          )}
          <button
            onClick={() => setProfileOpen(true)}
            className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-dashed border-gray-200 py-1.5 text-[10px] font-semibold text-gray-400 hover:text-[#1E3A8A] hover:border-[#1E3A8A]/30 transition"
          >
            <Settings size={10} /> Edit Company Profile (Auto-fill)
          </button>
        </div>
      );
    }

    /* LOCATION */
    if (id === "location") {
      return (
        <div className={isExpanded ? "min-h-[420px] flex flex-col" : "min-h-[200px] flex flex-col"}>
          <LocationMap
            locationLabel={locationStr || project.metadata?.location}
            compact={!isExpanded}
            expanded={isExpanded}
          />
        </div>
      );
    }

    /* WEATHER */
    if (id === "weather") {
      return (
        <WeatherWidgetBody
          emoji="⛅"
          condition={locationStr ? `Weather near ${locationStr.split(",")[0]}` : "Project site"}
          expanded={isExpanded}
        />
      );
    }

    /* BUDGET SNAPSHOT */
    if (id === "budget-snapshot") {
      if (!budgetTotals) {
        return (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 flex-1 flex flex-col items-center justify-center gap-2">
            <BarChart2 size={24} className="text-gray-300" />
            <p className="text-xs text-gray-400 font-semibold">No budget data yet</p>
            <Link href={`/project-hub/${projectId}/budget`} className="text-[10px] font-bold text-[#059669] hover:underline">Set up budget →</Link>
          </div>
        );
      }
      return (
        <div className="rounded-xl bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 p-4 flex-1 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white/70 rounded-lg p-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Budget</p>
              <p className="text-sm font-black text-gray-900">{fmtUsd(revisedBudget)}</p>
            </div>
            <div className="bg-white/70 rounded-lg p-2">
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Spent</p>
              <p className="text-sm font-black text-gray-900">{fmtUsd(budgetTotals.spent)}</p>
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[10px] mb-1">
              <span className="text-gray-500">Spend Progress</span>
              <span className="font-bold text-gray-700">{pctSpent}%</span>
            </div>
            <div className="w-full bg-white/60 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${pctSpent > 90 ? "bg-red-500" : pctSpent > 75 ? "bg-amber-400" : "bg-emerald-500"}`}
                style={{ width: `${pctSpent}%` }}
              />
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              {variance >= 0
                ? <TrendingUp size={12} className="text-emerald-600" />
                : <TrendingDown size={12} className="text-red-500" />}
              <span className={`text-[10px] font-bold ${variance >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {variance >= 0 ? "Under " : "Over "}{fmtUsd(Math.abs(variance))}
              </span>
            </div>
            <Link href={`/project-hub/${projectId}/budget`} className="text-[10px] font-bold text-[#059669] hover:underline">Full Budget →</Link>
          </div>
        </div>
      );
    }

    /* SCHEDULE SNAPSHOT */
    if (id === "schedule-snapshot") {
      if (tasks.length === 0) {
        return (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 flex-1 flex flex-col items-center justify-center gap-2">
            <CalendarCheck2 size={24} className="text-gray-300" />
            <p className="text-xs text-gray-400 font-semibold">No tasks scheduled</p>
            <Link href={`/project-hub/${projectId}/schedule`} className="text-[10px] font-bold text-[#FF4D00] hover:underline">Add tasks →</Link>
          </div>
        );
      }
      return (
        <div className="flex flex-col gap-2 flex-1">
          <div className="flex items-center gap-3 rounded-lg bg-orange-50 border border-orange-100 px-3 py-2">
            <div className="flex-1">
              <div className="flex justify-between text-[10px] mb-1">
                <span className="font-bold text-gray-600">{tasks.filter((t) => t.status === "Completed").length}/{tasks.length} completed</span>
                <span className="font-black text-[#FF4D00]">{overallPct}%</span>
              </div>
              <div className="w-full bg-orange-100 rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-[#FF4D00] rounded-full transition-all" style={{ width: `${overallPct}%` }} />
              </div>
            </div>
          </div>
          <div className="space-y-1.5 flex-1">
            {upcomingTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-2 rounded-lg border border-gray-100 bg-white px-2.5 py-2">
                <div className={`w-2 h-2 rounded-full shrink-0 ${t.status === "In Progress" ? "bg-blue-500" : t.status === "Delayed" ? "bg-red-500" : "bg-gray-300"}`} />
                <p className="text-[11px] font-semibold text-gray-800 flex-1 truncate">{t.name}</p>
                {t.end_date && (
                  <span className="text-[9px] text-gray-400 shrink-0">
                    {new Date(t.end_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </span>
                )}
              </div>
            ))}
          </div>
          <Link href={`/project-hub/${projectId}/schedule`} className="text-[10px] font-bold text-[#FF4D00] hover:underline text-right block">Open Gantt →</Link>
        </div>
      );
    }

    /* QUICK ACTIONS */
    if (id === "quick-actions") {
      const actions = [
        { label: "New RFI",       href: `/project-hub/${projectId}/rfis`,       icon: ClipboardList, color: "#1E3A8A" },
        { label: "Add Submittal", href: `/project-hub/${projectId}/submittals`,  icon: FileCheck2,    color: "#7C3AED" },
        { label: "Daily Log",     href: `/project-hub/${projectId}/daily-logs`,  icon: Layers,        color: "#FF4D00" },
        { label: "Punch List",    href: `/project-hub/${projectId}/punch-list`,  icon: ShieldAlert,   color: "#DC2626" },
        { label: "Upload File",   href: `/project-hub/${projectId}/slatedrop`,   icon: FolderOpen,    color: "#FF4D00" },
        { label: "Add Task",      href: `/project-hub/${projectId}/schedule`,    icon: CalendarCheck2, color: "#059669" },
      ];
      return (
        <div className="grid grid-cols-2 gap-2 flex-1 content-start">
          {actions.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-3 py-2.5 hover:shadow-sm hover:border-gray-200 transition group"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${a.color}1A`, color: a.color }}>
                <a.icon size={13} />
              </div>
              <span className="text-[11px] font-semibold text-gray-700 group-hover:text-gray-900 leading-tight">{a.label}</span>
            </Link>
          ))}
        </div>
      );
    }

    /* SLATEDROP */
    if (id === "slatedrop") {
      return (
        <div className="space-y-3 flex-1">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500">Recent project files</p>
            <Link href={`/project-hub/${projectId}/slatedrop`} className="text-[11px] font-bold text-[#FF4D00] hover:underline">View All →</Link>
          </div>
          {files.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-center">
              <FolderOpen size={20} className="mx-auto mb-1.5 text-gray-300" />
              <p className="text-xs text-gray-400">No files yet</p>
              <Link href={`/project-hub/${projectId}/slatedrop`} className="text-[10px] font-bold text-[#FF4D00] hover:underline mt-1 block">Upload files →</Link>
            </div>
          ) : (
            <ul className="space-y-1.5">
              {files.slice(0, isExpanded ? 8 : 4).map((file) => (
                <li key={file.id} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition">
                  <FileText size={12} className="text-gray-400 shrink-0" />
                  <span className="text-[11px] font-semibold text-gray-700 truncate">{file.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    }

    /* CONTINUE WORKING */
    if (id === "continue") {
      const links = [
        { title: "Open RFIs",       subtitle: rfiCount ? `${rfiCount.open} open of ${rfiCount.total}` : "Review pending requests",                  href: `/project-hub/${projectId}/rfis`,       icon: ClipboardList },
        { title: "Pending Docs",    subtitle: subCount ? `${subCount.pending} awaiting review` : "Review submittals",                               href: `/project-hub/${projectId}/submittals`, icon: FileCheck2 },
        { title: "Active Schedule", subtitle: activeTasks.length > 0 ? `${activeTasks.length} active tasks` : "View the Gantt",                    href: `/project-hub/${projectId}/schedule`,   icon: CalendarCheck2 },
        { title: "Budget",          subtitle: budgetTotals ? `${pctSpent}% spent to date` : "Review financials",                                   href: `/project-hub/${projectId}/budget`,     icon: DollarSign },
      ];
      return (
        <div className="space-y-1.5 flex-1">
          {links.map((link) => (
            <Link
              key={link.title}
              href={link.href}
              className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-white px-3 py-2.5 hover:shadow-sm hover:border-[#FF4D00]/20 hover:bg-orange-50/20 transition group"
            >
              <link.icon size={13} className="text-gray-400 group-hover:text-[#FF4D00] transition shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-gray-800 truncate">{link.title}</p>
                <p className="text-[9px] text-gray-400 truncate">{link.subtitle}</p>
              </div>
              <CheckCircle2 size={10} className="text-gray-200 group-hover:text-emerald-400 transition shrink-0" />
            </Link>
          ))}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-gray-900">Project Widgets</h2>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setProfileOpen(true)}
            title="Company auto-fill profile"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-[#1E3A8A] transition-colors"
          >
            <Settings size={15} />
          </button>
          <button
            onClick={() => setCustomizeOpen(true)}
            title="Customize widgets"
            className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 hover:text-[#1E3A8A] transition-colors"
          >
            <SlidersHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Widget grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {orderedVisible.map((pref, idx) => {
          const meta = PROJECT_WIDGET_META.find((w) => w.id === pref.id);
          if (!meta) return null;
          return (
            <WidgetCard
              key={pref.id}
              icon={meta.icon}
              title={meta.label}
              color={meta.color}
              span={getWidgetSpan(pref.id, pref.size)}
              onSetSize={(s) => setWidgetSize(pref.id, s)}
              size={pref.size}
              draggable={pref.size === "default" && pref.id !== "location"}
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDragEnd={handleDragEnd}
              isDragging={dragIdx === idx}
            >
              {renderBody(pref.id, pref.size !== "default")}
            </WidgetCard>
          );
        })}
      </div>

      {/* Customize drawer */}
      <WidgetCustomizeDrawer
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="Customize Project Widgets"
        subtitle="Reorder, show/hide, and resize widgets"
        widgetPrefs={widgetPrefs}
        widgetMeta={PROJECT_WIDGET_META}
        onToggleVisible={toggleVisible}
        onSetSize={setWidgetSize}
        onMoveOrder={moveOrder}
        onReset={() => setWidgetPrefs(buildProjectDefaultPrefs())}
      />

      {/* Company profile modal */}
      <CompanyProfileModal
        open={profileOpen}
        onClose={() => setProfileOpen(false)}
        initial={company}
        onSave={(p) => { saveCompany(p); setProfileOpen(false); }}
      />
    </div>
  );
}
