/**
 * mobile-system/index.ts — barrel export for all shared mobile primitives.
 *
 * Import from "@/components/mobile-system" in consuming components.
 *
 * Slice 1: primitives only. /app and /site-walk migrations happen in Slice 2 and 3.
 */

export {
  mobileTokens,
  MOBILE_PANEL_ROW_HEIGHT_PX,
  MOBILE_PANEL_COLLAPSED_BODY_PX,
  MOBILE_PANEL_COLLAPSED_FRAME_PX,
} from "./mobileTokens";
export { MobileShellBrand } from "./MobileShellBrand";
export { MobileShellBackToApp } from "./MobileShellBackToApp";
export { MobileShellBrandMark } from "./MobileShellBrandMark";

export { MobileAppShell } from "./MobileAppShell";
export { MobileShell, useMobileShellDock } from "./MobileShell";

export { MobilePlatformHeader } from "./MobilePlatformHeader";
export { MobileHeaderActions } from "./MobileHeaderActions";
export { MobileHeaderOverlays } from "./MobileHeaderOverlays";
export { MobileModalProvider, useMobileModal } from "./MobileModalContext";
export { MobileInboxClient } from "./MobileInboxClient";

export { MobileTopBar } from "./MobileTopBar";

export {
  MobileBottomNav,
  MobilePlatformBottomNav,
  MOBILE_PLATFORM_NAV_ITEMS,
  resolveMobilePlatformNavKey,
} from "./MobileBottomNav";
export type { MobileBottomNavItem, MobilePlatformNavKey } from "./MobileBottomNav";

export { MobileSection } from "./MobileSection";

export { MobileActionCard } from "./MobileActionCard";

export { MobileHomeActionCard, MobileHomeActionGrid } from "./MobileHomeActionCard";

export { MobileQuickActionStrip } from "./MobileQuickActionStrip";
export type { MobileQuickActionItem } from "./MobileQuickActionStrip";
export { MobileQuickActionsSection } from "./MobileQuickActionsSection";

export { MobileActionGrid } from "./MobileActionGrid";

export { MobileAppCard } from "./MobileAppCard";

export { MobileAppButton } from "./MobileAppButton";
export type { MobileAppButtonProps } from "./MobileAppButton";
export type { MobileAppAccent, MobileQuickActionAccent } from "./mobileTokens";

export { MobileTabbedPanel } from "./MobileTabbedPanel";
export type { MobilePanelTab } from "./MobileTabbedPanel";

export { MobileExpandableTabbedPanel } from "./MobileExpandableTabbedPanel";

export { MobileHomeLayout } from "./MobileHomeLayout";

export { MobileEmptyState } from "./MobileEmptyState";
export { MobileComingSoonSheet } from "./MobileComingSoonSheet";
export { MobileCreateSheet } from "./MobileCreateSheet";
