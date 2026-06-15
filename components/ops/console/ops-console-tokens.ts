// Graphite-glass tokens for the Operations Console. Tokens-only (no hardcoded
// palette, no amber) so it stays aligned with the Slate360 app shell.

export const opsConsoleTokens = {
  page: "mx-auto flex h-full min-h-0 w-full max-w-6xl flex-col px-4 py-6 lg:px-0",
  header: "mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between",
  eyebrow:
    "font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--graphite-muted)]",
  title: "text-2xl font-bold text-[var(--graphite-text-header)]",
  subtitle: "text-sm text-[var(--graphite-muted)]",

  tabBar:
    "flex gap-1 overflow-x-auto border-b border-[var(--mobile-app-card-border)] pb-px",
  tab:
    "flex items-center gap-2 whitespace-nowrap border-b-2 border-transparent px-3.5 py-2.5 text-sm font-medium text-[var(--graphite-muted)] transition-colors hover:text-[var(--graphite-text-header)]",
  tabActive:
    "border-[var(--graphite-primary)] text-[var(--graphite-text-header)]",

  card:
    "rounded-2xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_76%,transparent)] p-5 backdrop-blur-md",
  statValue: "text-2xl font-semibold text-[var(--graphite-text-header)]",
  statLabel: "text-xs text-[var(--graphite-muted)]",

  primaryButton:
    "inline-flex min-h-10 items-center justify-center rounded-xl bg-[var(--graphite-primary)] px-4 text-sm font-semibold text-[var(--graphite-canvas)] transition-opacity hover:opacity-90 disabled:opacity-50",
  secondaryButton:
    "inline-flex min-h-10 items-center justify-center rounded-xl border border-[var(--mobile-app-card-border)] px-4 text-sm font-semibold text-[var(--graphite-text-body)] transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_28%,transparent)] disabled:opacity-50",

  input:
    "min-h-10 w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] px-3 text-sm text-[var(--graphite-text-header)] outline-none placeholder:text-[var(--graphite-muted)] focus:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)]",

  row:
    "flex items-center justify-between gap-3 rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] px-4 py-3",

  badgeInfo:
    "rounded-lg bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-primary)]",
  badgeMuted:
    "rounded-lg bg-[color-mix(in_srgb,var(--graphite-muted)_16%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--graphite-muted)]",
  badgeCritical:
    "rounded-lg bg-[color-mix(in_srgb,#ef4444_16%,transparent)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#fca5a5]",

  emptyNote: "text-sm text-[var(--graphite-muted)]",
} as const;

export type OpsConsoleTokens = typeof opsConsoleTokens;
