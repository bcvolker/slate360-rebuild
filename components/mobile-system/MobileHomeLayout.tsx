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
  const isApp = route === "app";

  const upperRegionClass = isApp
    ? mobileTokens.mobileHomeAppUpperRegion
    : "relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden";

  const upperInnerClass = isApp
    ? mobileTokens.mobileHomeAppUpperInner
    : "mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col px-4 pt-3 pb-0";

  const contentStackClass = isApp
    ? mobileTokens.mobileHomeAppContentStack
    : "flex min-h-0 flex-1 flex-col gap-2";

  const primaryActionsClass = isApp
    ? mobileTokens.mobileHomeAppPrimaryActionsRegion
    : "flex min-h-0 flex-1 flex-col";

  return (
    <div
      data-mobile-home-layout-version="unified-balanced-dock-v3"
      data-dock-width-mode="full-shell"
      data-mobile-route={route}
      className={cn(HOME_LAYOUT_ROOT, className)}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", upperRegionClass)}>
          <div className={upperInnerClass}>
            <div className={contentStackClass}>
              <div className="shrink-0">{contentTop}</div>
              {primaryActions ? (
                <div className={primaryActionsClass}>{primaryActions}</div>
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
