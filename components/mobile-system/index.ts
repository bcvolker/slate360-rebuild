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

export { MobileTopBar } from "./MobileTopBar";

export { MobileBottomNav } from "./MobileBottomNav";
export type { MobileBottomNavItem } from "./MobileBottomNav";

export { MobileSection } from "./MobileSection";

export { MobileActionCard } from "./MobileActionCard";

export { MobileQuickActionStrip } from "./MobileQuickActionStrip";
export type { MobileQuickActionItem } from "./MobileQuickActionStrip";

export { MobileActionGrid } from "./MobileActionGrid";

export { MobileAppCard } from "./MobileAppCard";

export { MobileAppButton } from "./MobileAppButton";
export type { MobileAppButtonProps } from "./MobileAppButton";

export { MobileTabbedPanel } from "./MobileTabbedPanel";
export type { MobilePanelTab } from "./MobileTabbedPanel";

export { MobileExpandableTabbedPanel } from "./MobileExpandableTabbedPanel";

export { MobileEmptyState } from "./MobileEmptyState";
export { MobileComingSoonSheet } from "./MobileComingSoonSheet";
export { MobileCreateSheet } from "./MobileCreateSheet";
