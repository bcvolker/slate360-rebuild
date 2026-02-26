"use client";

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
  LayoutDashboard,
  Palette,
  Layers,
  Compass,
  Globe,
  Film,
  BarChart3,
  Plug,
  User,
  SlidersHorizontal,
  FileText,
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
  getWidgetSpan,
  buildDefaultPrefs,
  HUB_STORAGE_KEY,
} from "@/components/widgets/widget-meta";
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

const QUICK_NAV = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Project Hub", href: "/project-hub", icon: FolderKanban },
  { label: "Design Studio", href: "/design-studio", icon: Palette },
  { label: "Content Studio", href: "/content-studio", icon: Layers },
  { label: "360 Tours", href: "/tours", icon: Compass },
  { label: "Geospatial", href: "/geospatial", icon: Globe },
  { label: "Virtual Studio", href: "/virtual-studio", icon: Film },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "SlateDrop", href: "/slatedrop", icon: FolderOpen },
  { label: "Integrations", href: "/integrations", icon: Plug },
  { label: "My Account", href: "/my-account", icon: User },
];

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

export default function ProjectHubPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "my-work" | "activity">("all");
  const [quickNavOpen, setQuickNavOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [slateDropFolders, setSlateDropFolders] = useState<
    { name: string; count: number }[]
  >([]);
  const [slateDropFiles, setSlateDropFiles] = useState<{ name: string }[]>([]);
  const [slateDropWidgetView, setSlateDropWidgetView] = useState<"recent" | "folders">("folders");

  const [widgetPrefs, setWidgetPrefs] = useState<WidgetPref[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const s = localStorage.getItem(HUB_STORAGE_KEY);
        if (s) {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (typeof parsed[0] === "string") {
              return DEFAULT_HUB_PREFS.map((def) => ({
                ...def,
                visible: (parsed as string[]).includes(def.id),
                order: (parsed as string[]).includes(def.id)
                  ? (parsed as string[]).indexOf(def.id)
                  : def.order + 100,
              }));
            }
            return DEFAULT_HUB_PREFS.map((def) => {
              const found = (parsed as WidgetPref[]).find((p) => p.id === def.id);
              return found ?? def;
            });
          }
        }
      } catch {
        // ignore
      }
    }
    return DEFAULT_HUB_PREFS;
  });

  useEffect(() => {
    try {
      localStorage.setItem(HUB_STORAGE_KEY, JSON.stringify(widgetPrefs));
    } catch {
      // ignore
    }
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
          return widget ? { ...widget, expanded: p.expanded } : null;
        })
        .filter(Boolean) as (typeof HUB_WIDGET_META[number] & { expanded: boolean })[],
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

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const data = await res.json();
      setProjects(data.projects || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

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

  const toggleWidgetExpanded = (id: string) => {
    setWidgetPrefs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, expanded: !p.expanded } : p))
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

          <p className="text-[10px] text-gray-400">Open full SlateDrop from the main navigation.</p>
        </div>
      );
    }

    if (id === "location") {
      return (
        <div className={isExpanded ? "min-h-[400px] flex flex-col" : "min-h-[200px] flex flex-col"}>
          <LocationMap compact={!isExpanded} />
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
    <div className="min-h-screen bg-[#ECEEF2]">
      <header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 py-3 md:px-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="shrink-0">
              <img src="/logo.svg" alt="Slate360" className="h-7 w-auto" />
            </Link>
            <Link
              href="/dashboard"
              className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-[#FF4D00] transition-colors"
            >
              <ChevronLeft size={16} /> Dashboard
            </Link>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setCustomizeOpen(true)}
              title="Customize widgets"
              className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-[#FF4D00]/40 hover:text-[#FF4D00] transition-all text-gray-600"
            >
              <SlidersHorizontal size={16} />
            </button>

            <div className="relative">
              <button
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setQuickNavOpen(false);
                }}
                className="relative flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                <Bell size={16} className="text-gray-600" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF4D00] text-[9px] font-bold text-white flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>
              {notifOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
                  <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-gray-200 bg-white shadow-2xl overflow-hidden">
                    <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                      <h4 className="text-sm font-bold text-gray-900">Notifications</h4>
                      <span className="text-[10px] font-semibold text-[#FF4D00]">{unreadCount} new</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto divide-y divide-gray-50">
                      {notifications.map((n) => (
                        <div
                          key={n.id}
                          className={`px-4 py-3 text-xs hover:bg-gray-50 transition-colors ${
                            n.unread ? "bg-orange-50/40" : ""
                          }`}
                        >
                          <p className={`${n.unread ? "font-semibold text-gray-900" : "text-gray-600"}`}>
                            {n.text}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-1">{n.time}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="relative">
              <button
                onClick={() => {
                  setQuickNavOpen(!quickNavOpen);
                  setNotifOpen(false);
                }}
                className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all"
              >
                <LayoutDashboard size={14} /> Navigate <ChevronDown size={12} />
              </button>
              {quickNavOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setQuickNavOpen(false)} />
                  <div className="absolute right-0 top-12 z-50 w-56 rounded-2xl border border-gray-200 bg-white shadow-2xl py-2 overflow-hidden">
                    {QUICK_NAV.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setQuickNavOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-[#FF4D00]/5 hover:text-[#FF4D00] transition-colors"
                        >
                          <Icon size={14} /> {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 md:px-10 md:py-8 space-y-6 sm:space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 flex items-center gap-3">
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
          {[
            { icon: FolderKanban, bg: "bg-blue-50", text: "text-blue-600", value: projects.length, label: "Total Projects" },
            { icon: ClipboardList, bg: "bg-orange-50", text: "text-[#FF4D00]", value: "12", label: "Open RFIs" },
            { icon: CheckCircle2, bg: "bg-purple-50", text: "text-purple-600", value: "8", label: "Pending Submittals" },
            { icon: AlertTriangle, bg: "bg-red-50", text: "text-red-600", value: "3", label: "Overdue Tasks" },
          ].map(({ icon: SIcon, bg, text, value, label }) => (
            <div
              key={label}
              className="bg-white p-3 sm:p-4 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-3 sm:gap-4 hover:shadow-lg hover:border-gray-200 hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className={`p-2.5 sm:p-3 ${bg} ${text} rounded-xl`}>
                <SIcon size={20} />
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-black text-gray-900">{value}</p>
                <p className="text-[10px] sm:text-xs font-semibold text-gray-500">{label}</p>
              </div>
            </div>
          ))}
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
                <Link
                  key={p.id}
                  href={`/project-hub/${p.id}`}
                  className="group relative flex w-[340px] shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm hover:shadow-xl hover:border-gray-300 hover:-translate-y-1 transition-all"
                >
                  <div className="h-32 w-full bg-gradient-to-br from-[#1E3A8A] to-slate-800 p-4 flex flex-col justify-between">
                    <span className="self-end rounded-full bg-white/20 px-3 py-1 text-xs font-bold text-white backdrop-blur-md uppercase tracking-wider">
                      {p.status}
                    </span>
                    <h2 className="text-xl font-black text-white truncate">{p.name}</h2>
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <p className="text-sm text-gray-500 line-clamp-2">{p.description || "No description provided."}</p>
                    <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-xs font-semibold text-gray-400">
                      <span>Created: {new Date(p.created_at).toLocaleDateString()}</span>
                      <span className="text-[#FF4D00] group-hover:underline">Open Hub →</span>
                    </div>
                  </div>
                </Link>
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
                span={getWidgetSpan(w.id, w.expanded)}
                onExpand={() => toggleWidgetExpanded(w.id)}
                isExpanded={w.expanded}
                draggable={!w.expanded && w.id !== "location"}
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragEnd={handleDragEnd}
                isDragging={dragIdx === idx}
              >
                {renderWidgetBody(w.id, w.expanded)}
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
        onToggleExpanded={toggleWidgetExpanded}
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
    </div>
  );
}
