/** Shared Graphite Glass tokens for the capture-v2 Note / Review data entry slice. */

export const NOTE_REVIEW_MARGIN_PX = 12;

export const noteReviewTokens = {
  canvas: "bg-[var(--graphite-canvas)] text-[var(--graphite-text-body)]",
  margin: "px-3",
  glassBar:
    "border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] backdrop-blur-md",
  glassBarRadius: "rounded-xl",
  monoGreenLabel:
    "truncate font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--graphite-primary)]",
  sectionLabel:
    "text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--graphite-muted)]",
  sectionCard:
    "rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--surface-zinc)_55%,transparent)] p-3",
  fieldLabel:
    "mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--graphite-muted)]",
  cardSurface:
    "rounded-xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)]",
  fieldInput:
    "w-full resize-none rounded-xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] px-3 py-3 text-base leading-6 text-[var(--graphite-text-body)] outline-none placeholder:text-[var(--graphite-muted)] focus:border-[var(--accent-border-green)]",
  selectField:
    "h-10 w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] px-3 text-sm font-medium text-[var(--graphite-text-body)] outline-none focus:border-[var(--accent-border-green)] disabled:opacity-50",
  ghostButton:
    "inline-flex min-h-11 flex-1 items-center justify-center rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--surface-zinc)_80%,transparent)] px-4 text-sm font-semibold text-[var(--graphite-text-body)] transition active:scale-[0.99] disabled:opacity-50",
  primaryButton:
    "inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--accent-border-green)] bg-[var(--graphite-primary)] px-4 text-sm font-bold text-[var(--graphite-canvas)] transition active:scale-[0.99] disabled:opacity-50",
  aiBoostChip:
    "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_12%,var(--surface-zinc))] px-3 text-xs font-semibold text-[color-mix(in_srgb,var(--twin360-blue)_88%,white)] disabled:opacity-50",
  micButton:
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--surface-zinc)_90%,transparent)] text-[var(--graphite-text-body)] disabled:opacity-50",
  tagChip:
    "inline-flex items-center gap-1 rounded-lg border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--surface-zinc)_88%,transparent)] px-2.5 py-1 text-xs font-medium text-[var(--graphite-text-body)]",
  tagAddChip:
    "inline-flex items-center rounded-lg border border-dashed border-[var(--mobile-app-card-border)] px-2.5 py-1 text-xs font-semibold text-[var(--graphite-muted)]",
  criticalPriority:
    "border-red-500/40 bg-red-500/10 text-red-300 focus:border-red-400",
  pinnedBar:
    "absolute inset-x-0 z-10 border-t border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_94%,transparent)] backdrop-blur-xl",
} as const;
