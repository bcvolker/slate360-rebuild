"use client";

import type { ReactNode } from "react";

/**
 * Right-rail accordion section (doc §1, Tab 2 — Measurements opens first).
 * L1 (Addendum D3): single-open group — the parent owns which section is
 * open so opening one closes the others, instead of independently toggled
 * sections stacking into a scrolling wall of open panels.
 */
export function AnalyzeAccordion({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col border-b border-[var(--mobile-app-card-border)] last:border-b-0">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex shrink-0 items-center justify-between px-1 py-2 text-left"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">{title}</span>
        <span className="text-[var(--graphite-muted)]">{open ? "▾" : "▸"}</span>
      </button>
      {open ? <div className="min-h-0 pb-2">{children}</div> : null}
    </div>
  );
}
