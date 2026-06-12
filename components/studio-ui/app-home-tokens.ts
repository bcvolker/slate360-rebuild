/**
 * Scoped design tokens for /app home content (S2 shell slice).
 * Neutral section chrome + app-accent launcher tiles — no glow.
 */

export const appHomeTokens = {
  scrollInner:
    "mx-auto flex min-h-full w-full max-w-2xl flex-1 flex-col gap-4 px-3 pt-3 pb-3",
  section: "shrink-0",
  sectionHeader: "mb-2 px-0.5",
  sectionLabel:
    "font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-[#8B97A6]",

  launcherStack: "flex w-full shrink-0 flex-col gap-2",
  launcherPairRow: "grid w-full shrink-0 grid-cols-2 gap-2",
  launcherQuadGrid: "grid w-full shrink-0 grid-cols-2 gap-2",
  launcherRail:
    "flex gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  launcherRailTile: "min-w-[calc(100%-2rem)] max-w-[280px] shrink-0",

  /* Launcher tiles share the hub hero-card anatomy so all shells are one template */
  launcherTileBase:
    "flex min-h-[104px] w-full min-w-0 flex-row items-center gap-3.5 rounded-2xl border px-4 py-3.5 text-left backdrop-blur-md transition-all active:scale-[0.99]",
  launcherTilePrimary:
    "border-[color-mix(in_srgb,white_20%,transparent)] bg-[color-mix(in_srgb,white_7%,#27272A)] hover:border-[color-mix(in_srgb,white_30%,transparent)] hover:bg-[color-mix(in_srgb,white_10%,#27272A)]",
  launcherTileInfo:
    "border-[color-mix(in_srgb,white_20%,transparent)] bg-[color-mix(in_srgb,white_7%,#27272A)] hover:border-[color-mix(in_srgb,white_30%,transparent)] hover:bg-[color-mix(in_srgb,white_10%,#27272A)]",
  launcherTileLocked: "opacity-55 saturate-[0.42]",

  launcherIconChipPrimary:
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#00E699] text-[#0B0F15]",
  launcherIconChipInfo:
    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#3D8EFF] text-[#0B0F15]",
  launcherIconPrimary: "h-6 w-6 shrink-0",
  launcherIconInfo: "h-6 w-6 shrink-0",

  launcherTitle: "truncate text-lg font-bold leading-tight text-white",
  launcherStatusPrimary:
    "truncate text-xs font-medium leading-snug text-zinc-400",
  launcherStatusInfo:
    "truncate text-xs font-medium leading-snug text-zinc-400",
  launcherChevronPrimary: "h-5 w-5 shrink-0 text-zinc-500",
  launcherChevronInfo: "h-5 w-5 shrink-0 text-zinc-500",
  launcherLockBadge:
    "pointer-events-none absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-lg border border-[#2A3340] bg-[#0B0F15]/80 text-[#8B97A6]",

  /* Quick actions share the hub card anatomy (2x2 grid, icon chip, white label) */
  quickActionGrid: "grid shrink-0 grid-cols-2 gap-2 auto-rows-fr",
  quickActionCard:
    "flex min-h-[64px] flex-col items-start justify-center gap-0.5 rounded-xl border border-[color-mix(in_srgb,white_18%,transparent)] bg-[color-mix(in_srgb,white_5%,#27272A)] px-2.5 py-2 text-left transition-all hover:border-[color-mix(in_srgb,white_28%,transparent)] hover:bg-[color-mix(in_srgb,white_8%,#27272A)] active:scale-[0.99]",
  quickActionIconWrapper:
    "mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[color-mix(in_srgb,white_14%,transparent)] bg-[color-mix(in_srgb,white_8%,transparent)]",
  quickActionIcon: "h-5 w-5 shrink-0 text-[#C9D3DF]",
  quickActionLabel: "text-sm font-bold leading-tight text-[#F4F6F8]",

  slateDropCard:
    "flex w-full shrink-0 flex-col gap-3 rounded-[13px] border-2 border-[color-mix(in_srgb,white_26%,transparent)] bg-[color-mix(in_srgb,white_5%,#11161E)] p-3",
  slateDropRow: "flex items-center gap-3",
  slateDropRingWrap: "relative flex h-12 w-12 shrink-0 items-center justify-center",
  slateDropStats: "min-w-0 flex-1",
  slateDropUsage: "text-sm font-medium leading-tight text-white",
  slateDropMeta: "mt-0.5 text-[11px] font-normal text-[#8B97A6]",
  slateDropOpenPill:
    "inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-[#2A3340] bg-[color-mix(in_srgb,white_6%,#11161E)] px-3 text-xs font-medium text-[#F8FAFC] transition-colors hover:border-[color-mix(in_srgb,white_20%,#2A3340)] hover:bg-[color-mix(in_srgb,white_10%,#11161E)]",
  slateDropFolderRow: "flex flex-wrap gap-1.5",
  slateDropFolderChip:
    "inline-flex max-w-full items-center truncate rounded-lg border border-[#2A3340] bg-[color-mix(in_srgb,white_4%,#11161E)] px-2.5 py-1.5 text-[11px] font-medium text-[#C9D3DF] transition-colors hover:border-[color-mix(in_srgb,white_18%,#2A3340)] hover:text-white",
} as const;
