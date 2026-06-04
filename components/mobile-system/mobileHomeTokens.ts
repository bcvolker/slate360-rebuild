/**
 * mobileHomeTokens.ts — /app and /site-walk home fill, layout, and launcher tokens.
 *
 * Extracted from mobileTokens.ts to keep the core token barrel under 300 lines.
 * Values are unchanged — import via mobileTokens or mobileHomeTokens.
 */

/** Elevated app launcher card — primary destination (green accent glow) */
export const appHomeLauncherCardPrimaryBase =
  "flex min-h-[128px] flex-col items-start justify-center gap-1.5 rounded-2xl border bg-[var(--mobile-app-card-bg)] px-3.5 py-3.5 text-left backdrop-blur-md transition-all hover:bg-[color-mix(in_srgb,white_9%,transparent)] active:-translate-y-0.5";

/** Elevated app launcher card — info destination (blue-tinted fill) */
export const appHomeLauncherCardInfoBase =
  "flex min-h-[128px] flex-col items-start justify-center gap-1.5 rounded-2xl border bg-[var(--mobile-app-card-bg-info)] px-3.5 py-3.5 text-left backdrop-blur-md transition-all hover:bg-[color-mix(in_srgb,var(--twin360-blue)_12%,transparent)] active:-translate-y-0.5";

/** Shared quick-action card surface for /app home quick actions */
const mobileAppHomeQuickActionCardSurface =
  "rounded-xl border border-[var(--mobile-quick-action-border)] bg-[var(--mobile-quick-action-bg)] shadow-[var(--mobile-quick-action-shadow)] transition-all hover:border-[var(--accent-border-green)] hover:bg-[color-mix(in_srgb,var(--surface-zinc)_92%,white)] active:scale-[0.99]";

