"use client";

type QuickMetricChip = {
  id: string;
  label: string;
  onClick: () => void;
};

/**
 * Thin, non-grid row of small clickable KPI chips — lives ABOVE the widget grid so
 * it never competes with widgets for space. Every chip deep-links straight into the
 * view it summarizes; chips only render when the count is actionable (nonzero).
 * (docs/design/DASHBOARD_EXPANDABLE_WORKSPACE_LOCKED.md, section 2b)
 */
export function QuickMetricsStrip({ chips }: { chips: QuickMetricChip[] }) {
  if (chips.length === 0) return null;

  return (
    <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.id}
          type="button"
          onClick={chip.onClick}
          className="inline-flex h-7 items-center rounded-full border border-[color-mix(in_srgb,var(--graphite-primary)_32%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] px-3 text-xs font-semibold text-[var(--graphite-primary)] transition-colors hover:bg-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)]"
        >
          {chip.label}
        </button>
      ))}
    </div>
  );
}

export type { QuickMetricChip };
