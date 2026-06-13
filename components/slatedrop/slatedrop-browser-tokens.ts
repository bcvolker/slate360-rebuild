const glassSurface =
  "border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_76%,transparent)] backdrop-blur-md";

export const slatedropBrowserTokens = {
  canvas: "bg-[var(--graphite-canvas)] text-[var(--graphite-text-body)]",
  sectionLabel:
    "font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--graphite-muted)]",
  searchInput:
    "w-full rounded-2xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_84%,transparent)] py-3 pl-11 pr-4 text-sm text-[var(--graphite-text-body)] outline-none placeholder:text-[var(--graphite-muted)] focus:border-[color-mix(in_srgb,var(--graphite-primary)_32%,transparent)]",
  searchInputDesktop:
    "w-80 rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_84%,transparent)] px-4 py-2 text-sm text-[var(--graphite-text-body)] outline-none placeholder:text-[var(--graphite-muted)] focus:border-[color-mix(in_srgb,var(--graphite-primary)_32%,transparent)]",
  glassCard: `rounded-2xl ${glassSurface}`,
  folderCard: `rounded-2xl p-4 ${glassSurface} flex items-center gap-3 transition-transform active:scale-[0.985] hover:border-[color-mix(in_srgb,var(--graphite-primary)_24%,transparent)]`,
  folderIconWell:
    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] text-[var(--graphite-primary)]",
  fileRow:
    "flex items-center gap-3 rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_6%,transparent)]",
  fileIconWell:
    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_88%,transparent)]",
  uploadFab:
    "fixed bottom-20 right-4 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--graphite-primary)] text-[var(--graphite-canvas)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-transform active:scale-95",
  uploadButtonDesktop:
    "inline-flex items-center gap-2 rounded-xl bg-[var(--graphite-primary)] px-4 py-2 text-sm font-semibold text-[var(--graphite-canvas)] transition-opacity hover:opacity-90",
  desktopSplit: "flex h-full min-h-[560px] overflow-hidden rounded-2xl border border-[var(--mobile-app-card-border)]",
  desktopSidebar:
    "flex w-64 shrink-0 flex-col overflow-y-auto border-r border-[var(--mobile-app-card-border)] p-4",
  desktopMain: "flex min-w-0 flex-1 flex-col overflow-hidden p-6",
  treeLink:
    "flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-[var(--graphite-text-body)] transition-colors hover:bg-[color-mix(in_srgb,var(--graphite-primary)_8%,transparent)]",
  treeLinkActive:
    "bg-[color-mix(in_srgb,var(--graphite-primary)_12%,transparent)] text-[var(--graphite-text-header)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--graphite-primary)_24%,transparent)]",
  tableHead: "border-b border-[var(--mobile-app-card-border)] text-xs text-[var(--graphite-muted)]",
  tableRow: "border-b border-[color-mix(in_srgb,var(--mobile-app-card-border)_60%,transparent)] last:border-0",
} as const;
