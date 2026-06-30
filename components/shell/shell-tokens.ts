/**
 * Unified-shell token strings (Graphite Glass) — the ONE grammar all three app shells
 * (Dashboard · Site Walk · Twin 360) share. Accent is `var(--app-accent)` (flipped per
 * surface via `data-app`); used on interactive states ONLY, never fills. CSS vars only;
 * no hardcoded hex, no amber, no glow, no rounded-full. See docs/design/SLATE360_UNIFIED_SHELL.md.
 *
 * Designed to FIX the existing shells' problems: a compact, grouped top bar (not crowded),
 * strong app-name branding, and a center that FILLS the viewport (no large blank voids —
 * the context pane collapses to 0 when nothing is selected).
 */

const glass =
  "border border-white/10 bg-white/[0.04] backdrop-blur-md";

export const shellTokens = {
  root: "flex min-h-[100dvh] bg-[var(--graphite-canvas)] text-[var(--graphite-text-body)]",

  // ── Top bar: compact 52px, three groups (brand · switcher · actions) ──
  topBar:
    "flex h-[52px] shrink-0 items-center gap-3 border-b border-white/10 px-4",
  // App-name branding: strong mono wordmark + a thin accent tick (hierarchy, not clutter).
  brandWordmark:
    "font-mono text-[13px] font-bold uppercase tracking-[0.16em] text-[var(--graphite-text-header)]",
  brandTick: "h-3.5 w-[3px] rounded-[2px] bg-[var(--app-accent)]",
  topBarSpacer: "flex-1 min-w-0",

  // ── Left rail: 220px, shared nav + app section ──
  rail:
    "hidden lg:flex w-56 shrink-0 flex-col gap-1 border-r border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_92%,transparent)] p-3",
  railGroupLabel:
    "mb-1 mt-3 px-2 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-[var(--graphite-muted)]",
  navItem:
    "group flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13px] font-medium text-[var(--graphite-muted)] transition-colors hover:bg-white/[0.04] hover:text-[var(--graphite-text-header)]",
  navItemActive:
    "border-l-2 border-[var(--app-accent)] bg-white/[0.04] pl-[calc(0.625rem-2px)] text-[var(--graphite-text-header)]",

  // ── Center workspace: FLUID, fills width (no max-width column floating in a void) ──
  workspace: "min-h-0 min-w-0 flex-1 overflow-y-auto",
  workspacePad: "p-4 lg:p-6",

  // ── Right context pane: 320px, collapses to 0 (center reclaims the space) ──
  contextPane:
    "hidden xl:flex w-80 shrink-0 flex-col border-l border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_92%,transparent)] overflow-y-auto",

  // ── Shared surfaces ──
  glass: `rounded-xl ${glass}`,
  monoLabel:
    "font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--graphite-muted)]",
  // Primary button: accent border/text (desktop), never a solid accent fill.
  primaryBtn:
    "inline-flex min-h-9 items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--app-accent)_40%,transparent)] bg-transparent px-3.5 text-sm font-semibold text-[var(--app-accent)] transition-colors hover:bg-[color-mix(in_srgb,var(--app-accent)_10%,transparent)]",
  commandTrigger:
    "flex h-9 items-center gap-2 rounded-lg border border-white/10 bg-white/[0.04] px-3 text-[13px] text-[var(--graphite-muted)] transition-colors hover:border-[color-mix(in_srgb,var(--app-accent)_30%,transparent)] hover:text-[var(--graphite-text-body)]",
} as const;

export type ShellApp = "dashboard" | "site-walk" | "twin360";
