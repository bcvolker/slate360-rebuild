"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MoreHorizontal, Plus } from "lucide-react";
import { dashboardDesktopTokens as t } from "./dashboard-tokens";

export type RailProject = { id: string; name: string; status: string; createdAt: string };

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function DashboardProjectsRail({ projects, total }: { projects: RailProject[]; total: number }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function rename(p: RailProject) {
    setMenuId(null);
    const name = window.prompt("Rename project", p.name)?.trim();
    if (!name || name === p.name) return;
    setBusyId(p.id);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Rename failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rename failed");
    } finally {
      setBusyId(null);
    }
  }

  async function remove(p: RailProject) {
    setMenuId(null);
    if (!window.confirm(`Delete project "${p.name}"? This cannot be undone.`)) return;
    setBusyId(p.id);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${p.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Delete failed");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <section className="flex min-h-0 flex-col">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h2 className={t.sectionLabel}>Projects{total ? ` · ${total}` : ""}</h2>
        <Link href="/projects" className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--graphite-primary)] hover:underline">
          View all <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      {error ? <p className="mb-2 text-xs text-[#fca5a5]">{error}</p> : null}

      <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
        <Link
          href="/projects"
          className={`${t.card} flex w-44 shrink-0 snap-start flex-col items-center justify-center gap-2 p-4 text-[var(--graphite-muted)] transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_42%,transparent)] hover:text-[var(--graphite-text-header)]`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--mobile-app-card-border)]">
            <Plus className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold">New project</span>
        </Link>

        {projects.map((p) => (
          <div
            key={p.id}
            className={`${t.card} relative w-64 shrink-0 snap-start p-4 ${busyId === p.id ? "opacity-50" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <Link href={`/projects/${p.id}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--graphite-text-header)]">{p.name}</p>
                <p className="mt-1 truncate text-xs text-[var(--graphite-muted)]">
                  {p.status} · {formatDate(p.createdAt)}
                </p>
              </Link>
              <button
                type="button"
                onClick={() => setMenuId(menuId === p.id ? null : p.id)}
                aria-label="Project actions"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[var(--graphite-muted)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] hover:text-[var(--graphite-text-header)]"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
            </div>

            {menuId === p.id ? (
              <div className="absolute right-3 top-12 z-20 w-32 overflow-hidden rounded-lg border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas)] text-sm shadow-[var(--mobile-app-card-shadow)]">
                <Link href={`/projects/${p.id}`} className="block px-3 py-2 text-[var(--graphite-text-body)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)]">Open</Link>
                <button type="button" onClick={() => rename(p)} className="block w-full px-3 py-2 text-left text-[var(--graphite-text-body)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)]">Rename</button>
                <button type="button" onClick={() => remove(p)} className="block w-full px-3 py-2 text-left text-[#fca5a5] hover:bg-[color-mix(in_srgb,#fca5a5_10%,transparent)]">Delete</button>
              </div>
            ) : null}

            <Link
              href={`/projects/${p.id}`}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[var(--graphite-primary)] hover:underline"
            >
              Open project <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}
