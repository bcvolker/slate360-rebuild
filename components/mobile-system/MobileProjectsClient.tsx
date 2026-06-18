"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronRight, FolderKanban, Loader2, MapPin, Plus, Search } from "lucide-react";
import { MobileEmptyState } from "./MobileEmptyState";
import { cn } from "@/lib/utils";
import { resolveProjectLocation } from "@/lib/projects/location";
import type { ProjectListItem } from "@/lib/types/projects";

type Filter = "all" | "active" | "archived";

const CARD =
  "rounded-2xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_78%,transparent)] backdrop-blur-md";

function isArchived(p: ProjectListItem): boolean {
  return (p.status ?? "").toLowerCase() === "archived";
}

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function MobileProjectsClient() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("active");

  const loadProjects = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/projects", { cache: "no-store" });
      if (!res.ok) throw new Error("Couldn't load projects.");
      const data = await res.json();
      setProjects(data.projects ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't load projects.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  const stats = useMemo(() => {
    const archived = projects.filter(isArchived).length;
    return { total: projects.length, active: projects.length - archived, archived };
  }, [projects]);

  const featured = useMemo(
    () =>
      [...projects]
        .filter((p) => !isArchived(p))
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))[0] ?? null,
    [projects],
  );

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return projects.filter((p) => {
      if (filter === "active" && isArchived(p)) return false;
      if (filter === "archived" && !isArchived(p)) return false;
      if (!query) return true;
      return [p.name, p.description, p.location, p.city, p.state, p.region]
        .filter((v): v is string => typeof v === "string")
        .some((v) => v.toLowerCase().includes(query));
    });
  }, [projects, filter, search]);

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 px-1 pt-1">
      {/* Header + inline create (no hidden FAB) */}
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--graphite-muted)]">
            Work directory
          </p>
          <h1 className="text-2xl font-bold text-[var(--graphite-text-header)]">Projects</h1>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[var(--graphite-primary)] px-4 py-2.5 text-sm font-semibold text-[var(--graphite-canvas)] transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> New
        </Link>
      </header>

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-2">
        {([
          ["Total", stats.total],
          ["Active", stats.active],
          ["Archived", stats.archived],
        ] as const).map(([label, value]) => (
          <div key={label} className={cn(CARD, "px-3 py-2.5")}>
            <div className="text-xl font-bold text-[var(--graphite-text-header)]">{value}</div>
            <div className="text-[11px] text-[var(--graphite-muted)]">{label}</div>
          </div>
        ))}
      </div>

      {/* Continue featured */}
      {featured ? (
        <Link
          href={`/projects/${featured.id}`}
          className={cn(CARD, "flex items-center gap-3 p-3 transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)]")}
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-primary)]">
            <FolderKanban className="h-5 w-5" strokeWidth={1.75} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-primary)]">
              Continue
            </span>
            <span className="block truncate text-sm font-semibold text-[var(--graphite-text-header)]">{featured.name}</span>
            <span className="block truncate text-xs text-[var(--graphite-muted)]">
              {featured.status ?? "active"} · {formatDate(featured.created_at)}
            </span>
          </span>
          <ChevronRight className="h-4 w-4 shrink-0 text-[var(--graphite-muted)]" />
        </Link>
      ) : null}

      {/* Search + filter chips */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--graphite-muted)]" aria-hidden />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search projects"
            className="h-10 w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] pl-10 pr-4 text-sm text-[var(--graphite-text-header)] outline-none placeholder:text-[var(--graphite-muted)] focus:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)]"
          />
        </div>
      </div>
      <div className="flex gap-1.5">
        {(["active", "all", "archived"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-semibold capitalize transition-colors",
              filter === f
                ? "bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-text-header)]"
                : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Bounded project list (the one allowed scroll) */}
      <section className={cn(CARD, "min-h-0 flex-1 overflow-y-auto p-2")}>
        {loading ? (
          <div className="flex justify-center p-10 text-[var(--graphite-muted)]">
            <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading projects" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <p className="text-sm text-red-300">{error}</p>
            <button type="button" onClick={() => { setLoading(true); void loadProjects(); }} className="rounded-xl border border-[var(--mobile-app-card-border)] px-4 py-2 text-sm font-semibold text-[var(--graphite-text-body)]">
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <MobileEmptyState
            icon={FolderKanban}
            title={projects.length === 0 ? "No projects yet" : "Nothing here"}
            description={
              projects.length === 0
                ? "Create a project to organize walks, plans, files, and deliverables."
                : "No projects match this filter or search."
            }
            actionLabel={projects.length === 0 ? "Create project" : undefined}
            actionHref={projects.length === 0 ? "/projects/new" : undefined}
          />
        ) : (
          <ul className="space-y-1.5">
            {filtered.map((project) => {
              const location = resolveProjectLocation(project.metadata, {
                legacyLocation: project.location,
                city: project.city,
                state: project.state,
                region: project.region,
              });
              return (
                <li key={project.id}>
                  <Link
                    href={`/projects/${project.id}`}
                    className="flex items-center gap-3 rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] px-3 py-2.5 transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)]"
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--graphite-primary)_12%,transparent)] text-[var(--graphite-primary)]">
                      <FolderKanban className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-[var(--graphite-text-header)]">{project.name}</span>
                      <span className="mt-0.5 flex items-center gap-1 truncate text-xs text-[var(--graphite-muted)]">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                        {location.label || "No location"}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-[var(--graphite-muted)]" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
