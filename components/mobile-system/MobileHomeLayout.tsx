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
 * Balanced fixed regions (Option 1): upper content flex-1 in flow, dock shrink-0
 * at the bottom with explicit collapsed/expanded heights. No absolute overlay —
 * avoids containing-block width bugs and unbounded middle void.
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
      data-mobile-home-layout-version="balanced-regions-v1"
      data-dock-width-mode="full-shell"
      data-mobile-route={route}
      className={cn(mobileTokens.mobileHomeLayoutRoot, className)}
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

      <div
        className={
          route === "app"
            ? mobileTokens.mobileHomeAppDockTopSpacer
            : mobileTokens.mobileHomeDockTopSpacer
        }
        aria-hidden
      />

      <div className={cn(mobileTokens.mobileHomeDockRegion, "mt-auto")}>
        <div className={mobileTokens.mobileHomeDockInner}>{dock}</div>
      </div>
    </div>
  );
}
