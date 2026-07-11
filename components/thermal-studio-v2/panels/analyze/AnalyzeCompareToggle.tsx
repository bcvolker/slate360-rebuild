"use client";

/** S6.5 Compare toggle + span-lock — extracted from AnalyzeToolbar for the file-size gate. */
export function AnalyzeCompareToggle({
  canCompare,
  compareMode,
  onToggleCompare,
  spanLock,
  onSpanLockChange,
}: {
  /** Enabled only when exactly 2 captures are selected. */
  canCompare: boolean;
  compareMode: boolean;
  onToggleCompare: () => void;
  spanLock: boolean;
  onSpanLockChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2 border-l border-[var(--mobile-app-card-border)] pl-2">
      <button
        type="button"
        onClick={onToggleCompare}
        disabled={!canCompare && !compareMode}
        title={canCompare || compareMode ? "Compare two selected images side by side" : "Select exactly 2 images in Library to compare"}
        aria-pressed={compareMode}
        className={`rounded px-1.5 py-0.5 text-[11px] font-medium disabled:cursor-not-allowed disabled:opacity-30 ${
          compareMode ? "text-[var(--graphite-primary)]" : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
        }`}
      >
        ⧉⧉ Compare
      </button>
      {compareMode ? (
        <label className="flex items-center gap-1 text-[11px] text-[var(--graphite-muted)]">
          <input type="checkbox" checked={spanLock} onChange={(e) => onSpanLockChange(e.target.checked)} />
          Lock span across both
        </label>
      ) : null}
    </div>
  );
}
