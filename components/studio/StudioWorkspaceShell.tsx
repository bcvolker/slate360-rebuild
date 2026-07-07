"use client";

import { type ReactNode } from "react";
import { PanelLeft, PanelRight } from "lucide-react";

/**
 * Shared studio chrome — the Design-Studio frame, on the platform's Graphite tokens
 * so Thermal Studio and Design Studio read as one Slate360 product.
 *
 * Structure (height-bound, NEVER page-scrolls — inner regions scroll instead):
 *
 *   ┌ thin top bar: [leftSlot] · [tabs] · [rightSlot] ──────────────┐
 *   ├──────────────┬─────────────────────────────┬─────────────────┤
 *   │ left rail    │        center (hero)         │  right rail     │
 *   │ (collapsible)│   large, dark, edge-to-edge  │  (collapsible)  │
 *   ├──────────────┴─────────────────────────────┴─────────────────┤
 *   │ bottom dock (collapsible) — e.g. a horizontal filmstrip       │
 *   └──────────────────────────────────────────────────────────────┘
 *
 * Pass `children` to fill the whole body yourself (Phase-1 stages that aren't
 * decomposed into rails), or pass `left`/`center`/`right`/`bottom` slots to get
 * the full workspace frame.
 */

export type StudioTab<T extends string = string> = { id: T; label: string; badge?: number | null };

export function StudioTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: StudioTab<T>[];
  active: T;
  onChange: (id: T) => void;
}) {
  return (
    <nav className="flex items-center gap-1" aria-label="Workspace sections">
      {tabs.map((tn) => {
        const on = tn.id === active;
        return (
          <button
            key={tn.id}
            type="button"
            onClick={() => onChange(tn.id)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              on
                ? "bg-[color-mix(in_srgb,var(--graphite-primary)_16%,transparent)] text-[var(--graphite-text-header)]"
                : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
            }`}
          >
            {tn.label}
            {tn.badge ? (
              <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--graphite-primary)_70%,transparent)] px-1 text-[9px] font-bold tabular-nums text-[var(--graphite-canvas)]">
                {tn.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
}

/** A small read-only metric chip for the top bar (replaces the old summary card row). */
export function StudioChip({ label, value }: { label: string; value: ReactNode }) {
  return (
    <span className="flex items-baseline gap-1 rounded-md border border-[var(--mobile-app-card-border)] px-2 py-0.5 text-[11px]">
      <span className="text-[var(--graphite-muted)]">{label}</span>
      <span className="font-semibold tabular-nums text-[var(--graphite-text-header)]">{value}</span>
    </span>
  );
}

export function StudioRailToggle({
  side,
  open,
  onToggle,
}: {
  side: "left" | "right";
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={`${open ? "Hide" : "Show"} ${side} panel`}
      className="rounded p-1 text-[var(--graphite-muted)] hover:bg-[color-mix(in_srgb,var(--graphite-text-header)_8%,transparent)] hover:text-[var(--graphite-text-header)]"
    >
      {side === "left" ? <PanelLeft className="size-4" /> : <PanelRight className="size-4" />}
    </button>
  );
}

export function StudioWorkspaceShell({
  title,
  subtitle,
  tabsSlot,
  leftSlot,
  rightSlot,
  left,
  center,
  right,
  bottom,
  children,
  bare = false,
}: {
  title: string;
  /** e.g. the active session name. */
  subtitle?: ReactNode;
  /** Tabs, rendered centered in the bar. */
  tabsSlot?: ReactNode;
  /** Extra controls on the far left of the bar (e.g. a back link / left toggle). */
  leftSlot?: ReactNode;
  /** Chips / actions / right toggle on the far right of the bar. */
  rightSlot?: ReactNode;
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  bottom?: ReactNode;
  children?: ReactNode;
  /**
   * Edge-to-edge, no floating-card frame (matches Design Studio's actual root
   * shell — flat canvas, hairline dividers only, no rounded outer border).
   * Existing consumers (old Thermal Studio, Tour Builder) keep the boxed
   * default so they don't regress.
   */
  bare?: boolean;
}) {
  return (
    <div
      className={`flex h-full min-h-0 flex-col overflow-hidden bg-[var(--graphite-canvas)] ${
        bare ? "" : "rounded-2xl border border-[var(--mobile-app-card-border)]"
      }`}
    >
      {/* Thin top bar */}
      <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-[var(--mobile-app-card-border)] px-3">
        <div className="flex min-w-0 items-center gap-2">
          {leftSlot}
          <h1 className="shrink-0 text-sm font-semibold text-[var(--graphite-text-header)]">{title}</h1>
          {subtitle ? (
            <span className="min-w-0 max-w-[220px] truncate text-xs text-[var(--graphite-muted)]">{subtitle}</span>
          ) : null}
        </div>
        {tabsSlot ? <div className="flex shrink-0 items-center">{tabsSlot}</div> : null}
        <div className="flex min-w-0 items-center justify-end gap-1.5">{rightSlot}</div>
      </header>

      {/* Body */}
      {children ? (
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 overflow-hidden">
            {left ? (
              <aside className="flex w-[260px] shrink-0 flex-col overflow-hidden border-r border-[var(--mobile-app-card-border)]">
                {left}
              </aside>
            ) : null}
            <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-[var(--graphite-canvas-deep)]">
              {center}
            </main>
            {right ? (
              <aside className="flex w-[300px] shrink-0 flex-col overflow-hidden border-l border-[var(--mobile-app-card-border)]">
                {right}
              </aside>
            ) : null}
          </div>
          {bottom ? (
            <div className="shrink-0 border-t border-[var(--mobile-app-card-border)]">{bottom}</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
