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
 * Dock model: anchored bottom sheet above the in-flow bottom nav (nav lives
 * in MobileAppShell, outside main). Upper content scrolls with bottom padding;
 * the dock is absolutely positioned — no flex spacer reserves empty gap.
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
      data-mobile-home-layout-version="anchored-dock-v1"
      data-mobile-route={route}
      className={cn(mobileTokens.mobileHomeLayoutRoot, className)}
    >
      <div
        className={cn(
          mobileTokens.mobileHomeContentScroll,
          mobileTokens.mobileHomeContentBottomPadding,
        )}
      >
        <div
          className={cn(
            mobileTokens.mobileHomeContentInner,
            mobileTokens.mobileShellContentPaddingX,
            mobileTokens.mobileShellContentTopGap,
          )}
        >
          <div
            className={cn(
              mobileTokens.mobileHomeContentStack,
              mobileTokens.mobileShellContentStackGap,
            )}
          >
            <div className="shrink-0">{contentTop}</div>
            {primaryActions ? <div className="shrink-0">{primaryActions}</div> : null}
          </div>
        </div>
      </div>

      <div
        className={cn(
          mobileTokens.mobileHomeDockHost,
          mobileTokens.mobileHomeDockBottomOffset,
        )}
      >
        <div className={mobileTokens.mobileHomeDockHostInner}>{dock}</div>
      </div>
    </div>
  );
}
