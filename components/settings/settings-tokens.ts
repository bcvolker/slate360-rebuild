/** Graphite Glass tokens for authenticated account / settings surfaces. */

const glassSurface =
  "rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_76%,transparent)] backdrop-blur-md";

export const settingsTokens = {
  pageScroll:
    "mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 pt-3 pb-28 lg:max-w-6xl lg:gap-4 lg:pb-8",
  desktopGrid: "flex flex-col gap-3 lg:grid lg:grid-cols-[minmax(200px,0.3fr)_1fr] lg:items-start lg:gap-4",
  navCard: `${glassSurface} p-2 lg:sticky lg:top-4`,
  navButton:
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition-colors",
  navButtonActive:
    "border border-[var(--mobile-shell-accent-border)] bg-[color-mix(in_srgb,var(--mobile-shell-accent)_10%,var(--graphite-canvas))] text-[var(--mobile-shell-accent)]",
  navButtonIdle:
    "text-[var(--graphite-text-body)] hover:bg-[color-mix(in_srgb,white_6%,transparent)] hover:text-[var(--graphite-text-header)]",
  panelCard: `${glassSurface} p-4 lg:p-6`,
  eyebrow:
    "font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--graphite-muted)]",
  title: "text-xl font-bold tracking-tight text-[var(--graphite-text-header)] lg:text-2xl",
  subtitle: "mt-1 text-sm font-medium leading-6 text-[var(--graphite-muted)]",
  sectionLabel:
    "mb-1 block text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--graphite-muted)]",
  fieldInput:
    "h-11 w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] px-3 text-sm font-medium text-[var(--graphite-text-body)] outline-none placeholder:text-[var(--graphite-muted)] focus:border-[var(--accent-border-green)] disabled:cursor-not-allowed disabled:opacity-60",
  selectField:
    "h-11 w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] px-3 text-sm font-medium text-[var(--graphite-text-body)] outline-none focus:border-[var(--accent-border-green)] disabled:opacity-50",
  textareaField:
    "min-h-24 w-full resize-y rounded-xl border border-[var(--mobile-app-card-border)] bg-[var(--surface-zinc)] px-3 py-2.5 text-sm font-medium text-[var(--graphite-text-body)] outline-none placeholder:text-[var(--graphite-muted)] focus:border-[var(--accent-border-green)]",
  primaryButton:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--accent-border-green)] bg-[var(--graphite-primary)] px-5 text-sm font-bold text-[var(--graphite-canvas)] transition active:scale-[0.99] disabled:opacity-50",
  ghostButton:
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--surface-zinc)_80%,transparent)] px-5 text-sm font-semibold text-[var(--graphite-text-body)] transition active:scale-[0.99] disabled:opacity-50",
  iconChip:
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[var(--mobile-shell-accent-border)] bg-[color-mix(in_srgb,var(--mobile-shell-accent)_12%,var(--graphite-canvas))] text-[var(--mobile-shell-accent)]",
  metricTile:
    "min-w-0 rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,white_4%,var(--surface-zinc))] px-3 py-2",
  metricLabel:
    "text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--graphite-muted)]",
  metricValue: "mt-1 truncate text-xs font-medium text-[var(--graphite-text-body)]",
  statusOk: "text-sm font-semibold text-emerald-400",
  statusError: "text-sm font-semibold text-red-400",
  divider: "border-t border-[var(--mobile-app-card-border)]",
  avatarFrame:
    "relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[var(--graphite-primary)] bg-[color-mix(in_srgb,white_6%,var(--surface-zinc))] text-2xl font-bold text-[var(--graphite-text-header)] shadow-[0_0_0_4px_color-mix(in_srgb,var(--graphite-primary)_18%,transparent)]",
  destructiveCard:
    "rounded-xl border border-red-500/25 bg-[color-mix(in_srgb,red_8%,var(--graphite-canvas))] p-4 lg:p-5",
  toggleRow:
    "flex items-center justify-between gap-3 rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,white_4%,var(--surface-zinc))] px-3 py-3",
  skeletonBlock: "animate-pulse rounded-xl bg-[color-mix(in_srgb,white_8%,var(--surface-zinc))]",
  choiceGroup:
    "flex flex-wrap gap-2 rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--surface-zinc)_88%,transparent)] p-1",
  choiceButton:
    "inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm font-semibold transition-colors",
  choiceButtonActive:
    "bg-[color-mix(in_srgb,var(--mobile-shell-accent)_14%,var(--graphite-canvas))] text-[var(--mobile-shell-accent)]",
  choiceButtonIdle:
    "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-body)]",
} as const;