export const mobileHomeTokens = {
  mobileHomeContentGap: "gap-3",
  mobileHomeSectionGap: "gap-3",

  mobileHomeFillRegion: "flex min-h-0 flex-1 flex-col gap-3",
  mobileHomeSectionLabelAccentPrimary:
    "mb-1.5 block h-0.5 w-8 rounded-full bg-[color-mix(in_srgb,var(--graphite-primary)_35%,transparent)]",
  mobileHomeSectionLabelAccentInfo:
    "mb-1.5 block h-0.5 w-8 rounded-full bg-[color-mix(in_srgb,var(--twin360-blue)_35%,transparent)]",
  mobileHomeSectionTitle:
    "text-xs font-black uppercase tracking-[0.2em] text-zinc-100",
  mobileHomeHeroCard:
    "flex min-h-14 w-full flex-col justify-center gap-1 rounded-xl border border-[color-mix(in_srgb,var(--graphite-primary)_28%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_8%,transparent)] px-4 py-3 text-left transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] hover:bg-[color-mix(in_srgb,var(--graphite-primary)_12%,transparent)] active:scale-[0.99]",
  mobileHomeHeroTitle:
    "text-base font-bold text-[color-mix(in_srgb,var(--graphite-primary)_92%,white)]",
  mobileHomeHeroSubtext:
    "text-sm font-medium text-[color-mix(in_srgb,var(--graphite-primary)_58%,var(--graphite-muted))]",
  mobileHomeRailScroll:
    "flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  mobileHomeRailCard:
    "flex min-h-14 min-w-[148px] max-w-[196px] shrink-0 flex-col justify-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-left transition-colors hover:border-[color-mix(in_srgb,var(--twin360-blue)_30%,transparent)] hover:bg-white/[0.08] active:scale-[0.99]",
  mobileHomeRailCardTitle: "truncate text-sm font-semibold text-zinc-100",
  mobileHomeRailCardMeta: "truncate text-xs text-zinc-400",
  mobileHomeRowLink:
    "flex min-h-14 items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2 transition-colors hover:border-white/[0.14] hover:bg-white/[0.07] active:scale-[0.99]",
  mobileHomeRowTitle: "min-w-0 truncate text-sm font-semibold text-zinc-100",
  mobileHomeRowMeta: "shrink-0 text-xs text-zinc-400",
  mobileHomeRowMetaPrimary:
    "shrink-0 text-xs font-medium text-[color-mix(in_srgb,var(--graphite-primary)_80%,white)]",
  mobileHomeRowMetaInfo:
    "shrink-0 text-xs font-medium text-[color-mix(in_srgb,var(--twin360-blue)_80%,white)]",
  mobileHomeContainedList:
    "relative min-h-0 max-h-[min(280px,36dvh)] flex-1 overflow-hidden rounded-xl border border-white/10 bg-white/[0.04]",
  mobileHomeContainedListScroll:
    "max-h-[min(280px,36dvh)] overflow-y-auto overscroll-contain px-2 py-2",
  mobileHomeContainedListInner: "space-y-2",
  mobileHomeListBottomFade:
    "pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-10 rounded-b-xl bg-gradient-to-t from-[#0B0F15]/80 via-[#0B0F15]/30 to-transparent",

  mobileHomeLayoutRoot:
    "flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden",
  mobileHomeUpperRegion:
    "relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden",
  mobileHomeUpperInner:
    "mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col px-4 pt-3 pb-0",
  mobileHomeContentStack: "flex min-h-0 flex-1 flex-col gap-2",
  mobileHomePrimaryActionsRegion: "flex min-h-0 flex-1 flex-col",
  mobileHomeSection: "shrink-0",
  mobileHomeSectionHeader: "mb-1.5",
  mobileHomeAppPrimaryActionsRegion: "flex min-h-0 flex-1 flex-col",
  mobileHomeAppUpperRegion:
    "relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden",
  mobileHomeAppContentStack: "flex min-h-0 flex-1 flex-col gap-2",
  mobileHomeAppUpperInner:
    "mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col px-4 pt-3 pb-0",
  mobileHomeAppDockTopSpacer: "h-0 max-h-0 shrink-0 overflow-hidden",
  mobileHomeDockTopSpacer: "h-0 max-h-0 shrink-0 overflow-hidden",
  mobileHomeDockRegion: "relative z-10 w-full shrink-0 px-4 pt-1 pb-1",
  mobileHomeDockTopGap: "pt-1",
  mobileHomeDockBottomGap: "pb-1",
  mobileHomeDockInner: "mx-auto w-full max-w-2xl",
  mobileHomeContentScroll: "relative z-0 h-full min-h-0 overflow-y-auto overscroll-contain",
  mobileHomeContentInner: "mx-auto w-full max-w-2xl",
  mobileHomeContentBottomPadding:
    "pb-[calc(clamp(240px,30dvh,300px)+12px+16px)]",
  mobileHomeDockHost: "pointer-events-none absolute inset-x-0 z-20 px-4",
  mobileHomeDockBottomOffset: "bottom-3",
  mobileHomeDockHostInner: "pointer-events-auto w-full",
  mobileHomeDockGap: "12px",
  mobileHomeDockCollapsedHeight: "w-full shrink-0",
  mobileHomeAppDockCollapsedHeight: "w-full shrink-0",
  mobileHomeDockExpandedHeight:
    "h-[60dvh] max-h-[60dvh] min-h-[60dvh] shrink-0",
  mobileHomeDockCollapsedBody:
    "h-[180px] max-h-[180px] min-h-0 overflow-y-auto overscroll-contain",
  mobileHomeContentZone: "flex min-h-0 flex-1 flex-col pt-3",
  mobileHomeContentStackLegacy: "mx-auto flex min-h-0 w-full max-w-2xl flex-1 flex-col",
  mobileHomePrimaryActionsZone: "flex min-h-0 flex-1 flex-col",
  mobileHomeContentDockSpacer:
    "shrink-0 h-[clamp(8px,2dvh,24px)] min-h-2 max-h-6",
  mobileHomeDockZone: "relative shrink-0",
  mobileHomeUpperBottomPad: "pb-0",

  appHomeSectionLabel:
    "text-xs font-black uppercase tracking-[0.2em] text-zinc-100",
  appHomeSectionLabelAccent: "mb-1.5 block h-0.5 w-8 rounded-full bg-teal-400/35",
  appHomeSectionLabelRow: "mb-1.5 flex items-end justify-between gap-3",
  appHomeSectionLabelBlock: "min-w-0",
  appHomeSectionLabelActions: "flex shrink-0 items-center gap-2 pb-0.5",
  appHomeSectionLabelIconButton:
    "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,white_9%,transparent)] text-zinc-200 transition-colors hover:border-[color-mix(in_srgb,white_16%,transparent)] hover:bg-[color-mix(in_srgb,white_12%,transparent)] active:scale-[0.98]",
  appHomeSectionLabelTextLink:
    "text-xs font-semibold text-zinc-200 transition-colors hover:text-white",
  appHomeScrollInner:
    "mx-auto flex min-h-full w-full max-w-2xl flex-1 flex-col gap-3 px-4 pt-3 pb-4",
  appHomeDockStack: "flex w-full shrink-0 flex-col gap-2.5",
  appHomeQuickActionsSectionLabel:
    "text-[11px] font-bold uppercase tracking-[0.14em] text-zinc-300",
  appHomeQuickActionsSectionAccent:
    "mb-1 block h-0.5 w-6 rounded-full bg-[color-mix(in_srgb,var(--graphite-primary)_25%,transparent)]",
  appHomeQuickActionGrid: "grid shrink-0 grid-cols-2 gap-2 auto-rows-fr",
  appHomeQuickActionCard: `flex min-h-[84px] flex-col items-start justify-center gap-0.5 px-2.5 py-2 text-left ${mobileAppHomeQuickActionCardSurface}`,
  appHomeQuickActionIconWrapper:
    "mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--mobile-quick-action-icon-border)] bg-[var(--mobile-quick-action-icon-bg)]",
  appHomeQuickActionIcon: "h-5 w-5 shrink-0 text-[var(--mobile-quick-action-fg)]",
  appHomeQuickActionTitle:
    "text-sm font-bold leading-tight text-[var(--mobile-quick-action-title-fg)]",
  appHomeLauncherGrid: "grid shrink-0 grid-cols-2 gap-3 auto-rows-fr",
  appHomeLauncherCardPrimary: `${appHomeLauncherCardPrimaryBase} border-[var(--mobile-app-card-border-primary)] shadow-[var(--mobile-app-card-glow-primary),var(--mobile-app-card-shadow)] hover:border-[color-mix(in_srgb,var(--graphite-primary)_38%,transparent)] active:ring-2 active:ring-[color-mix(in_srgb,var(--graphite-primary)_28%,transparent)]`,
  appHomeLauncherCardInfo: `${appHomeLauncherCardInfoBase} border-[var(--mobile-app-card-border-info)] shadow-[var(--mobile-app-card-glow-info),var(--mobile-app-card-shadow)] hover:border-[color-mix(in_srgb,var(--twin360-blue)_38%,transparent)] active:ring-2 active:ring-[color-mix(in_srgb,var(--twin360-blue)_28%,transparent)]`,
  appHomeLauncherCard:
    `${appHomeLauncherCardPrimaryBase} border-[var(--mobile-app-card-border-primary)] shadow-[var(--mobile-app-card-glow-primary),var(--mobile-app-card-shadow)] hover:border-[color-mix(in_srgb,var(--graphite-primary)_38%,transparent)] active:ring-2 active:ring-[color-mix(in_srgb,var(--graphite-primary)_28%,transparent)]`,
  appHomeLauncherIconWrapperPrimary:
    "mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--mobile-app-card-icon-border-primary)] bg-[var(--mobile-app-card-icon-bg-primary)]",
  appHomeLauncherIconPrimary: "h-6 w-6 shrink-0 text-[var(--mobile-app-card-icon-fg-primary)]",
  appHomeLauncherIconWrapperInfo:
    "mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--mobile-app-card-icon-border-info)] bg-[var(--mobile-app-card-icon-bg-info)]",
  appHomeLauncherIconInfo: "h-6 w-6 shrink-0 text-[var(--mobile-app-card-icon-fg-info)]",
  appHomeLauncherIconWrapper:
    "mb-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[var(--mobile-app-card-icon-border-primary)] bg-[var(--mobile-app-card-icon-bg-primary)]",
  appHomeLauncherIcon: "h-6 w-6 shrink-0 text-[var(--mobile-app-card-icon-fg-primary)]",
  appHomeLauncherTitle: "text-base font-bold leading-tight text-[var(--mobile-app-card-title-fg)]",
  appHomeLauncherSubtitle: "text-sm font-medium leading-snug text-[var(--mobile-app-card-subtitle-fg)]",
  appHomeLauncherStatusSubline:
    "text-xs font-semibold text-[color-mix(in_srgb,var(--graphite-primary)_72%,var(--graphite-muted))]",
  appHomeLauncherStatusSublineInfo:
    "text-xs font-semibold text-[color-mix(in_srgb,var(--twin360-blue)_72%,var(--graphite-muted))]",
  appHomeLauncherTileMinTarget: "min-h-14",
  appHomeLauncherTileRadius: "rounded-xl",
  appHomeLauncherHeroCard:
    "flex min-h-[140px] w-full flex-col items-start justify-center gap-2 rounded-xl border px-4 py-4 text-left backdrop-blur-md",
  appHomeLauncherPairGrid: "grid w-full shrink-0 grid-cols-2 gap-3 auto-rows-fr",
  appHomeLauncherQuadGrid: "grid w-full shrink-0 grid-cols-2 gap-3 auto-rows-fr",
  appHomeLauncherRail:
    "flex gap-2 overflow-x-auto overscroll-x-contain pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
  appHomeLauncherRailTile: "min-w-[min(72vw,260px)] max-w-[280px] shrink-0",
  appHomeLauncherLockedCard:
    "relative opacity-55 saturate-[0.42] cursor-pointer",
  appHomeLauncherLockBadge:
    "pointer-events-none absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/40 text-zinc-300",
  appHomeLauncherUpsellSheet: "p-6 pb-12",
  appHomeSlateDropWindow:
    "relative flex flex-col overflow-hidden rounded-xl border border-[var(--surface-zinc-border)] bg-[var(--surface-zinc)] shadow-[var(--mobile-quick-action-shadow)]",
  appHomeSlateDropBody:
    "overflow-x-auto overflow-y-hidden overscroll-x-contain px-2 py-2 [-webkit-overflow-scrolling:touch]",
  appHomeSlateDropRow: "flex h-14 flex-nowrap items-stretch gap-2",
  appHomeSlateDropScrollFade:
    "pointer-events-none absolute inset-y-2 right-0 z-[1] w-10 rounded-r-xl bg-gradient-to-l from-[var(--surface-zinc)] via-[color-mix(in_srgb,var(--surface-zinc)_55%,transparent)] to-transparent",
  appHomeSlateDropCard:
    "flex h-14 min-w-[var(--mobile-slatedrop-card-min-width)] shrink-0 flex-row items-center gap-2.5 rounded-lg border px-3 transition-all active:scale-[0.98]",
  appHomeSlateDropTile:
    "flex h-14 min-w-[var(--mobile-slatedrop-card-min-width)] shrink-0 flex-row items-center gap-2.5 rounded-lg border px-3 transition-all active:scale-[0.98]",
  appHomeSlateDropTileSurface:
    "border-[var(--surface-zinc-border)] bg-[var(--surface-zinc)] hover:border-[color-mix(in_srgb,var(--surface-zinc-border)_70%,white)] hover:bg-[color-mix(in_srgb,var(--surface-zinc)_92%,white)]",
  appHomeSlateDropTileProject:
    "border-[var(--surface-zinc-border)] bg-[var(--surface-zinc)] hover:border-[color-mix(in_srgb,var(--surface-zinc-border)_70%,white)] hover:bg-[color-mix(in_srgb,var(--surface-zinc)_92%,white)]",
  appHomeSlateDropTileWorkspace:
    "border-[var(--surface-zinc-border)] bg-[var(--surface-zinc)] hover:border-[color-mix(in_srgb,var(--surface-zinc-border)_70%,white)] hover:bg-[color-mix(in_srgb,var(--surface-zinc)_92%,white)]",
  appHomeSlateDropTileSystem:
    "border-[var(--surface-zinc-border)] bg-[var(--surface-zinc)] hover:border-[color-mix(in_srgb,var(--surface-zinc-border)_70%,white)] hover:bg-[color-mix(in_srgb,var(--surface-zinc)_92%,white)]",
  appHomeSlateDropTileNew:
    "border-dashed border-[var(--surface-zinc-border)] bg-[color-mix(in_srgb,var(--surface-zinc)_88%,transparent)] hover:border-[color-mix(in_srgb,var(--surface-zinc-border)_70%,white)] hover:bg-[color-mix(in_srgb,var(--surface-zinc)_92%,white)]",
  appHomeSlateDropTileIconProject: "text-[var(--mobile-folder-icon-fg)]",
  appHomeSlateDropTileIconWorkspace: "text-[var(--mobile-folder-icon-fg)]",
  appHomeSlateDropTileIconSystem: "text-[var(--mobile-folder-icon-fg)]",
  appHomeSlateDropTileIconNew:
    "h-6 w-6 shrink-0 text-[color-mix(in_srgb,var(--mobile-folder-icon-fg)_72%,var(--mobile-bottom-nav-fg-inactive))]",
  appHomeSlateDropTileLabel:
    "min-w-0 flex-1 truncate text-sm font-semibold leading-tight text-zinc-100",
  appHomeSlateDropTileIcon: "h-6 w-6 shrink-0 text-[var(--mobile-folder-icon-fg)]",
  appQuickActionGrid: "grid shrink-0 grid-cols-2 gap-2 auto-rows-fr",
  appQuickActionCard: `flex min-h-[84px] flex-col items-start justify-center gap-0.5 px-2.5 py-2 text-left ${mobileAppHomeQuickActionCardSurface}`,
  appQuickActionIcon: "h-5 w-5 shrink-0 text-[var(--mobile-quick-action-fg)]",
  appQuickActionLabel:
    "text-sm font-bold leading-tight text-[var(--mobile-quick-action-title-fg)]",
  appQuickActionStripRow: "grid grid-cols-4 gap-1.5",
  appQuickActionStripButton:
    "flex h-[50px] max-h-[50px] flex-col items-center justify-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.05] px-1 py-1.5 text-zinc-200 transition-colors hover:border-white/15 hover:bg-white/[0.08] hover:text-white active:bg-white/[0.11]",
  appButtonBase:
    "flex flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.05] px-2 py-2 text-center transition-all hover:border-white/15 hover:bg-white/[0.08] active:bg-white/[0.11] active:ring-2 active:ring-teal-400/30",
  mobileAppLauncherTileHeight: "h-[110px] min-h-0 max-h-[116px]",
  appButtonIconWrapper:
    "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-teal-400/20 bg-teal-400/10",
  appButtonIconClass: "h-5 w-5 text-teal-400/90",
  appButtonTitleClass: "text-sm font-bold leading-tight text-white",
  appButtonSubtitleClass: "text-xs leading-tight text-zinc-200",
  appBadgeInfo:
    "mt-0.5 rounded-full bg-teal-400/12 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-300",
  mobileAppLauncherCardPrimary:
    `${appHomeLauncherCardPrimaryBase} border-[var(--mobile-app-card-border-primary)] shadow-[var(--mobile-app-card-glow-primary),var(--mobile-app-card-shadow)] hover:border-[color-mix(in_srgb,var(--graphite-primary)_38%,transparent)] active:ring-2 active:ring-[color-mix(in_srgb,var(--graphite-primary)_28%,transparent)]`,
  mobileAppLauncherCardInfo:
    `${appHomeLauncherCardInfoBase} border-[var(--mobile-app-card-border-info)] shadow-[var(--mobile-app-card-glow-info),var(--mobile-app-card-shadow)] hover:border-[color-mix(in_srgb,var(--twin360-blue)_38%,transparent)] active:ring-2 active:ring-[color-mix(in_srgb,var(--twin360-blue)_28%,transparent)]`,
  mobileAppLauncherCard:
    `${appHomeLauncherCardPrimaryBase} border-[var(--mobile-app-card-border-primary)] shadow-[var(--mobile-app-card-glow-primary),var(--mobile-app-card-shadow)] hover:border-[color-mix(in_srgb,var(--graphite-primary)_38%,transparent)] active:ring-2 active:ring-[color-mix(in_srgb,var(--graphite-primary)_28%,transparent)]`,
  mobileAppLauncherCardGrid: "grid shrink-0 grid-cols-2 gap-3 auto-rows-fr",
  mobileAppLauncherTitle: "text-base font-bold leading-tight text-[var(--mobile-app-card-title-fg)]",
  mobileAppLauncherSubtitle: "text-sm font-medium leading-snug text-[var(--mobile-app-card-subtitle-fg)]",
  mobileAppLauncherIconWrapperPrimary:
    "mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--mobile-app-card-icon-border-primary)] bg-[var(--mobile-app-card-icon-bg-primary)]",
  mobileAppLauncherIconPrimary: "h-6 w-6 shrink-0 text-[var(--mobile-app-card-icon-fg-primary)]",
  mobileAppLauncherIconWrapperInfo:
    "mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--mobile-app-card-icon-border-info)] bg-[var(--mobile-app-card-icon-bg-info)]",
  mobileAppLauncherIconInfo: "h-6 w-6 shrink-0 text-[var(--mobile-app-card-icon-fg-info)]",
  mobileAppLauncherIconWrapper:
    "mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--mobile-app-card-icon-border-primary)] bg-[var(--mobile-app-card-icon-bg-primary)]",
  mobileAppLauncherIcon: "h-6 w-6 shrink-0 text-[var(--mobile-app-card-icon-fg-primary)]",
  mobileAppButtonHeight: "h-[76px] min-h-0 max-h-[78px]",
  appCardBase:
    "flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.05] px-4 py-4 transition-colors hover:border-white/15 hover:bg-white/[0.08] active:bg-white/[0.11]",
  appCardIconWrapper:
    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-teal-400/20 bg-teal-400/10 text-teal-400/90",
  appCardIconClass: "h-6 w-6",

  siteWalkActionGridRow: "grid shrink-0 grid-cols-2 gap-2.5 auto-rows-fr",
  siteWalkActionGridButton:
    "flex min-h-[112px] flex-col items-start justify-center gap-1 px-3 py-2.5 text-left rounded-xl border border-[var(--mobile-quick-action-border)] bg-[var(--mobile-quick-action-bg)] shadow-[var(--mobile-quick-action-shadow)] transition-all hover:border-[var(--accent-border-green)] hover:bg-[color-mix(in_srgb,var(--surface-zinc)_92%,white)] active:scale-[0.99]",
  quickActionStripRow: "grid grid-cols-4 gap-1.5",
  quickActionGridRow: "grid h-full min-h-0 flex-1 grid-cols-2 auto-rows-fr gap-2.5",
  quickActionStripButton:
    "flex h-[50px] max-h-[50px] flex-col items-center justify-center gap-0.5 rounded-xl border border-white/10 bg-white/[0.05] px-1 py-1.5 text-zinc-200 transition-colors hover:border-white/15 hover:bg-white/[0.08] hover:text-white active:bg-white/[0.11]",
  quickActionGridButton:
    "flex h-full min-h-[88px] flex-col items-center justify-center gap-1 rounded-xl border border-white/10 bg-white/[0.05] px-2 py-2 text-zinc-100 transition-colors hover:border-white/15 hover:bg-white/[0.08] hover:text-white active:bg-white/[0.11]",
  quickActionStripIcon: "h-5 w-5 shrink-0 text-teal-400/90",
  quickActionStripLabel: "text-sm font-bold leading-tight text-center text-zinc-100",

  expandablePanelOuter: "relative z-30 shrink-0 w-full px-4 pb-3",
  expandablePanelExpandedPosition: "absolute inset-x-0 bottom-0 z-40 w-full px-4 pb-3",
  expandablePanelUpperScroll: "px-4",
  expandablePanelBackdrop: "absolute inset-0 z-20 bg-black/50 backdrop-blur-[2px] lg:hidden",
  expandablePanelDock:
    "flex w-full flex-col overflow-hidden rounded-xl border border-[var(--mobile-expandable-panel-border)] bg-[var(--mobile-expandable-panel-bg)] shadow-[0_-4px_24px_rgba(0,0,0,0.35)] backdrop-blur-md transition-[height] duration-200 ease-out",
  expandablePanelDockExpanded: "shadow-[0_-12px_40px_rgba(0,0,0,0.55)]",
  expandablePanelChrome:
    "flex shrink-0 items-center gap-1 border-b border-[var(--mobile-expandable-panel-border)] px-2",
  expandablePanelHandle: "block h-1.5 w-12 rounded-full bg-white/40",
  expandablePanelCollapsedFrame: "w-full shrink-0",
  expandablePanelExpandedFrame: "h-[60dvh] max-h-[60dvh] min-h-[60dvh]",
  expandablePanelCollapsedBody:
    "h-[180px] max-h-[180px] min-h-0 overflow-y-auto overscroll-contain",
  expandablePanelExpandedBody: "min-h-0 flex-1 overflow-y-auto overscroll-contain",
} as const;
