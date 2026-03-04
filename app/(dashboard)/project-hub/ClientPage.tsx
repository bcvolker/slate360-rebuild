"use client";

import DashboardHeader from "@/components/shared/DashboardHeader";
import { useEffect, useState, useCallback, useMemo, type DragEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  FolderKanban,
  ClipboardList,
  FolderOpen,
  Bell,
  FileText,
} from "lucide-react";
import CreateProjectWizard, {
  CreateProjectPayload,
} from "@/components/project-hub/CreateProjectWizard";
import LocationMap from "@/components/dashboard/LocationMap";
import ProjectHubPortfolioOverview from "@/components/project-hub/ProjectHubPortfolioOverview";
import ProjectHubAllProjectsTab from "@/components/project-hub/ProjectHubAllProjectsTab";
import ProjectHubDeleteModal from "@/components/project-hub/ProjectHubDeleteModal";
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
import type { ProjectHubProject, ProjectHubSummary } from "@/lib/types/project-hub";

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

export default function ProjectHubPage({ user, tier, isCeo = false }: Props) {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectHubProject[]>([]);
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

  /* ─── Delete flow state ──────────────────────────────────────── */
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const openDeleteModal = (project: { id: string; name: string }) => {
    setDeleteTarget(project);
    setDeleteConfirmName("");
    setDeleteError(null);
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

        <ProjectHubPortfolioOverview
          summary={summary}
          summaryLoading={summaryLoading}
          fallbackProjectsCount={projects.length}
        />

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

        {activeTab === "all" && (
          <ProjectHubAllProjectsTab
            loading={loading}
            projects={projects}
            onOpenDeleteProject={openDeleteModal}
          />
        )}

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

      <ProjectHubDeleteModal
        target={deleteTarget}
        confirmName={deleteConfirmName}
        loading={deleteLoading}
        error={deleteError}
        onClose={closeDeleteModal}
        onConfirmNameChange={(value) => {
          setDeleteConfirmName(value);
          setDeleteError(null);
        }}
        onDelete={handleDeleteProject}
      />
    </div>
  );
}
