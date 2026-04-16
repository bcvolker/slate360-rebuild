"use client";

import DashboardHeader from "@/components/shared/DashboardHeader";
import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  FolderKanban,
} from "lucide-react";
import CreateProjectWizard, {
  CreateProjectPayload,
} from "@/components/projects/CreateProjectWizard";
import ProjectsDeleteModal from "@/components/projects/ProjectsDeleteModal";
import ProjectsAllProjectsTab from "@/components/projects/ProjectsAllProjectsTab";
import type { ProjectListItem, ProjectsSummary } from "@/lib/types/projects";

interface Props {
  user: {name: string, email: string, avatar?: string};
  tier: import("@/lib/entitlements").Tier;
  isCeo?: boolean;
  internalAccess?: { operationsConsole?: boolean };
}

export default function ProjectsClientPage({ user, tier, isCeo = false, internalAccess }: Props) {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summary, setSummary] = useState<ProjectsSummary | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [creating, setCreating] = useState(false);
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
      if (res.ok) setSummary(data as ProjectsSummary);
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
    <div className="min-h-screen bg-zinc-950 overflow-x-hidden">
      <DashboardHeader
        user={user}
        tier={tier}
        isCeo={isCeo}
        internalAccess={internalAccess}
        showBackLink
      />

      <div className="mx-auto max-w-[1440px] px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h1 className="text-xl sm:text-2xl font-black text-white flex items-center gap-3">
            <FolderKanban size={28} className="text-[#D4AF37]" /> Projects
          </h1>
          <button
            onClick={() => setWizardOpen(true)}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-[#E64500] transition-all hover:-translate-y-0.5 hover:shadow-xl w-full sm:w-auto"
          >
            <Plus size={16} /> New Project
          </button>
        </div>

        <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total Projects",
              value: summary?.totals.projects ?? projects.length,
            },
            {
              label: "Active Projects",
              value: summary?.totals.activeProjects ?? 0,
            },
            {
              label: "Open RFIs",
              value: summary?.work.openRfis ?? 0,
            },
            {
              label: "Pending Submittals",
              value: summary?.work.pendingSubmittals ?? 0,
            },
          ].map((item) => (
            <div key={item.label} className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{item.label}</p>
              <p className="mt-1 text-2xl font-black text-white">
                {summaryLoading ? "..." : item.value}
              </p>
            </div>
          ))}
        </section>

        <section className="space-y-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Project Directory</p>
            <h2 className="text-lg font-black text-white">Open a project and continue work</h2>
          </div>

          <ProjectsAllProjectsTab
          loading={loading}
          projects={projects}
          onOpenDeleteProject={openDeleteModal}
          />
        </section>
      </div>

      <CreateProjectWizard
        open={wizardOpen}
        creating={creating}
        error={null}
        onClose={() => setWizardOpen(false)}
        onSubmit={handleCreate}
      />

      <ProjectsDeleteModal
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