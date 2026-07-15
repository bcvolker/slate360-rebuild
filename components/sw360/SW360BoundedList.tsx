"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";

/**
 * Fixed-height, vertically-scrolling container for a list that could grow
 * unbounded (recent walks, active projects) — per Brian's feedback: no
 * horizontal scrolling sections, no lists that push the rest of Home down as
 * they grow. Shows up to `collapsedRows` items' worth of height by default;
 * "Show more" expands in place (no navigation) up to `expandedMaxRows`, and
 * "See all" always routes to the full list screen for anything beyond that.
 */
export function SW360BoundedList({
  itemCount,
  seeAllHref,
  rowHeightPx = 56,
  collapsedRows = 3,
  expandedMaxRows = 6,
  children,
}: {
  itemCount: number;
  seeAllHref: string;
  rowHeightPx?: number;
  collapsedRows?: number;
  expandedMaxRows?: number;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  const canExpand = itemCount > collapsedRows;
  const maxHeight = expanded
    ? Math.min(itemCount, expandedMaxRows) * rowHeightPx
    : collapsedRows * rowHeightPx;

  return (
    <div>
      <div
        className="flex flex-col gap-2 overflow-y-auto pr-0.5"
        style={{ maxHeight }}
      >
        {children}
      </div>
      {canExpand || itemCount > expandedMaxRows ? (
        <div className="mt-2 flex items-center justify-between">
          {canExpand ? (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex items-center gap-1 text-xs font-bold text-[var(--sw360-charcoal)]/60"
            >
              <ChevronDown size={14} className={expanded ? "rotate-180" : ""} />
              {expanded ? "Show less" : "Show more"}
            </button>
          ) : (
            <span />
          )}
          <Link href={seeAllHref} className="text-xs font-bold text-[var(--sw360-green-light)]">
            See all
          </Link>
        </div>
      ) : null}
    </div>
  );
}
