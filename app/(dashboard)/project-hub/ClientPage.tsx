"use client";

import DashboardHeader from "@/components/shared/DashboardHeader";
import { useEffect, useState, useCallback, useMemo, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import {
  Plus,
  FolderKanban,
} from "lucide-react";
import CreateProjectWizard, {
  CreateProjectPayload,
} from "@/components/project-hub/CreateProjectWizard";
import ProjectHubPortfolioOverview from "@/components/project-hub/ProjectHubPortfolioOverview";
import ProjectHubDeleteModal from "@/components/project-hub/ProjectHubDeleteModal";
import ProjectHubWorkspaceTabs from "@/components/project-hub/ProjectHubWorkspaceTabs";
import ProjectHubWidgetBody from "@/components/project-hub/ProjectHubWidgetBody";
import WidgetCard from "@/components/widgets/WidgetCard";
import WidgetCustomizeDrawer from "@/components/widgets/WidgetCustomizeDrawer";
import {
  WIDGET_META,
  type WidgetMeta,
  type WidgetPref,
  type WidgetSize,
  getWidgetSpan,
  buildDefaultPrefs,
  HUB_STORAGE_KEY,
} from "@/components/widgets/widget-meta";
import { loadWidgetPrefs, saveWidgetPrefs } from "@/components/widgets/widget-prefs-storage";
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
        .filter(Boolean) as Array<WidgetMeta & { size: WidgetSize }>,
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

        <ProjectHubWorkspaceTabs
          activeTab={activeTab}
          onTabChange={setActiveTab}
          loading={loading}
          projects={projects}
          onOpenDeleteProject={openDeleteModal}
        />

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
                <ProjectHubWidgetBody
                  id={w.id}
                  isExpanded={w.size !== "default"}
                  slateDropWidgetView={slateDropWidgetView}
                  onSlateDropWidgetViewChange={setSlateDropWidgetView}
                  slateDropFolders={slateDropFolders}
                  slateDropFiles={slateDropFiles}
                />
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
