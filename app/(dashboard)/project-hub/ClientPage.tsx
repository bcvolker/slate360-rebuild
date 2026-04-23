"use client";

import DashboardHeader from "@/components/shared/DashboardHeader";
import { useEffect, useState, useCallback } from "react";
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
  getWidgetSpan,
} from "@/lib/widgets/widget-meta";
import { useProjectHubWidgets } from "@/lib/hooks/useProjectHubWidgets";
import type { ProjectHubProject, ProjectHubSummary } from "@/lib/types/project-hub";

interface Props {
  user: {name: string, email: string, avatar?: string};
  tier: import("@/lib/entitlements").Tier;
  isCeo?: boolean;
  internalAccess?: { operationsConsole?: boolean };
}

export default function ProjectHubPage({ user, tier, isCeo = false, internalAccess }: Props) {
  const [projects, setProjects] = useState<ProjectHubProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summary, setSummary] = useState<ProjectHubSummary | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "my-work" | "activity">("all");
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const {
    dragIdx,
    hubWidgetMeta,
    visibleWidgets,
    widgetPrefs,
    slateDropFolders,
    slateDropFiles,
    slateDropWidgetView,
    setSlateDropWidgetView,
    handleDragStart,
    handleDragOver,
    handleDragEnd,
    toggleWidgetVisible,
    setWidgetSize,
    moveWidgetOrder,
    resetWidgetPrefs,
  } = useProjectHubWidgets();

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

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
            <DashboardHeader
        user={user}
        tier={tier}
        isCeo={isCeo}
        internalAccess={internalAccess}
        showBackLink
        onCustomizeOpen={() => setCustomizeOpen(true)}
      />

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-foreground flex items-center gap-3">
            <FolderKanban size={28} className="text-[#3B82F6]" /> Project Hub
          </h1>
          <button
            onClick={() => setWizardOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#3B82F6] px-5 py-3 text-sm font-bold text-foreground shadow-lg hover:bg-[#1D4ED8] transition-all hover:-translate-y-0.5 hover:shadow-xl w-full sm:w-auto"
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
            <h2 className="text-lg font-black text-foreground">Widgets</h2>
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
        widgetMeta={hubWidgetMeta}
        onToggleVisible={toggleWidgetVisible}
        onSetSize={setWidgetSize}
        onMoveOrder={moveWidgetOrder}
        onReset={resetWidgetPrefs}
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
