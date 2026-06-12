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

  launcherTileBase:
    "flex h-[116px] w-full min-w-0 items-center gap-3 rounded-[13px] border px-3.5 text-left transition-colors active:scale-[0.99]",
  launcherTilePrimary:
    "border-[#1E4A3A] bg-[#11161E] hover:border-[color-mix(in_srgb,#00E699_35%,#1E4A3A)] hover:bg-[color-mix(in_srgb,#00E699_4%,#11161E)]",
  launcherTileInfo:
    "border-[#1E3A5F] bg-[#11161E] hover:border-[color-mix(in_srgb,#3D8EFF_35%,#1E3A5F)] hover:bg-[color-mix(in_srgb,#3D8EFF_4%,#11161E)]",
  launcherTileLocked: "opacity-55 saturate-[0.42]",

  launcherIconChipPrimary:
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,#00E699_45%,transparent)] bg-[color-mix(in_srgb,#00E699_12%,#11161E)]",
  launcherIconChipInfo:
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[color-mix(in_srgb,#3D8EFF_45%,transparent)] bg-[color-mix(in_srgb,#3D8EFF_12%,#11161E)]",
  launcherIconPrimary: "h-5 w-5 shrink-0 text-[#00E699]",
  launcherIconInfo: "h-5 w-5 shrink-0 text-[#3D8EFF]",

  launcherTitle: "truncate text-sm font-medium leading-tight text-white",
  launcherStatusPrimary:
    "truncate text-[11px] font-normal leading-tight text-[color-mix(in_srgb,#00E699_78%,#8B97A6)]",
  launcherStatusInfo:
    "truncate text-[11px] font-normal leading-tight text-[color-mix(in_srgb,#3D8EFF_78%,#8B97A6)]",
  launcherChevronPrimary: "h-4 w-4 shrink-0 text-[#00E699]",
  launcherChevronInfo: "h-4 w-4 shrink-0 text-[#3D8EFF]",
  launcherLockBadge:
    "pointer-events-none absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-lg border border-[#2A3340] bg-[#0B0F15]/80 text-[#8B97A6]",

  quickActionGrid: "grid shrink-0 grid-cols-3 gap-2",
  quickActionCard:
    "flex h-16 flex-col items-start justify-center gap-0.5 rounded-xl border border-[#2A3340] bg-[#11161E] px-2.5 py-2 text-left transition-colors hover:border-[color-mix(in_srgb,white_18%,#2A3340)] hover:bg-[color-mix(in_srgb,white_4%,#11161E)] active:scale-[0.99]",
  quickActionIcon: "h-4 w-4 shrink-0 text-[#C9D3DF]",
  quickActionLabel: "text-xs font-medium leading-tight text-[#F8FAFC]",

  slateDropCard:
    "flex w-full shrink-0 flex-col gap-3 rounded-[13px] border border-[color-mix(in_srgb,white_22%,transparent)] bg-[color-mix(in_srgb,white_4%,#11161E)] p-3",
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
