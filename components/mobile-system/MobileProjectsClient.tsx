"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, FolderKanban, Loader2, MapPin, Plus, Search } from "lucide-react";
import CreateProjectWizard, {
  type CreateProjectPayload,
} from "@/components/projects/CreateProjectWizard";
import { MobileEmptyState } from "./MobileEmptyState";
import { mobileTokens } from "./mobileTokens";
import { cn } from "@/lib/utils";
import { resolveProjectLocation } from "@/lib/projects/location";
import type { ProjectListItem } from "@/lib/types/projects";

export function MobileProjectsClient() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [wizardOpen, setWizardOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const loadProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      const data = await res.json();
      setProjects(data.projects ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  async function handleCreate(payload: CreateProjectPayload) {
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
  }

  const filtered = projects.filter((project) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [project.name, project.description, project.location, project.city, project.state, project.region]
      .filter((value): value is string => typeof value === "string")
      .some((value) => value.toLowerCase().includes(query));
  });

  return (
    <div className={mobileTokens.mobilePageScrollInner}>
      <section className={cn(mobileTokens.panelBase, "p-5")}>
        <span className={cn(mobileTokens.mobileIconWell, "h-12 w-12")} aria-hidden>
          <FolderKanban className="h-6 w-6" strokeWidth={1.75} />
        </span>
        <span className={mobileTokens.sectionLabelAccentCool} aria-hidden />
        <p className={cn("mt-4", mobileTokens.mobileEyebrowLabel)}>Work directory</p>
        <h1 className={cn("mt-1", mobileTokens.moduleTitle)}>Projects</h1>
        <p className={mobileTokens.moduleSubtitle}>
          Organize Site Walks, files, contacts, and field activity by project.
        </p>
      </section>

      <div className={cn(mobileTokens.mobileGlassCardSurface, "p-3")}>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            aria-hidden
          />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search projects"
            className="h-11 w-full rounded-xl border border-white/10 bg-[#0B0F15]/60 pl-10 pr-4 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-teal-400/40 focus:ring-2 focus:ring-teal-400/15"
          />
        </div>
      </div>

      <section className={cn(mobileTokens.panelBase, "overflow-hidden")}>
        {loading ? (
          <div className="flex justify-center p-10 text-zinc-400">
            <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading projects" />
          </div>
        ) : filtered.length === 0 ? (
          <MobileEmptyState
            icon={FolderKanban}
            title="No projects yet"
            description="Create a project to organize walks, files, and deliverables."
            actionLabel="Create project"
            onAction={() => setWizardOpen(true)}
          />
        ) : (
          filtered.map((project) => {
            const location = resolveProjectLocation(project.metadata, {
              legacyLocation: project.location,
              city: project.city,
              state: project.state,
              region: project.region,
            });
            return (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className={mobileTokens.mobileGlassRowLink}
              >
                <span className={cn(mobileTokens.mobileIconWell, "h-9 w-9")}>
                  <FolderKanban className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{project.name}</span>
                  <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-zinc-400">
                    <MapPin className="h-3 w-3 shrink-0 text-teal-400/70" aria-hidden />
                    {location.label || "No location"}
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-500" />
              </Link>
            );
          })
        )}
      </section>

      <button
        type="button"
        onClick={() => setWizardOpen(true)}
        className={cn(
          mobileTokens.mobilePrimaryButton,
          "fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-30 inline-flex h-14 w-14 items-center justify-center rounded-full shadow-[0_0_18px_rgba(45,212,191,0.25)]",
        )}
        aria-label="Create project"
      >
        <Plus className="h-6 w-6" />
      </button>

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
