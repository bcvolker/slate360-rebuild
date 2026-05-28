"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

type MobileHomeLayoutProps = {
  /** Real-route verification marker */
  route: "app" | "site-walk" | "digital-twin";
  /** Primary content block (app tiles, module intro, etc.) */
  contentTop: ReactNode;
  /** Secondary action row/grid (quick actions, module actions) */
  primaryActions?: ReactNode;
  /** Expandable activity dock — MobileExpandableTabbedPanel without upper */
  dock: ReactNode;
  className?: string;
};

const HOME_LAYOUT_ROOT =
  "relative flex h-full w-full flex-col overflow-hidden bg-[#0B0F15]";

/**
 * Shared vertical composition for /app, /site-walk, and /digital-twin home surfaces.
 * Upper content flexes; dock stays shrink-0 above bottom nav with a small gap.
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
      data-mobile-home-layout-version="unified-balanced-dock-v4"
      data-dock-width-mode="full-shell"
      data-mobile-route={route}
      className={cn(HOME_LAYOUT_ROOT, className)}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className={cn(
            "flex min-h-0 flex-1 flex-col overflow-hidden",
            mobileTokens.mobileHomeUpperRegion,
          )}
        >
          <div className={mobileTokens.mobileHomeUpperInner}>
            <div className={mobileTokens.mobileHomeContentStack}>
              {contentTop ? <div className="shrink-0">{contentTop}</div> : null}
              {primaryActions ? (
                <div className={mobileTokens.mobileHomePrimaryActionsRegion}>
                  {primaryActions}
                </div>
              ) : null}
            </div>
          </div>
        </div>
        <div className={mobileTokens.mobileHomeDockRegion}>
          <div className={mobileTokens.mobileHomeDockInner}>{dock}</div>
        </div>
      </div>
    </div>
  );
}

export { HOME_LAYOUT_ROOT };
