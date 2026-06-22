"use client";

/**
 * SubTabs — "tabs within a tab". When a single tab has more content than fits the
 * viewport, split it into sub-tabs (horizontal) instead of letting the page scroll
 * vertically (docs/design/GRAPHITE_GLASS.md: desktop tabs fill height, no big gaps,
 * no vertical scroll — paginate with sub-tabs).
 *
 * Fills its parent's height: the strip is fixed, the active panel takes the rest and
 * scrolls internally only if its own content overflows.
 */
import { useState, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

export type SubTabItem = {
  id: string;
  label: string;
  icon?: LucideIcon;
  content: ReactNode;
};

export default function SubTabs({
  items,
  defaultTabId,
  className = "",
}: {
  items: SubTabItem[];
  defaultTabId?: string;
  className?: string;
}) {
  const [active, setActive] = useState<string>(defaultTabId ?? items[0]?.id ?? "");
  const current = items.find((i) => i.id === active) ?? items[0];

  if (items.length === 0) return null;

  return (
    <div className={`flex h-full min-h-0 flex-col ${className}`}>
      <div
        role="tablist"
        className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-white/[0.06] pb-2"
      >
        {items.map((item) => {
          const Icon = item.icon;
          const selected = item.id === current?.id;
          return (
            <button
              key={item.id}
              role="tab"
              aria-selected={selected}
              type="button"
              onClick={() => setActive(item.id)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                selected
                  ? "bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-text-header)]"
                  : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
              }`}
            >
              {Icon && <Icon className="h-3.5 w-3.5" />}
              {item.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" className="min-h-0 flex-1 overflow-auto pt-4">
        {current?.content}
      </div>
    </div>
  );
}
