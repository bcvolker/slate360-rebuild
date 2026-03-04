"use client";

import DashboardHeader from "@/components/shared/DashboardHeader";
import { useEffect, useState, useCallback, useMemo, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ChevronLeft,
  ChevronDown,
  Plus,
  FolderKanban,
  Loader2,
  ClipboardList,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  MapPin,
  CreditCard,
  Cpu,
  Lightbulb,
  Bell,
  SlidersHorizontal,
  FileText,
  MoreVertical,
  Trash2,
  X,
} from "lucide-react";
import CreateProjectWizard, {
  CreateProjectPayload,
} from "@/components/project-hub/CreateProjectWizard";
import LocationMap from "@/components/dashboard/LocationMap";
import WidgetCard from "@/components/widgets/WidgetCard";
import WidgetCustomizeDrawer from "@/components/widgets/WidgetCustomizeDrawer";
import {
  WIDGET_META,
  type WidgetPref,
  type WidgetSize,
  getWidgetSpan,
  buildDefaultPrefs,
  HUB_STORAGE_KEY,
} from "@/components/widgets/widget-meta";
import { loadWidgetPrefs, saveWidgetPrefs } from "@/components/widgets/widget-prefs-storage";
import {
  WeatherWidgetBody,
  FinancialWidgetBody,
  CalendarWidgetBody,
  ContactsWidgetBody,
  ContinueWidgetBody,
  ProcessingWidgetBody,
  SuggestWidgetBody,
  DataUsageWidgetBody,
} from "@/components/widgets/WidgetBodies";
import QuickNav from "@/components/shared/QuickNav";
import { resolveProjectLocation } from "@/lib/projects/location";

const HUB_WIDGET_IDS = [
  "slatedrop",
  "location",
  "data-usage",
  "processing",
  "suggest",
  "weather",
  "financial",
  "calendar",
  "contacts",
  "continue",
];

const DEFAULT_VISIBLE = [
  "slatedrop",
  "location",
  "data-usage",
  "processing",
  "suggest",
  "weather",
];

const HUB_WIDGET_META = WIDGET_META.filter((w) => HUB_WIDGET_IDS.includes(w.id));

const DEFAULT_HUB_PREFS: WidgetPref[] = buildDefaultPrefs({
  visibleOnly: DEFAULT_VISIBLE,
  expandedIds: [],
})
  .filter((p) => HUB_WIDGET_IDS.includes(p.id))
  .map((p, index) => ({ ...p, order: index }));

const FALLBACK_FOLDER_VIEW = [
  { name: "Project Sandbox", description: "Shared cross-module workspace" },
  { name: "Design Studio", description: "Models, plans, and redlines" },
  { name: "Content Studio", description: "Media, exports, and brand assets" },
  { name: "360 Tours", description: "Tour captures and annotations" },
];

interface Props { user: {name: string, email: string, avatar?: string}; tier: import("@/lib/entitlements").Tier; isCeo?: boolean; }

type ProjectHubSummary = {
  totals: {
    projects: number;
    activeProjects: number;
    completedProjects: number;
    onHoldProjects: number;
  };
  budget: {
    totalBudget: number;
    totalSpent: number;
    totalChangeOrders: number;
  };
  work: {
    openRfis: number;
    pendingSubmittals: number;
  };
  recentProjects: Array<{
    id: string;
    name: string;
    status: string;
    createdAt: string;
  }>;
};

