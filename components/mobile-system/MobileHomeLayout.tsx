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

const HOME_LAYOUT_ROOT =
  "relative flex h-full w-full flex-col overflow-hidden bg-[#0B0F15]";

const HOME_DOCK_PANEL =
  "flex min-h-0 w-full flex-1 flex-col mt-4 overflow-hidden rounded-t-[24px] border-t border-white/[0.05] bg-slate-900/60 backdrop-blur-xl";

/**
 * Shared vertical composition for /app and /site-walk home surfaces.
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
      data-mobile-home-layout-version="stretch-dock-v2"
      data-dock-width-mode="full-shell"
      data-mobile-route={route}
      className={cn(HOME_LAYOUT_ROOT, className)}
    >
      <div
        className={
          route === "app"
            ? mobileTokens.mobileHomeAppUpperRegion
            : mobileTokens.mobileHomeUpperRegion
        }
      >
        <div
          className={
            route === "app"
              ? mobileTokens.mobileHomeAppUpperInner
              : mobileTokens.mobileHomeUpperInner
          }
        >
          <div
            className={
              route === "app"
                ? mobileTokens.mobileHomeAppContentStack
                : mobileTokens.mobileHomeContentStack
            }
          >
            <div className="shrink-0">{contentTop}</div>
            {primaryActions ? (
              <div
                className={
                  route === "app"
                    ? mobileTokens.mobileHomeAppPrimaryActionsRegion
                    : mobileTokens.mobileHomePrimaryActionsRegion
                }
              >
                {primaryActions}
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="relative z-10 min-h-0 w-full flex-1 px-4 pb-0">
        <div className={cn(mobileTokens.mobileHomeDockInner, "flex min-h-0 h-full flex-1 flex-col")}>
          <div className={HOME_DOCK_PANEL}>{dock}</div>
        </div>
      </div>
    </div>
  );
}

export { HOME_LAYOUT_ROOT, HOME_DOCK_PANEL };
