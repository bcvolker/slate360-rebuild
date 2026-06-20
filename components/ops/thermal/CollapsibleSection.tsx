"use client";

import { useState, type ReactNode } from "react";

/**
 * A collapsible right-rail section. Header toggles open/closed so the rail's sections
 * fit without page scroll — open sections scroll internally if tall.
 */
export function CollapsibleSection({
  title,
  defaultOpen = true,
  badge,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  badge?: string | number;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-lg px-1.5 py-1 text-left hover:bg-[color-mix(in_srgb,var(--graphite-primary)_8%,transparent)]"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[var(--graphite-text-header)]">
          {title}
          {badge != null && badge !== 0 ? (
            <span className="rounded-full bg-[color-mix(in_srgb,var(--graphite-primary)_22%,transparent)] px-1.5 text-[10px] font-bold text-[var(--graphite-text-header)]">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="text-[var(--graphite-muted)]">{open ? "▾" : "▸"}</span>
      </button>
      {open ? <div className="mt-1">{children}</div> : null}
    </div>
  );
}
