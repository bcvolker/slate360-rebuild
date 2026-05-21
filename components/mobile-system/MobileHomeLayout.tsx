"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

type MobileHomeLayoutProps = {
  /** Real-route verification marker */
  route: "app" | "site-walk";
  /** Primary content block (app tiles, module intro, etc.) */
  contentTop: ReactNode;
  /** Secondary action row/grid (quick actions, module actions) */
  primaryActions?: ReactNode;
  /** Expandable activity dock — MobileExpandableTabbedPanel without upper */
  dock: ReactNode;
  className?: string;
};

/**
 * Shared vertical composition for /app and /site-walk home surfaces.
 *
 * Viewport allocation:
 * - content zone (flex-1, starts near header, primary actions may grow)
 * - capped content→dock spacer
 * - dock zone (shrink-0, dock anchored above bottom nav)
 */
export function MobileHomeLayout({
  route,
  contentTop,
  primaryActions,
  dock,
  className,
}: MobileHomeLayoutProps) {
  return (
    <div
      data-mobile-home-layout-version="home-layout-v2"
      data-mobile-route={route}
      className={cn(mobileTokens.mobileHomeLayoutRoot, className)}
    >
      <div
        className={cn(
          mobileTokens.mobileHomeContentZone,
          mobileTokens.mobileShellContentPaddingX,
        )}
      >
        <div
          className={cn(
            mobileTokens.mobileHomeContentStack,
            mobileTokens.mobileShellContentStackGap,
          )}
        >
          <div className="shrink-0">{contentTop}</div>
          {primaryActions ? (
            <div className={mobileTokens.mobileHomePrimaryActionsZone}>{primaryActions}</div>
          ) : null}
        </div>
      </div>

      <div className={mobileTokens.mobileHomeContentDockSpacer} aria-hidden />

      <div className={mobileTokens.mobileHomeDockZone}>{dock}</div>
    </div>
  );
}
