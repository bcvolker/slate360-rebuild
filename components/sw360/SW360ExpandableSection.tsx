"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, X } from "lucide-react";

/**
 * Replaces the earlier "pills in a horizontal/bounded scroller" pattern per
 * Brian's feedback: this renders ONE clearly-bounded, tinted container (not
 * a row of individually-carded pills) whose rows span its full width,
 * separated by hairlines. A single header control expands it in place to
 * show more rows (scrollable) and collapses it back — no separate
 * page-navigating "See all" link competing with it. Closes on an explicit
 * close tap or on an outside click.
 */
export function SW360ExpandableSection({
  title,
  itemCount,
  collapsedRows = 3,
  expandedMaxRows = 7,
  rowHeightPx = 56,
  children,
}: {
  title: string;
  itemCount: number;
  collapsedRows?: number;
  expandedMaxRows?: number;
  rowHeightPx?: number;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canExpand = itemCount > collapsedRows;

  useEffect(() => {
    if (!expanded) return;
    function onClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [expanded]);

  const maxHeight = expanded
    ? Math.min(itemCount, expandedMaxRows) * rowHeightPx
    : Math.min(itemCount, collapsedRows) * rowHeightPx;

  return (
    <div ref={containerRef}>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--sw360-charcoal)]/60">{title}</p>
        {canExpand ? (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-label={expanded ? "Close" : `Open — ${itemCount} total`}
            className="flex min-h-[26px] shrink-0 items-center gap-1 rounded-full border border-[var(--sw360-green-light)] px-2.5 text-[11px] font-bold text-[var(--sw360-green-light)]"
          >
            {expanded ? (
              <>
                Close <X size={12} />
              </>
            ) : (
              <>
                {itemCount} total · Open <ChevronDown size={12} />
              </>
            )}
          </button>
        ) : null}
      </div>
      <div
        className="overflow-hidden rounded-2xl border border-[var(--sw360-charcoal)]/20 bg-[var(--sw360-silver)]/40"
        style={{ boxShadow: "0 1px 2px color-mix(in srgb, var(--sw360-charcoal) 6%, transparent)" }}
      >
        <div className="overflow-y-auto transition-[max-height] duration-200" style={{ maxHeight }}>
          {children}
        </div>
      </div>
    </div>
  );
}
