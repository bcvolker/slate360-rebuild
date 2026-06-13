const glassSurface =
  "border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_76%,transparent)] backdrop-blur-md";

export const projectDetailTokens = {
  page: "mx-auto w-full max-w-6xl",
  header:
    "sticky top-0 z-20 -mx-4 border-b border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_94%,transparent)] px-4 py-3 backdrop-blur-md lg:-mx-0 lg:px-0",
  backLink:
    "inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-[var(--graphite-muted)] transition-colors hover:text-[var(--graphite-text-header)]",
  projectTitle: "truncate text-xl font-bold text-[var(--graphite-text-header)] lg:text-2xl",
  locationRow:
    "mt-1 flex items-start gap-1.5 text-sm text-[var(--graphite-muted)]",
  statusPillBase: "inline-flex items-center rounded-lg px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
  statusPillActive:
    "bg-[color-mix(in_srgb,var(--graphite-primary)_14%,transparent)] text-[var(--graphite-primary)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--graphite-primary)_28%,transparent)]",
  statusPillHold:
    "bg-[color-mix(in_srgb,var(--graphite-muted)_12%,transparent)] text-[var(--graphite-muted)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--graphite-muted)_24%,transparent)]",
  statusPillDone:
    "bg-[color-mix(in_srgb,var(--graphite-primary)_8%,transparent)] text-[var(--graphite-text-body)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--graphite-muted)_20%,transparent)]",
  tabRail:
    "mt-3 flex gap-1 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  tabLink:
    "inline-flex min-h-10 shrink-0 items-center rounded-xl px-4 text-sm font-semibold text-[var(--graphite-muted)] transition-colors hover:bg-[color-mix(in_srgb,var(--graphite-primary)_8%,transparent)] hover:text-[var(--graphite-text-header)]",
  tabLinkActive:
    "bg-[color-mix(in_srgb,var(--graphite-primary)_12%,transparent)] text-[var(--graphite-text-header)] ring-1 ring-inset ring-[color-mix(in_srgb,var(--graphite-primary)_24%,transparent)]",
  content: "py-5 lg:py-6",
  sectionCard: `rounded-2xl p-5 ${glassSurface}`,
  eyebrow:
    "font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--graphite-muted)]",
  statGrid: "grid grid-cols-2 gap-3 lg:grid-cols-4",
  statCard: `rounded-xl px-4 py-3 ${glassSurface} transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_24%,transparent)]`,
  statValue: "text-2xl font-bold tabular-nums text-[var(--graphite-text-header)]",
  statLabel: "mt-0.5 text-xs font-medium text-[var(--graphite-muted)]",
  statLink: "mt-2 inline-flex text-xs font-semibold text-[var(--graphite-primary)] hover:underline",
  activityRow:
    "flex items-center justify-between gap-3 rounded-xl border border-transparent px-3 py-3 transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_18%,transparent)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_6%,transparent)]",
  primaryButton:
    "inline-flex min-h-11 items-center justify-center rounded-xl bg-[var(--graphite-primary)] px-4 text-sm font-semibold text-[var(--graphite-canvas)] transition-opacity hover:opacity-90",
  secondaryButton:
    "inline-flex min-h-11 items-center justify-center rounded-xl border border-[var(--mobile-app-card-border)] px-4 text-sm font-semibold text-[var(--graphite-text-body)] transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_28%,transparent)]",
  disabledButton:
    "inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_88%,transparent)] px-4 text-sm font-semibold text-[var(--graphite-muted)] opacity-70",
  metaGrid: "mt-4 grid gap-3 sm:grid-cols-2",
  metaCell: `rounded-xl p-3 ${glassSurface}`,
} as const;

export function resolveStatusPillClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized.includes("hold") || normalized.includes("pause")) {
    return projectDetailTokens.statusPillHold;
  }
  if (normalized.includes("complete") || normalized.includes("closed")) {
    return projectDetailTokens.statusPillDone;
  }
  return projectDetailTokens.statusPillActive;
}
