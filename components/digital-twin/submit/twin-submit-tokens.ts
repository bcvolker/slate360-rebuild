export const TWIN_SUBMIT_STEPS = [
  { id: "clips", label: "Review clips" },
  { id: "sources", label: "Supporting data" },
  { id: "quality", label: "Quality & credits" },
  { id: "confirm", label: "Confirm" },
  { id: "status", label: "Processing" },
] as const;

export type TwinSubmitStepId = (typeof TWIN_SUBMIT_STEPS)[number]["id"];

export const twinSubmitTokens = {
  glassCard:
    "rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_72%,transparent)] backdrop-blur-md",
  glassCardInner: "p-3",
  sectionLabel: "text-xs font-semibold uppercase tracking-wide text-[var(--graphite-muted)]",
  bodyText: "text-sm text-[var(--graphite-text-body)]",
  headerText: "text-sm font-semibold text-[var(--graphite-text-header)]",
  badgeChip:
    "inline-flex items-center rounded-md border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_12%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--twin360-blue)]",
  primaryCta:
    "flex min-h-12 w-full items-center justify-center rounded-xl bg-[var(--twin360-blue)] text-sm font-bold text-[var(--graphite-canvas)] transition active:scale-[0.98] disabled:opacity-50",
  secondaryCta:
    "flex min-h-11 w-full items-center justify-center rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)] text-sm font-semibold text-[var(--graphite-text-body)] transition active:scale-[0.98]",
} as const;
