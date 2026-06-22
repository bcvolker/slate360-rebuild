"use client";

type Props = {
  saveState: string;
  detailSaveError?: string | null;
  detailsSaving?: boolean;
};

export function CaptureV2SaveStatus({ saveState, detailSaveError, detailsSaving }: Props) {
  const label = detailsSaving
    ? "Saving…"
    : detailSaveError
      ? "Save failed"
      : saveState === "dirty"
        ? "Unsaved changes"
        : saveState === "saving"
          ? "Saving…"
          : saveState === "saved"
            ? "Saved"
            : saveState === "error"
              ? "Save error"
              : "Ready";

  const tone = detailSaveError || saveState === "error"
    ? "text-red-300"
    : saveState === "dirty"
      ? "text-[var(--graphite-muted)]"
      : saveState === "saved"
        ? "text-emerald-300"
        : "text-slate-400";

  return (
    <div className="flex items-center justify-between gap-2">
      <p className={`text-[10px] font-black uppercase tracking-[0.16em] ${tone}`}>{label}</p>
      {detailSaveError && (
        <p className="truncate text-[10px] font-semibold text-red-200/90">{detailSaveError}</p>
      )}
    </div>
  );
}
