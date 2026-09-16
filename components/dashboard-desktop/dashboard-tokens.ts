/**
 * Light-system tokens for the desktop dashboard shell (aligned to the homepage's
 * --mkt-* palette, docs/design/DASHBOARD_PORTAL_DESIGN_ALIGNMENT.md, confirmed
 * 2026-09-15). Neutrals (canvas/surface/ink/line) are the shared --mkt-* set;
 * --app-accent itself is untouched so the existing unified-shell green/blue
 * switch (Twin routes → --twin360-blue) keeps working unchanged — only the
 * surface it sits on changed from dark Graphite to light.
 */
const lightSurface = "border border-[var(--mkt-line)] bg-[var(--mkt-surface)] shadow-[0_1px_2px_rgba(15,23,42,0.04)]";

export const dashboardDesktopTokens = {
  canvas: "bg-[var(--mkt-canvas)] text-[var(--mkt-ink)]",
  sidebar:
    "flex h-[100dvh] w-52 shrink-0 flex-col border-r border-[var(--mkt-line)] bg-[var(--mkt-surface)]",
  /** Sidebar geometry without a fixed width (width applied by the caller for collapse). */
  sidebarBase:
    "flex h-[100dvh] shrink-0 flex-col border-r border-[var(--mkt-line)] bg-[var(--mkt-surface)] transition-[width] duration-200",
  sidebarNavLabel:
    "mb-1 px-2 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--mkt-ink-muted)]",
  // Nav chrome interactive states key off --app-accent (unified shell): green on
  // dashboard/Site Walk routes, blue on Twin routes — never rendered as direct text
  // color here (only tints/icon/ring), so it stays contrast-safe on the light canvas.
  navLink:
    "group flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] font-medium transition-colors text-[var(--mkt-ink-muted)] hover:bg-[color-mix(in_srgb,var(--app-accent)_8%,transparent)] hover:text-[var(--mkt-ink)]",
  navLinkActive:
    "bg-[color-mix(in_srgb,var(--app-accent)_12%,transparent)] text-[var(--mkt-ink)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--app-accent)_24%,transparent)]",
  navIcon:
    "flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[var(--mkt-ink-muted)] transition-colors group-hover:text-[var(--app-accent)]",
  navIconActive: "bg-[color-mix(in_srgb,var(--app-accent)_16%,transparent)] text-[var(--app-accent)]",
  main: "flex h-[100dvh] min-h-0 min-w-0 flex-1 flex-col",
  topBar:
    "flex h-12 shrink-0 items-center justify-between border-b border-[var(--mkt-line)] px-5",
  content: "min-h-0 flex-1 overflow-y-auto p-4 lg:p-6",
  pageTitle: "text-lg font-bold tracking-tight text-[var(--mkt-ink)]",
  pageSubtitle: "mt-0.5 text-xs text-[var(--mkt-ink-muted)]",
  sectionLabel:
    "font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--mkt-ink-muted)]",
  card: `rounded-2xl ${lightSurface}`,
  /** Clickable card — hover uses the ACTIVE surface accent (not hardcoded green) + subtle tint,
   *  no glow (glow is banned by the design system). */
  cardInteractive: `rounded-2xl ${lightSurface} transition-colors hover:border-[color-mix(in_srgb,var(--app-accent)_42%,transparent)] hover:bg-[color-mix(in_srgb,var(--app-accent)_5%,transparent)]`,
  statCard: `rounded-xl px-4 py-3 ${lightSurface}`,
  statValue: "text-2xl font-bold tabular-nums text-[var(--mkt-ink)]",
  statLabel: "mt-0.5 text-xs font-medium text-[var(--mkt-ink-muted)]",
  listRow:
    "flex items-center justify-between gap-3 rounded-xl border border-[var(--mkt-line)] bg-[var(--mkt-surface)] px-4 py-3 transition-colors hover:border-[color-mix(in_srgb,var(--app-accent)_42%,transparent)] hover:bg-[color-mix(in_srgb,var(--app-accent)_5%,transparent)]",
  emptyState: "rounded-2xl border-2 border-dashed border-[var(--mkt-line)] bg-[var(--mkt-canvas-alt)] px-6 py-10 text-center",
} as const;
