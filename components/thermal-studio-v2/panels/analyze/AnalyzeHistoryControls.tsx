"use client";

/** Undo/redo + copy/paste settings — extracted from AnalyzeToolbar for the file-size gate. */
export function AnalyzeHistoryControls({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onCopySettings,
  onPasteSettings,
  canPaste,
}: {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onCopySettings: () => void;
  onPasteSettings: () => void;
  canPaste: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          className="rounded px-1.5 py-0.5 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          ↶
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          className="rounded px-1.5 py-0.5 text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          ↷
        </button>
      </div>
      <div className="flex items-center gap-1 border-l border-[var(--mobile-app-card-border)] pl-2">
        <button
          type="button"
          onClick={onCopySettings}
          title="Copy this image's palette, span, tuning, and alarm mode (Ctrl+Shift+C)"
          className="rounded px-1.5 py-0.5 text-[11px] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)]"
        >
          ⧉ Copy
        </button>
        <button
          type="button"
          onClick={onPasteSettings}
          disabled={!canPaste}
          title={canPaste ? "Paste the copied look onto this scope (Ctrl+Shift+V)" : "Copy a look first"}
          className="rounded px-1.5 py-0.5 text-[11px] text-[var(--graphite-muted)] hover:text-[var(--graphite-text-header)] disabled:cursor-not-allowed disabled:opacity-30"
        >
          ⧉ Paste
        </button>
      </div>
    </>
  );
}
