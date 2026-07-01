/** Graphite Glass tokens for desktop dashboard shell — CSS vars only. */

// Match the app-home shells: glass surface + real depth (shadow) so cards read as
// professional panels, not flat AI-generated boxes.
const glassSurface =
  "border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_76%,transparent)] backdrop-blur-md shadow-[var(--mobile-app-card-shadow)]";

export const dashboardDesktopTokens = {
  canvas: "bg-[var(--graphite-canvas)] text-[var(--graphite-text-body)]",
  sidebar:
    "flex h-[100dvh] w-52 shrink-0 flex-col border-r border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_92%,transparent)]",
  /** Sidebar geometry without a fixed width (width applied by the caller for collapse). */
  sidebarBase:
    "flex h-[100dvh] shrink-0 flex-col border-r border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_92%,transparent)] transition-[width] duration-200",
  sidebarNavLabel:
    "mb-1 px-2 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--graphite-muted)]",
  // Nav chrome interactive states key off --app-accent (unified shell): pixel-identical on
  // green/dashboard routes (--app-accent defaults to --graphite-primary), blue on Twin routes.
  navLink:
    "group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors text-[var(--graphite-muted)] hover:bg-[color-mix(in_srgb,var(--app-accent)_8%,transparent)] hover:text-[var(--graphite-text-header)]",
  navLinkActive:
    "bg-[color-mix(in_srgb,var(--app-accent)_12%,transparent)] text-[var(--graphite-text-header)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--app-accent)_24%,transparent)]",
  navIcon:
    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--graphite-muted)] transition-colors group-hover:text-[var(--app-accent)]",
  navIconActive: "bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent)]",
  main: "flex h-[100dvh] min-h-0 min-w-0 flex-1 flex-col",
  topBar:
    "flex h-12 shrink-0 items-center justify-between border-b border-[var(--mobile-app-card-border)] px-5",
  content: "min-h-0 flex-1 overflow-y-auto p-4 lg:p-6",
  pageTitle: "text-lg font-bold tracking-tight text-[var(--graphite-text-header)]",
  pageSubtitle: "mt-0.5 text-xs text-[var(--graphite-muted)]",
  sectionLabel:
    "font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--graphite-muted)]",
  card: `rounded-2xl ${glassSurface}`,
  /** Clickable card — hover uses the ACTIVE surface accent (not hardcoded green) + subtle tint,
   *  no glow (glow is banned by the design system). */
  cardInteractive: `rounded-2xl ${glassSurface} transition-colors hover:border-[color-mix(in_srgb,var(--app-accent)_42%,transparent)] hover:bg-[color-mix(in_srgb,var(--app-accent)_6%,transparent)]`,
  statCard: `rounded-xl px-4 py-3 ${glassSurface}`,
  statValue: "text-2xl font-bold tabular-nums text-[var(--graphite-text-header)]",
  statLabel: "mt-0.5 text-xs font-medium text-[var(--graphite-muted)]",
  listRow:
    "flex items-center justify-between gap-3 rounded-xl border border-[var(--mobile-app-card-border)] px-4 py-3 shadow-[var(--mobile-app-card-shadow)] transition-colors hover:border-[color-mix(in_srgb,var(--app-accent)_42%,transparent)] hover:bg-[color-mix(in_srgb,var(--app-accent)_6%,transparent)]",
  emptyState: `rounded-2xl px-6 py-10 text-center ${glassSurface}`,
} as const;
