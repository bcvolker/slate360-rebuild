"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  FolderKanban,
  Plus,
  Search,
} from "lucide-react";
import CreateProjectWizard, {
  CreateProjectPayload,
} from "@/components/projects/CreateProjectWizard";
import ProjectsDeleteModal from "@/components/projects/ProjectsDeleteModal";
import ProjectsAllProjectsTab from "@/components/projects/ProjectsAllProjectsTab";
import ProjectsPortfolioOverview from "@/components/projects/ProjectsPortfolioOverview";
import SubTabs from "@/components/shared/SubTabs";
import GlassCard from "@/components/shared/GlassCard";
import type { ProjectListItem } from "@/lib/types/projects";

export default function ProjectsClientPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
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

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const handleCreate = async (payload: CreateProjectPayload) => {
    setCreating(true);
    setCreateError(null);
    try {
      const res = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; project?: { id?: string } };
      if (!res.ok) {
        // Keep the wizard open with the user's input intact so they can retry.
        setCreateError(data.error || "Couldn't create the project. Please try again.");
        return;
      }
      setWizardOpen(false);
      // Complete the loop: drop the user into the new project's home, not back on
      // the list. Fall back to a refetch if the id didn't come back.
      if (data.project?.id) {
        router.push(`/projects/${data.project.id}`);
      } else {
        await loadProjects();
      }
    } catch {
      setCreateError("Network error. Please check your connection and try again.");
    } finally {
      setCreating(false);
    }
  };

  const filteredProjects = projects.filter((project) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [project.name, project.description, project.location, project.city, project.state, project.region]
      .filter((value): value is string => typeof value === "string")
      .some((value) => value.toLowerCase().includes(query));
  });

  return (
    <div className="flex h-full min-h-0 flex-col overflow-x-hidden text-slate-50">
      <div className="flex min-h-0 w-full flex-1 flex-col gap-4 px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex shrink-0 items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--graphite-primary)] text-slate-950 shadow-lg shadow-[color-mix(in_srgb,var(--graphite-primary)_20%,transparent)]">
              <FolderKanban className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-[var(--graphite-primary)]">Work directory</p>
              <h1 className="truncate text-2xl font-black text-white">Projects</h1>
            </div>
          </div>
          <button
            onClick={() => { setCreateError(null); setWizardOpen(true); }}
            className="hidden min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--graphite-primary)] px-4 text-sm font-black text-slate-950 transition hover:bg-[color-mix(in_srgb,var(--graphite-primary)_85%,white)] sm:inline-flex"
          >
            <Plus className="h-4 w-4" /> New Work
          </button>
        </div>

        <GlassCard className="shrink-0 p-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search projects and site visits"
              className="h-12 w-full rounded-2xl border border-slate-700/60 bg-slate-950/45 pl-10 pr-4 text-sm font-bold text-white outline-none placeholder:text-slate-500 focus:border-[var(--graphite-primary)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--graphite-primary)_20%,transparent)]"
            />
          </div>
        </GlassCard>

        {/* Sub-tabs: paginate the module instead of one long scrolling page */}
        <div className="min-h-0 flex-1">
          <SubTabs
            items={[
              {
                id: "all",
                label: `All Projects${filteredProjects.length ? ` · ${filteredProjects.length}` : ""}`,
                content: (
                  <ProjectsAllProjectsTab
                    loading={loading}
                    projects={filteredProjects}
                    onOpenDeleteProject={openDeleteModal}
                  />
                ),
              },
              {
                id: "portfolio",
                label: "Portfolio",
                content: (
                  <ProjectsPortfolioOverview projects={filteredProjects} loading={loading} />
                ),
              },
            ]}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={() => { setCreateError(null); setWizardOpen(true); }}
        className="fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--graphite-primary)] text-slate-950 transition hover:bg-[color-mix(in_srgb,var(--graphite-primary)_85%,white)] sm:hidden"
        aria-label="Create project or site visit"
      >
        <Plus className="h-6 w-6" />
      </button>

      <CreateProjectWizard
        open={wizardOpen}
        creating={creating}
        error={createError}
        onClose={() => {
          setWizardOpen(false);
          setCreateError(null);
        }}
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