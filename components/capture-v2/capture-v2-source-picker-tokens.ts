/** Source picker sheet — max 45dvh incl. safe-area, compact rows, 30% photo scrim. */
export const CAPTURE_V2_SOURCE_PICKER_SNAP = "45dvh";

export const captureV2SourcePickerTokens = {
  scrim:
    "pointer-events-auto absolute inset-0 bg-[color-mix(in_srgb,var(--graphite-canvas)_30%,transparent)]",
  frame:
    "pointer-events-auto absolute inset-x-0 bottom-0 flex max-h-[45dvh] flex-col rounded-t-2xl border-t border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] backdrop-blur-xl",
  handle: "mx-auto mt-2 block h-1 w-10 shrink-0 rounded-full bg-[var(--graphite-muted)]",
  header: "shrink-0 px-3 pb-1 pt-1",
  title: "text-sm font-semibold text-[var(--graphite-text-header)]",
  subtitle: "text-[11px] font-medium text-[var(--graphite-muted)]",
  list: "min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[max(12px,env(safe-area-inset-bottom))]",
  row:
    "flex min-h-[50px] w-full items-center gap-2.5 rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] px-3 py-2 text-left transition active:scale-[0.99] disabled:opacity-55",
  rowLocked:
    "border-[color-mix(in_srgb,var(--graphite-muted)_28%,transparent)] bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)]",
  iconWell:
    "flex size-5 shrink-0 items-center justify-center rounded-md border border-[var(--accent-border-green)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] text-[var(--graphite-primary)]",
  iconWellLocked:
    "border-[color-mix(in_srgb,var(--graphite-muted)_30%,transparent)] bg-[color-mix(in_srgb,var(--graphite-canvas)_65%,transparent)] text-[var(--graphite-muted)]",
  rowText: "min-w-0 flex-1 truncate text-sm font-semibold text-[var(--graphite-text-header)]",
  rowMeta: "text-[11px] font-medium text-[var(--graphite-muted)]",
  rowInline: "flex min-w-0 flex-1 items-center gap-2 overflow-hidden",
  lockBadge:
    "ml-auto shrink-0 rounded-md border border-[var(--mobile-app-card-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]",
} as const;