export default function ProjectHubPage({ user, tier, isCeo = false }: Props) {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summary, setSummary] = useState<ProjectHubSummary | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "my-work" | "activity">("all");
  const [notifOpen, setNotifOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [slateDropFolders, setSlateDropFolders] = useState<
    { name: string; count: number }[]
  >([]);
  const [slateDropFiles, setSlateDropFiles] = useState<{ name: string }[]>([]);
  const [slateDropWidgetView, setSlateDropWidgetView] = useState<"recent" | "folders">("folders");

  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPref[]>(() => loadWidgetPrefs(HUB_STORAGE_KEY, DEFAULT_HUB_PREFS));

  useEffect(() => {
    saveWidgetPrefs(HUB_STORAGE_KEY, widgetPrefs);
  }, [widgetPrefs]);

  const orderedVisible = useMemo(
    () => [...widgetPrefs].filter((p) => p.visible).sort((a, b) => a.order - b.order),
    [widgetPrefs]
  );

  const visibleWidgets = useMemo(
    () =>
      orderedVisible
        .map((p) => {
          const widget = HUB_WIDGET_META.find((m) => m.id === p.id);
          return widget ? { ...widget, size: p.size } : null;
        })
        .filter(Boolean) as (typeof HUB_WIDGET_META[number] & { size: WidgetSize })[],
    [orderedVisible]
  );

  useEffect(() => {
    fetch("/api/slatedrop/folders", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.folders)) {
          setSlateDropFolders(
            (data.folders as { name: string; file_count?: number }[])
              .slice(0, 5)
              .map((f) => ({ name: f.name, count: f.file_count ?? 0 }))
          );
        }
      })
      .catch(() => {});

    fetch("/api/slatedrop/files?folderId=general", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data?.files)) {
          setSlateDropFiles((data.files as { name: string }[]).slice(0, 4));
        }
      })
      .catch(() => {});
  }, []);

  const [notifications] = useState([
    { id: "1", text: "Client Beth uploaded 3 files to SlateDrop", time: "2m ago", unread: true },
    { id: "2", text: "RFI #12 response received from structural consultant", time: "15m ago", unread: true },
    { id: "3", text: "Daily log submitted for Slate360 HQ project", time: "1h ago", unread: false },
    { id: "4", text: "Submittal #8 approved by architect", time: "3h ago", unread: false },
  ]);
  const unreadCount = notifications.filter((n) => n.unread).length;

  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  /* ─── Delete flow state ──────────────────────────────────────── */
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [cardMenuOpen, setCardMenuOpen] = useState<string | null>(null);

  const openDeleteModal = (project: { id: string; name: string }) => {
    setDeleteTarget(project);
    setDeleteConfirmName("");
    setDeleteError(null);
    setCardMenuOpen(null);
  };

  const closeDeleteModal = () => {
    setDeleteTarget(null);
    setDeleteConfirmName("");
    setDeleteError(null);
  };

  const handleDeleteProject = async () => {
    if (!deleteTarget) return;
    if (deleteConfirmName.trim() !== deleteTarget.name) {
      setDeleteError("Project name does not match. Please type the exact name.");
      return;
    }
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/projects/${deleteTarget.id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: "DELETE", confirmName: deleteConfirmName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setDeleteError(data.error || "Failed to delete project.");
        return;
      }
      closeDeleteModal();
      await loadProjects();
      await loadSummary();
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const data = await res.json();
      setProjects(data.projects || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const res = await fetch("/api/projects/summary", { cache: "no-store" });
      const data = await res.json();
      if (res.ok) setSummary(data as ProjectHubSummary);
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
    void loadSummary();
  }, [loadProjects, loadSummary]);

  const handleCreate = async (payload: CreateProjectPayload) => {
    setCreating(true);
    try {
      await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setWizardOpen(false);
      await loadProjects();
      await loadSummary();
    } finally {
      setCreating(false);
    }
  };

  const handleDragStart = (idx: number) => setDragIdx(idx);

  const handleDragOver = (e: DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    const visIds = orderedVisible.map((p) => p.id);
    const [moved] = visIds.splice(dragIdx, 1);
    visIds.splice(idx, 0, moved);
    setWidgetPrefs((prev) => {
      return prev.map((p) => {
        const visIdx = visIds.indexOf(p.id);
        return visIdx >= 0 ? { ...p, order: visIdx } : p;
      });
    });
    setDragIdx(idx);
  };

  const handleDragEnd = () => setDragIdx(null);

  const toggleWidgetVisible = (id: string) => {
    setWidgetPrefs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p))
    );
  };

  const setWidgetSize = (id: string, newSize: WidgetSize) => {
    if (id === "slatedrop") {
      setSlateDropWidgetView("folders");
    }
    setWidgetPrefs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, size: newSize } : p))
    );
  };

  const moveWidgetOrder = (id: string, dir: -1 | 1) => {
    setWidgetPrefs((prev) => {
      const sorted = [...prev].sort((a, b) => a.order - b.order);
      const idx = sorted.findIndex((p) => p.id === id);
      const target = idx + dir;
      if (target < 0 || target >= sorted.length) return prev;
      return sorted.map((p, i) => {
        if (i === idx) return { ...p, order: sorted[target].order };
        if (i === target) return { ...p, order: sorted[idx].order };
        return p;
      });
    });
  };

  const renderWidgetBody = (id: string, isExpanded: boolean) => {
    if (id === "slatedrop") {
      return (
        <div className="space-y-4">
          <div className="inline-flex items-center rounded-lg border border-gray-200 p-0.5">
            <button
              onClick={() => setSlateDropWidgetView("recent")}
              className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${
                slateDropWidgetView === "recent"
                  ? "bg-[#FF4D00] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setSlateDropWidgetView("folders")}
              className={`px-2 py-1 text-[10px] font-semibold rounded-md transition-colors ${
                slateDropWidgetView === "folders"
                  ? "bg-[#1E3A8A] text-white"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              Folder View
            </button>
          </div>

          {slateDropWidgetView === "recent" ? (
            <div className="space-y-2">
              {slateDropFiles.length > 0 ? (
                slateDropFiles.map((file, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2.5 p-2 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <FileText size={13} className="text-gray-400 shrink-0" />
                    <span className="text-[11px] text-gray-700 truncate flex-1">{file.name}</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 text-xs text-gray-400">No recent files</div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {(slateDropFolders.length > 0 ? slateDropFolders : FALLBACK_FOLDER_VIEW).map((folder) => (
                <div key={folder.name} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
                  <p className="text-[11px] font-semibold text-gray-800 flex items-center gap-1.5">
                    <FolderOpen size={12} className="text-[#FF4D00]" /> {folder.name}
                  </p>
                  {"description" in folder ? (
                    <p className="text-[10px] text-gray-500 mt-1">{folder.description}</p>
                  ) : (
                    <p className="text-[10px] text-gray-500 mt-1">{folder.count} files</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {isExpanded && (
            <div className="text-[10px] text-gray-400">Pending uploads —</div>
          )}

          <Link href="/slatedrop" className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-[#FF4D00] hover:underline">
            <FolderOpen size={10} /> Open SlateDrop →
          </Link>
        </div>
      );
    }

    if (id === "location") {
      return (
        <div className={isExpanded ? "min-h-[400px] flex flex-col" : "min-h-[200px] flex flex-col"}>
          <LocationMap compact={!isExpanded} expanded={isExpanded} />
        </div>
      );
    }

    if (id === "data-usage") {
      return <DataUsageWidgetBody />;
    }

    if (id === "processing") {
      return <ProcessingWidgetBody />;
    }

    if (id === "suggest") {
      return <SuggestWidgetBody expanded={isExpanded} />;
    }

    if (id === "weather") {
      return <WeatherWidgetBody tempF={72} expanded={isExpanded} />;
    }

    if (id === "financial") {
      return <FinancialWidgetBody expanded={isExpanded} />;
    }

    if (id === "calendar") {
      return <CalendarWidgetBody />;
    }

    if (id === "contacts") {
      return <ContactsWidgetBody />;
    }

    if (id === "continue") {
      return <ContinueWidgetBody />;
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-[#ECEEF2] overflow-x-hidden">
            <DashboardHeader
        user={user}
        tier={tier}
        isCeo={isCeo}
        showBackLink
        onCustomizeOpen={() => setCustomizeOpen(true)}
      />

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-3">
            <FolderKanban size={28} className="text-[#1E3A8A]" /> Project Hub
          </h1>
          <button
            onClick={() => setWizardOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#FF4D00] px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-[#E64500] transition-all hover:-translate-y-0.5 hover:shadow-xl w-full sm:w-auto"
          >
            <Plus size={16} /> New Project
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="col-span-2 md:col-span-4 rounded-2xl border border-gray-200 bg-white px-4 py-4 sm:px-5 sm:py-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Portfolio Snapshot</p>
                <h2 className="text-base sm:text-lg font-black text-gray-900">Organization-level project health</h2>
              </div>
              <span className="text-[11px] font-semibold text-gray-500">
                {summaryLoading ? "Loading summary..." : `${summary?.totals.projects ?? projects.length} projects tracked`}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3">
                <p className="text-[10px] uppercase tracking-wider font-bold text-blue-500">Active Projects</p>
                <p className="text-xl font-black text-blue-700 mt-1">{summary?.totals.activeProjects ?? 0}</p>
              </div>
              <div className="rounded-xl border border-orange-100 bg-orange-50/60 p-3">
                <p className="text-[10px] uppercase tracking-wider font-bold text-orange-500">Open RFIs</p>
                <p className="text-xl font-black text-orange-700 mt-1">{summary?.work.openRfis ?? 0}</p>
              </div>
              <div className="rounded-xl border border-purple-100 bg-purple-50/60 p-3">
                <p className="text-[10px] uppercase tracking-wider font-bold text-purple-500">Pending Submittals</p>
                <p className="text-xl font-black text-purple-700 mt-1">{summary?.work.pendingSubmittals ?? 0}</p>
              </div>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                <p className="text-[10px] uppercase tracking-wider font-bold text-emerald-500">Portfolio Budget</p>
                <p className="text-base sm:text-lg font-black text-emerald-700 mt-1">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                    notation: "compact",
                    maximumFractionDigits: 1,
                  }).format(summary?.budget.totalBudget ?? 0)}
                </p>
              </div>
            </div>
          </div>

          {[
            { id: "projects", icon: FolderKanban, bg: "bg-blue-50", text: "text-blue-600", value: summary?.totals.projects ?? projects.length, label: "Total Projects", detail: summary?.recentProjects?.length ? summary.recentProjects.map((project) => `${project.name} (${project.status})`) : ["No projects yet — click 'New Project' to get started"] },
            { id: "rfis", icon: ClipboardList, bg: "bg-orange-50", text: "text-[#FF4D00]", value: summary?.work.openRfis ?? 0, label: "Open RFIs", detail: ["Aggregated open RFIs across all accessible projects", "Use per-project RFI tabs for detailed routing"] },
            { id: "submittals", icon: CheckCircle2, bg: "bg-purple-50", text: "text-purple-600", value: summary?.work.pendingSubmittals ?? 0, label: "Submittals", detail: ["Pending/submitted submittals across projects", "Review approvals in each project's Submittals tab"] },
            { id: "tasks", icon: AlertTriangle, bg: "bg-red-50", text: "text-red-600", value: summary?.totals.onHoldProjects ?? 0, label: "On-Hold Projects", detail: ["Projects currently marked on-hold", "Re-activate from project settings when ready"] },
          ].map(({ id, icon: SIcon, bg, text, value, label, detail }) => {
            const isOpen = expandedCard === id;
            return (
              <div key={label} className="flex flex-col">
                <button
                  onClick={() => setExpandedCard(isOpen ? null : id)}
                  className={`bg-white p-3 sm:p-4 rounded-2xl border shadow-sm flex items-center gap-3 sm:gap-4 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 text-left ${isOpen ? "border-gray-300 shadow-md" : "border-gray-100 hover:border-gray-200"}`}
                >
                  <div className={`p-2.5 sm:p-3 ${bg} ${text} rounded-xl shrink-0`}>
                    <SIcon size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xl sm:text-2xl font-black text-gray-900">{value}</p>
                    <p className="text-[10px] sm:text-xs font-semibold text-gray-500">{label}</p>
                  </div>
                  <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div className="mt-1 bg-white rounded-xl border border-gray-200 shadow-sm p-3 space-y-1.5 animate-in slide-in-from-top-1">
                    {detail.map((d, i) => (
                      <p key={i} className="text-xs text-gray-600 flex items-start gap-2">
                        <span className="mt-1 w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
                        {d}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-1 border-b border-gray-200 pb-px overflow-x-auto">
          {(["all", "my-work", "activity"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 sm:px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 -mb-px rounded-t-lg transition-all ${
                activeTab === tab
                  ? "border-[#FF4D00] text-[#FF4D00] bg-orange-50/50"
                  : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
              }`}
            >
              {tab === "all" ? "All Projects" : tab === "my-work" ? "My Work" : "Activity Feed"}
            </button>
          ))}
        </div>

        {activeTab === "all" &&
          (loading ? (
            <div className="flex justify-center p-20 text-gray-400">
              <Loader2 className="animate-spin" />
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-20 text-center text-gray-500">
              No projects found. Click "New Project" to start building.
            </div>
          ) : (
            <div className="flex gap-6 overflow-x-auto pb-4 snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="group relative flex w-[340px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-xl hover:border-gray-300 hover:-translate-y-1 transition-all"
                >
                  <Link href={`/project-hub/${p.id}`} className="block">
                    {(() => {
                      const mapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
                      const resolvedLocation = resolveProjectLocation(p.metadata, {
                        legacyLocation: p.location,
                        city: p.city,
                        state: p.state,
                        region: p.region,
                      });
                      const pLat = resolvedLocation.lat;
                      const pLng = resolvedLocation.lng;
                      const staticMapUrl = pLat !== null && pLng !== null && mapsKey
                        ? `https://maps.googleapis.com/maps/api/staticmap?center=${pLat},${pLng}&zoom=16&size=600x300&scale=2&maptype=satellite&key=${mapsKey}`
                        : null;
                      return (
                        <div className="h-32 w-full relative overflow-hidden">
                          {staticMapUrl ? (
                            <div
                              className="absolute inset-0 bg-cover bg-center group-hover:scale-105 transition-transform duration-500"
                              style={{ backgroundImage: `url(${staticMapUrl})` }}
                            />
                          ) : (
                            <div className="absolute inset-0 bg-gradient-to-br from-[#1E3A8A] to-[#1e293b]" />
                          )}
                          {staticMapUrl && <div className="absolute inset-0 bg-black/45" />}
                          <div className="absolute inset-0 p-4 flex flex-col justify-between">
                            <div className="flex items-start justify-between">
                              <span />
                              <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-md uppercase tracking-wider">
                                {p.status}
                              </span>
                            </div>
                            <h2 className="text-xl font-black text-white truncate">{p.name}</h2>
                          </div>
                        </div>
                      );
                    })()}
                  </Link>

                  {/* 3-dot menu button */}
                  <div className="absolute top-2 left-2 z-10">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setCardMenuOpen(cardMenuOpen === p.id ? null : p.id);
                      }}
                      className="flex items-center justify-center w-7 h-7 rounded-lg bg-white/20 hover:bg-white/40 backdrop-blur-md transition-all text-white"
                      title="Project options"
                    >
                      <MoreVertical size={14} />
                    </button>

                    {cardMenuOpen === p.id && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => setCardMenuOpen(null)} />
                        <div className="absolute left-0 top-9 z-50 w-48 rounded-xl border border-gray-200 bg-white shadow-2xl py-1 overflow-hidden">
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              openDeleteModal({ id: p.id, name: p.name });
                            }}
                            className="flex items-center gap-2.5 w-full px-3 py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors text-left"
                          >
                            <Trash2 size={14} /> Delete Project
                          </button>
                        </div>
                      </>
                    )}
                  </div>

                  <Link href={`/project-hub/${p.id}`} className="p-5 flex-1 flex flex-col justify-between">
                    <p className="text-sm text-gray-500 line-clamp-2">{p.description || "No description provided."}</p>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs font-semibold text-gray-400">
                      <span>Created: {new Date(p.created_at).toLocaleDateString()}</span>
                      <span className="text-[#FF4D00] group-hover:underline">Open Hub →</span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          ))}

        {activeTab === "my-work" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">
            <ClipboardList size={32} className="mx-auto mb-3 text-gray-300" />
            <h3 className="text-lg font-bold text-gray-900">Your Assigned Tasks</h3>
            <p className="text-sm mt-1">Items across all projects assigned to you will appear here.</p>
          </div>
        )}

        {activeTab === "activity" && (
          <div className="rounded-2xl border border-gray-200 bg-white p-10 text-center text-gray-500">
            <Bell size={32} className="mx-auto mb-3 text-gray-300" />
            <h3 className="text-lg font-bold text-gray-900">Activity Feed</h3>
            <p className="text-sm mt-1">Recent events across all projects will appear here.</p>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black text-gray-900">Widgets</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {visibleWidgets.map((w, idx) => (
              <WidgetCard
                key={w.id}
                icon={w.icon}
                title={w.label}
                color={w.color}
                span={getWidgetSpan(w.id, w.size)}
                onSetSize={(s) => setWidgetSize(w.id, s)}
                size={w.size}
                draggable={w.size === "default" && w.id !== "location"}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                isDragging={dragIdx === idx}
              >
                {renderWidgetBody(w.id, w.size !== "default")}
              </WidgetCard>
            ))}
          </div>
        </div>
      </div>

      <WidgetCustomizeDrawer
        open={customizeOpen}
        onClose={() => setCustomizeOpen(false)}
        title="Customize Widgets"
        subtitle="Reorder, show/hide, and resize widgets"
        widgetPrefs={widgetPrefs}
        widgetMeta={HUB_WIDGET_META}
        onToggleVisible={toggleWidgetVisible}
        onSetSize={setWidgetSize}
        onMoveOrder={moveWidgetOrder}
        onReset={() => setWidgetPrefs(DEFAULT_HUB_PREFS)}
      />

      <CreateProjectWizard
        open={wizardOpen}
        creating={creating}
        error={null}
        onClose={() => setWizardOpen(false)}
        onSubmit={handleCreate}
      />

      {/* ─── Delete Confirmation Modal ──────────────────────────── */}
      {deleteTarget && (
        <>
          <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={closeDeleteModal} />
          <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
            <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="bg-red-50 border-b border-red-100 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                    <AlertTriangle size={20} className="text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900">Delete Project</h3>
                    <p className="text-xs text-gray-500">This action cannot be undone</p>
                  </div>
                </div>
                <button onClick={closeDeleteModal} className="p-1 rounded-lg hover:bg-red-100 transition-colors">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-4">
                <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Project to delete</p>
                  <p className="text-sm font-black text-gray-900">{deleteTarget.name}</p>
                </div>

                <div className="text-sm text-gray-600 space-y-2">
                  <p>Deleting this project will <span className="font-bold text-red-600">permanently</span> remove:</p>
                  <ul className="text-xs text-gray-500 space-y-1 ml-4 list-disc">
                    <li>All project files, folders, and uploads</li>
                    <li>RFIs, submittals, daily logs, and punch list items</li>
                    <li>Budget data, schedule, and stakeholder records</li>
                    <li>All team member associations</li>
                  </ul>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                    Type <span className="font-black text-red-600">{deleteTarget.name}</span> to confirm
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmName}
                    onChange={(e) => {
                      setDeleteConfirmName(e.target.value);
                      setDeleteError(null);
                    }}
                    placeholder="Enter project name..."
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all"
                    autoFocus
                  />
                </div>

                {deleteError && (
                  <p className="text-xs font-semibold text-red-600 bg-red-50 rounded-lg px-3 py-2">
                    {deleteError}
                  </p>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3 bg-gray-50/50">
                <button
                  onClick={closeDeleteModal}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-all"
                  disabled={deleteLoading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteProject}
                  disabled={deleteLoading || deleteConfirmName.trim() !== deleteTarget.name}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {deleteLoading ? (
                    <><Loader2 size={14} className="animate-spin" /> Deleting...</>
                  ) : (
                    <><Trash2 size={14} /> Delete Permanently</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
