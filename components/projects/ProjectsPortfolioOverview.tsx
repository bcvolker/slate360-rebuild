"use client";

import Link from "next/link";
import { FolderKanban, CircleDot, CheckCircle2, PauseCircle, ChevronRight } from "lucide-react";
import type { ProjectListItem } from "@/lib/types/projects";

type Props = {
  projects: ProjectListItem[];
  loading?: boolean;
};

type StatusKey = "active" | "completed" | "on-hold";

function normalizeStatus(raw: string | null | undefined): StatusKey {
  const s = String(raw ?? "").toLowerCase();
  if (s === "completed") return "completed";
  if (s === "on-hold" || s === "on_hold") return "on-hold";
  return "active";
}

const STATUS_META: Record<StatusKey, { label: string; icon: typeof CircleDot }> = {
  active: { label: "Active", icon: CircleDot },
  completed: { label: "Completed", icon: CheckCircle2 },
  "on-hold": { label: "On hold", icon: PauseCircle },
};

function relativeDate(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const days = Math.floor((Date.now() - then) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

const panel = "rounded-xl border border-white/10 bg-white/[0.04] backdrop-blur-md";
const eyebrow =
  "font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--graphite-muted)]";

export default function ProjectsPortfolioOverview({ projects, loading }: Props) {
  const counts = projects.reduce(
    (acc, p) => {
      acc[normalizeStatus(p.status)] += 1;
      return acc;
    },
    { active: 0, completed: 0, "on-hold": 0 } as Record<StatusKey, number>,
  );

  const recent = [...projects]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 12);

  const locationOf = (p: ProjectListItem) =>
    p.location || [p.city, p.state].filter(Boolean).join(", ") || p.region || "Location not set";

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto pb-4">
      {/* Status rollup — real counts, no vanity KPIs */}
      <section aria-label="Portfolio status">
        <p className={`${eyebrow} mb-2`}>Portfolio</p>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(STATUS_META) as StatusKey[]).map((key) => {
            const Icon = STATUS_META[key].icon;
            return (
              <div key={key} className={`${panel} flex items-center gap-3 px-3 py-3`}>
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,var(--app-accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--app-accent)_12%,transparent)] text-[var(--app-accent)]">
                  <Icon className="h-4 w-4" strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <p className="text-lg font-semibold leading-none text-white">{counts[key]}</p>
                  <p className={`${eyebrow} mt-1`}>{STATUS_META[key].label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Recent projects — every row clicks into the workspace */}
      <section aria-label="Recent projects" className="min-h-0 flex-1">
        <p className={`${eyebrow} mb-2`}>Recent projects</p>
        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className={`${panel} h-16 animate-pulse`} />
            ))}
          </div>
        ) : recent.length === 0 ? (
          <div className={`${panel} flex flex-col items-center gap-3 px-6 py-12 text-center`}>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-[color-mix(in_srgb,var(--app-accent)_28%,transparent)] bg-[color-mix(in_srgb,var(--app-accent)_12%,transparent)] text-[var(--app-accent)]">
              <FolderKanban className="h-6 w-6" strokeWidth={1.5} />
            </span>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-white">No projects yet</p>
              <p className="max-w-xs text-xs leading-relaxed text-[var(--graphite-muted)]">
                Create a project to start capturing walks, twins, and deliverables.
              </p>
            </div>
          </div>
        ) : (
          <ul className="space-y-2">
            {recent.map((p) => {
              const status = normalizeStatus(p.status);
              return (
                <li key={p.id}>
                  <Link
                    href={`/projects/${p.id}`}
                    className={`${panel} flex items-center gap-3 px-4 py-3 transition-colors hover:border-[color-mix(in_srgb,var(--app-accent)_40%,transparent)]`}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-[var(--graphite-muted)]">
                      <FolderKanban className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-white">{p.name}</p>
                      <p className="truncate text-xs text-[var(--graphite-muted)]">
                        {STATUS_META[status].label} · {locationOf(p)} · {relativeDate(p.created_at)}
                      </p>
                    </div>
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
