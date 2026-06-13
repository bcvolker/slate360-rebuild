/** Graphite Glass tokens for the mobile project creation wizard. */

export const projectCreateTokens = {
  page:
    "flex min-h-0 flex-1 flex-col bg-[var(--graphite-canvas)] text-[var(--graphite-text-body)]",
  scrollBody: "min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-28 pt-4",
  sectionLabel:
    "font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--graphite-muted)]",
  glassCard:
    "rounded-2xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_76%,transparent)] p-4 backdrop-blur-md",
  fieldInput:
    "w-full bg-transparent text-[var(--graphite-text-body)] placeholder:text-[var(--graphite-muted)] outline-none",
  fieldTitle: "text-xl font-semibold text-[var(--graphite-text-header)]",
  fieldBody: "text-sm",
  primaryButton:
    "w-full rounded-2xl bg-[var(--mobile-field-primary-bg)] py-3.5 font-medium text-[var(--mobile-field-primary-fg)] transition active:brightness-[0.92] disabled:opacity-40",
  primaryButtonLg:
    "w-full rounded-2xl bg-[var(--mobile-field-primary-bg)] py-4 text-lg font-semibold text-[var(--mobile-field-primary-fg)] transition active:brightness-[0.92] disabled:opacity-60",
  inviteChip:
    "flex items-center gap-1 rounded-full bg-white/10 px-3 py-1 text-xs text-[var(--graphite-text-body)]",
  errorBanner:
    "rounded-xl border border-red-500/30 bg-red-950/30 px-4 py-2.5 text-sm text-red-400",
} as const;
