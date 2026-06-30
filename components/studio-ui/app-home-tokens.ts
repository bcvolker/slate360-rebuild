/**
 * Canonical home shell tokens — geometry + Graphite Matrix surfaces.
 * Colors reference CSS vars scoped by [data-mobile-route] on MobileShell.
 * Geometry (sizes, gaps, min-heights) must stay identical across all app homes.
 */

const glassSurface =
  "bg-[color-mix(in_srgb,var(--graphite-canvas)_76%,transparent)] backdrop-blur-md";
const glassSurfaceHover =
  "hover:bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)]";

export const appHomeTokens = {
  // No min-h-full/flex-1: every section is shrink-0, so forcing the column to viewport height
  // pooled leftover space into a bottom void (the "massive gap"). Content-sized + px-4 to match
  // the dock/header (was px-3 → 4px misalignment). See docs/CAPTURE_AND_SHELL_BLOCKERS_LOG.md.
  scrollInner: "mx-auto flex w-full max-w-2xl flex-col gap-3 px-4 pt-3 pb-3",
  section: "shrink-0",
  sectionHeader: "mb-2 px-0.5",
  sectionLabel:
    "font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--graphite-muted)]",

  launcherStack: "flex w-full shrink-0 flex-col gap-2",
  launcherPairRow: "grid w-full shrink-0 grid-cols-2 gap-2",
  launcherQuadGrid: "grid w-full shrink-0 grid-cols-2 gap-2",
  launcherRail:
    "flex gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  launcherRailTile: "min-w-[calc(100%-2rem)] max-w-[280px] shrink-0",

  launcherTileBase: `flex min-h-[104px] w-full min-w-0 flex-row items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left shadow-[var(--mobile-app-card-shadow)] transition-all active:scale-[0.99] ${glassSurface}`,
  launcherTilePrimary: `border-[var(--mobile-app-card-border-primary)] ${glassSurfaceHover} hover:border-[color-mix(in_srgb,var(--graphite-primary)_42%,transparent)] hover:[box-shadow:var(--mobile-app-card-glow-primary)]`,
  launcherTileInfo: `border-[var(--mobile-app-card-border-info)] ${glassSurfaceHover} hover:border-[color-mix(in_srgb,var(--twin360-blue)_42%,transparent)] hover:[box-shadow:var(--mobile-app-card-glow-info)]`,
  launcherTileLocked: "opacity-55 saturate-[0.42]",

  launcherIconChipPrimary:
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--graphite-primary)] text-[var(--graphite-canvas)]",
  launcherIconChipInfo:
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--twin360-blue)] text-[var(--graphite-canvas)]",
  launcherIconPrimary: "h-6 w-6 shrink-0",
  launcherIconInfo: "h-6 w-6 shrink-0",

  launcherTitle: "truncate text-lg font-bold leading-tight text-[var(--graphite-text-header)]",
  launcherStatusPrimary:
    "truncate text-xs font-medium leading-snug text-[var(--graphite-muted)]",
  launcherStatusInfo:
    "truncate text-xs font-medium leading-snug text-[var(--graphite-muted)]",
  launcherChevronPrimary: "h-5 w-5 shrink-0 text-[color-mix(in_srgb,var(--graphite-muted)_85%,transparent)]",
  launcherChevronInfo: "h-5 w-5 shrink-0 text-[color-mix(in_srgb,var(--graphite-muted)_85%,transparent)]",
  launcherLockBadge:
    "pointer-events-none absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-lg border border-[#2A3340] bg-[color-mix(in_srgb,var(--graphite-canvas)_88%,transparent)] text-[var(--graphite-muted)]",

  quickActionGrid: "grid shrink-0 grid-cols-2 gap-2 auto-rows-fr",
  quickActionCard: `flex min-h-[64px] flex-col items-start justify-center gap-0.5 rounded-xl border border-[var(--mobile-quick-action-border)] px-2.5 py-2 text-left shadow-[var(--mobile-quick-action-shadow)] transition-all active:scale-[0.99] ${glassSurface} ${glassSurfaceHover} hover:border-[var(--mobile-shell-accent-border)]`,
  quickActionIconWrapper:
    "mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--mobile-quick-action-icon-border)] bg-[var(--mobile-quick-action-icon-bg)]",
  quickActionIcon: "h-5 w-5 shrink-0 text-[var(--mobile-quick-action-fg)]",
  quickActionLabel:
    "text-sm font-bold leading-tight text-[var(--mobile-quick-action-title-fg)]",

  slateDropCard: `flex w-full shrink-0 flex-col gap-3 rounded-[13px] border-2 border-[var(--mobile-expandable-panel-border)] p-3 shadow-[var(--mobile-app-card-shadow)] ${glassSurface}`,
  slateDropRow: "flex items-center gap-3",
  slateDropRingWrap:
    "relative flex h-12 w-12 shrink-0 items-center justify-center text-[var(--mobile-shell-accent)]",
  slateDropStats: "min-w-0 flex-1",
  slateDropUsage:
    "text-sm font-semibold leading-tight text-[var(--graphite-text-header)]",
  slateDropMeta:
    "mt-0.5 text-xs font-normal leading-snug text-[var(--graphite-muted)]",
  slateDropOpenPill:
    "inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-[#2A3340] bg-[color-mix(in_srgb,var(--graphite-canvas)_82%,transparent)] px-3 text-xs font-semibold text-[var(--graphite-text-body)] transition-colors hover:border-[var(--mobile-shell-accent-border)] hover:bg-[color-mix(in_srgb,var(--mobile-shell-accent)_12%,var(--graphite-canvas))] hover:text-[var(--graphite-text-header)]",
  slateDropFolderRow: "flex flex-wrap gap-1.5",
  slateDropFolderChip:
    "inline-flex max-w-full items-center truncate rounded-lg border border-[#2A3340] bg-[color-mix(in_srgb,var(--graphite-canvas)_84%,transparent)] px-2.5 py-1.5 text-xs font-medium text-[var(--graphite-text-body)] transition-colors hover:border-[var(--mobile-shell-accent-border)] hover:text-[var(--graphite-text-header)]",
} as const;
