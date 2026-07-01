"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus } from "lucide-react";
import { DashboardEmptyState } from "./DashboardEmptyState";
import { dashboardDesktopTokens as t } from "./dashboard-tokens";
import { subTabButtonClass } from "../shared/SubTabs";

export type WorkspaceItem = {
  id: string;
  title: string;
  status: string;
  projectName?: string | null;
  updatedAt: string;
  href: string;
};

function fmt(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// Show a full grid (was 6 — truncated the library into a tiny box; Brian's "mostly empty" complaint).
const VISIBLE_CAP = 18;

/**
 * Single-screen domain workspace for a dashboard section (Site Walks, Twins…).
 * Replaces the old "unbounded list" tabs: a stat row + workflow sub-tabs
 * (Active → Completed → All, in the order they're used) + a capped recent grid
 * so the page fits one screen with no scroll. The exhaustive list lives behind
 * the primary action ("view all"), not on the dashboard tab.
 */
export function DashboardDomainWorkspace({
  title,
  subtitle,
  primaryAction,
  items,
  activeStatuses,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  subtitle: string;
  primaryAction: { label: string; href: string };
  items: WorkspaceItem[];
  activeStatuses: string[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  const isActive = (s: string) => activeStatuses.includes(s.toLowerCase());
  const active = items.filter((i) => isActive(i.status));
  const completed = items.filter((i) => !isActive(i.status));

  const TABS = [
    { id: "active", label: `Active · ${active.length}`, list: active },
    { id: "completed", label: `Completed · ${completed.length}`, list: completed },
    { id: "all", label: `All · ${items.length}`, list: items },
  ] as const;

  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("active");
  const current = TABS.find((x) => x.id === tab) ?? TABS[0];
  const shown = current.list.slice(0, VISIBLE_CAP);
  const moreCount = current.list.length - shown.length;

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className={t.pageTitle}>{title}</h1>
          <p className={t.pageSubtitle}>{subtitle}</p>
        </div>
        <Link
          href={primaryAction.href}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--graphite-primary)] px-4 py-2 text-sm font-semibold text-[var(--graphite-canvas)] transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> {primaryAction.label}
        </Link>
      </header>

      {items.length === 0 ? (
        <DashboardEmptyState
          title={emptyTitle}
          description={emptyDescription}
          actionLabel={primaryAction.label}
          actionHref={primaryAction.href}
        />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <div className={t.statCard}>
              <div className={t.statValue}>{items.length}</div>
              <div className={t.statLabel}>Total</div>
            </div>
            <div className={t.statCard}>
              <div className={t.statValue}>{active.length}</div>
              <div className={t.statLabel}>Active</div>
            </div>
            <div className={t.statCard}>
              <div className={t.statValue}>{completed.length}</div>
              <div className={t.statLabel}>Completed</div>
            </div>
          </div>

          <nav className="flex gap-1" aria-label={`${title} views`}>
            {TABS.map((x) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setTab(x.id)}
                className={subTabButtonClass(tab === x.id)}
              >
                {x.label}
              </button>
            ))}
          </nav>

          {current.list.length === 0 ? (
            <div className={t.emptyState}>
              <p className="text-sm text-[var(--graphite-muted)]">Nothing in this view.</p>
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {shown.map((i) => (
                  <Link key={i.id} href={i.href} className={`${t.cardInteractive} flex flex-col gap-1 p-4`}>
                    <span className="truncate text-sm font-semibold text-[var(--graphite-text-header)]">{i.title}</span>
                    <span className="truncate text-xs text-[var(--graphite-muted)]">
                      {i.status}
                      {i.projectName ? ` · ${i.projectName}` : ""}
                    </span>
                    <span className="text-[11px] text-[var(--graphite-muted)]">{fmt(i.updatedAt)}</span>
                  </Link>
                ))}
              </div>
              {moreCount > 0 ? (
                <Link
                  href={primaryAction.href}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--graphite-primary)] hover:underline"
                >
                  +{moreCount} more — view all <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              ) : null}
            </>
          )}
        </>
      )}
    </div>
  );
}
