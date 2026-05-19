/**
 * mobile-system/index.ts — barrel export for all shared mobile primitives.
 *
 * Import from "@/components/mobile-system" in consuming components.
 *
 * Slice 1: primitives only. /app and /site-walk migrations happen in Slice 2 and 3.
 */

export { mobileTokens } from "./mobileTokens";

export { MobileActionCard } from "./MobileActionCard";

export { MobileActionGrid } from "./MobileActionGrid";

export { MobileAppCard } from "./MobileAppCard";

export { MobileAppButton } from "./MobileAppButton";
export type { MobileAppButtonProps } from "./MobileAppButton";

export { MobileTabbedPanel } from "./MobileTabbedPanel";
export type { MobilePanelTab } from "./MobileTabbedPanel";

export { MobileEmptyState } from "./MobileEmptyState";
