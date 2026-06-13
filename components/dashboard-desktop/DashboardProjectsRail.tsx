"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, MoreHorizontal, Plus } from "lucide-react";
import { dashboardDesktopTokens as t } from "./dashboard-tokens";

export type RailProject = { id: string; name: string; status: string; createdAt: string; imageUrl?: string | null };

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
          className={`${t.card} flex h-40 w-44 shrink-0 snap-start flex-col items-center justify-center gap-2 p-4 text-[var(--graphite-muted)] transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_42%,transparent)] hover:text-[var(--graphite-text-header)]`}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--mobile-app-card-border)]">
            <Plus className="h-5 w-5" />
          </span>
          <span className="text-sm font-semibold">New project</span>
        </Link>

        {projects.map((p) => (
          <div
            key={p.id}
            className={`relative h-40 w-64 shrink-0 snap-start overflow-hidden rounded-2xl border border-[var(--mobile-app-card-border)] shadow-[var(--mobile-app-card-shadow)] transition-all hover:border-[color-mix(in_srgb,var(--graphite-primary)_42%,transparent)] ${busyId === p.id ? "opacity-50" : ""}`}
          >
            {p.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.imageUrl} alt={p.name} className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(120% 120% at 30% 20%, color-mix(in_srgb,var(--graphite-primary) 30%, var(--graphite-canvas)) 0%, var(--graphite-canvas) 75%)",
                }}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

            {/* Whole-card open target (below the menu) */}
            <Link href={`/projects/${p.id}`} className="absolute inset-0 z-0" aria-label={`Open ${p.name}`} />

            <button
              type="button"
              onClick={() => setMenuId(menuId === p.id ? null : p.id)}
              aria-label="Project actions"
              className="absolute right-2 top-2 z-10 flex h-7 w-7 items-center justify-center rounded-md bg-black/40 text-white/90 hover:bg-black/60"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>

            {menuId === p.id ? (
              <div className="absolute right-2 top-10 z-20 w-32 overflow-hidden rounded-lg border border-[var(--mobile-app-card-border)] bg-[var(--graphite-canvas)] text-sm shadow-[var(--mobile-app-card-shadow)]">
                <Link href={`/projects/${p.id}`} className="block px-3 py-2 text-[var(--graphite-text-body)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)]">Open</Link>
                <button type="button" onClick={() => rename(p)} className="block w-full px-3 py-2 text-left text-[var(--graphite-text-body)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)]">Rename</button>
                <button type="button" onClick={() => remove(p)} className="block w-full px-3 py-2 text-left text-[#fca5a5] hover:bg-[color-mix(in_srgb,#fca5a5_10%,transparent)]">Delete</button>
              </div>
            ) : null}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 p-3">
              <p className="truncate text-sm font-bold text-white">{p.name}</p>
              <p className="mt-0.5 truncate text-xs text-white/70">{p.status} · {formatDate(p.createdAt)}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
