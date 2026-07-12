"use client";

/** W2 "View original" (hold) + Focus mode (toggle) — extracted from AnalyzeToolbar for the file-size gate. */
export function AnalyzeViewControls({
  viewOriginal,
  onViewOriginalStart,
  onViewOriginalEnd,
  focusMode,
  onToggleFocusMode,
}: {
  viewOriginal: boolean;
  onViewOriginalStart: () => void;
  onViewOriginalEnd: () => void;
  focusMode: boolean;
  onToggleFocusMode: () => void;
}) {
  return (
    <div className="flex items-center gap-1 border-l border-[var(--mobile-app-card-border)] pl-2">
      <button
        type="button"
        onMouseDown={onViewOriginalStart}
        onMouseUp={onViewOriginalEnd}
        onMouseLeave={onViewOriginalEnd}
        aria-label="View original camera image (hold)"
        title="Hold to view the original camera image (O) — no overlays, no tuning"
        aria-pressed={viewOriginal}
        className={`rounded px-1.5 py-0.5 ${
          viewOriginal ? "text-[var(--graphite-primary)]" : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
        }`}
      >
        👁
      </button>
      <button
        type="button"
        onClick={onToggleFocusMode}
        aria-label="Focus mode"
        title="Focus mode — collapse the rails and filmstrip for a maximum viewer (F)"
        aria-pressed={focusMode}
        className={`rounded px-1.5 py-0.5 ${
          focusMode ? "text-[var(--graphite-primary)]" : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
        }`}
      >
        ⛶
      </button>
    </div>
  );
}
