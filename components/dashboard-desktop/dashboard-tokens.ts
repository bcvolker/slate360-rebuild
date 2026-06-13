/** Graphite Glass tokens for desktop dashboard shell — CSS vars only. */

const glassSurface =
  "border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_76%,transparent)] backdrop-blur-md";

export const dashboardDesktopTokens = {
  canvas: "bg-[var(--graphite-canvas)] text-[var(--graphite-text-body)]",
  sidebar:
    "flex h-[100dvh] w-64 shrink-0 flex-col border-r border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_92%,transparent)]",
  sidebarNavLabel:
    "mb-1.5 px-2 font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--graphite-muted)]",
  navLink:
    "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors text-[var(--graphite-muted)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_8%,transparent)] hover:text-[var(--graphite-text-header)]",
  navLinkActive:
    "bg-[color-mix(in_srgb,var(--graphite-primary)_12%,transparent)] text-[var(--graphite-text-header)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--graphite-primary)_24%,transparent)]",
  navIcon:
    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--graphite-muted)] transition-colors group-hover:text-[var(--graphite-primary)]",
  navIconActive: "bg-[color-mix(in_srgb,var(--graphite-primary)_16%,transparent)] text-[var(--graphite-primary)]",
  main: "flex min-h-[100dvh] min-w-0 flex-1 flex-col",
  topBar:
    "flex h-14 shrink-0 items-center justify-between border-b border-[var(--mobile-app-card-border)] px-6",
  content: "flex-1 overflow-y-auto p-6 lg:p-8",
  pageTitle: "text-2xl font-bold tracking-tight text-[var(--graphite-text-header)]",
  pageSubtitle: "mt-1 text-sm text-[var(--graphite-muted)]",
  sectionLabel:
    "font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--graphite-muted)]",
  card: `rounded-2xl ${glassSurface}`,
  statCard: `rounded-xl px-4 py-3 ${glassSurface}`,
  statValue: "text-2xl font-bold tabular-nums text-[var(--graphite-text-header)]",
  statLabel: "mt-0.5 text-xs font-medium text-[var(--graphite-muted)]",
  listRow:
    "flex items-center justify-between gap-3 rounded-xl border border-[var(--mobile-app-card-border)] px-4 py-3 transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_28%,transparent)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_6%,transparent)]",
  emptyState: `rounded-2xl px-6 py-10 text-center ${glassSurface}`,
} as const;
