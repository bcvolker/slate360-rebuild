"use client";

import { useState, type ReactNode } from "react";

/** Right-rail accordion section (doc §1, Tab 2 — Measurements opens first). */
export function AnalyzeAccordion({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="flex flex-col border-b border-[var(--mobile-app-card-border)] last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex shrink-0 items-center justify-between px-1 py-2 text-left"
      >
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]">{title}</span>
        <span className="text-[var(--graphite-muted)]">{open ? "▾" : "▸"}</span>
      </button>
      {open ? <div className="min-h-0 pb-2">{children}</div> : null}
    </div>
  );
}
