"use client";

/** S5.6 Local contrast + A/B flicker — both Display-accordion sensitivity aids. */
export function AnalyzeContrastFlicker({
  localContrast,
  onLocalContrastChange,
  hasA,
  hasB,
  flickerShowing,
  autoFlicker,
  onAutoFlickerChange,
  onSnapshotA,
  onSnapshotB,
  onToggleView,
  onClearFlicker,
}: {
  localContrast: boolean;
  onLocalContrastChange: (next: boolean) => void;
  hasA: boolean;
  hasB: boolean;
  flickerShowing: "A" | "B";
  autoFlicker: boolean;
  onAutoFlickerChange: (next: boolean) => void;
  onSnapshotA: () => void;
  onSnapshotB: () => void;
  onToggleView: () => void;
  onClearFlicker: () => void;
}) {
  const bothSet = hasA && hasB;
  return (
    <div className="flex flex-col gap-3 border-t border-[var(--mobile-app-card-border)] pt-3">
      <label className="flex items-center gap-2 text-[11px] text-[var(--graphite-text-header)]">
        <input type="checkbox" checked={localContrast} onChange={(e) => onLocalContrastChange(e.target.checked)} />
        Local contrast (display only)
      </label>

      <div className="flex flex-col gap-2">
        <span className="text-[11px] text-[var(--graphite-muted)]">Snapshot A/B — compare two looks</span>
        <div className="flex items-center gap-2 text-[11px]">
          <button
            type="button"
            onClick={onSnapshotA}
            title="Store the current palette + span as snapshot A"
            className="rounded-md border border-[var(--mobile-app-card-border)] px-2 py-1 font-medium text-[var(--graphite-text-header)] hover:border-[var(--graphite-primary)]"
          >
            {hasA ? "✓ A" : "Store A"}
          </button>
          <button
            type="button"
            onClick={onSnapshotB}
            title="Store the current palette + span as snapshot B"
            className="rounded-md border border-[var(--mobile-app-card-border)] px-2 py-1 font-medium text-[var(--graphite-text-header)] hover:border-[var(--graphite-primary)]"
          >
            {hasB ? "✓ B" : "Store B"}
          </button>
          {bothSet ? (
            <>
              <button
                type="button"
                onClick={onToggleView}
                title="Swap between A and B ( \\ )"
                className="rounded-md border border-[var(--graphite-primary)] px-2 py-1 font-semibold text-[var(--graphite-text-header)]"
              >
                Showing {flickerShowing}
              </button>
              <button type="button" onClick={onClearFlicker} title="Clear both snapshots" className="text-[var(--graphite-muted)] hover:text-red-400">
                ✕
              </button>
            </>
          ) : null}
        </div>
        {bothSet ? (
          <label className="flex items-center gap-2 text-[11px] text-[var(--graphite-text-header)]">
            <input type="checkbox" checked={autoFlicker} onChange={(e) => onAutoFlickerChange(e.target.checked)} />
            Auto-flicker (2Hz — off if you prefer reduced motion)
          </label>
        ) : null}
      </div>
    </div>
  );
}
