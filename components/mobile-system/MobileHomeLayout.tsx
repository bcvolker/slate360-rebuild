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

/** /app: dock fills remaining viewport below upper content */
const HOME_DOCK_PANEL =
  "mt-auto flex min-h-0 w-full shrink-0 flex-col overflow-hidden";

/** /site-walk: ~4px between quick actions and collapsed dock (MOBILE_HOME_DOCK_GAP_PX) */
const SITE_WALK_DOCK_TOP_GAP = "pt-1";

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
  const isApp = route === "app";
  const isModuleHome = route === "site-walk" || route === "digital-twin";

  const upperBlock = (
    <div
      className={
        isApp
          ? mobileTokens.mobileHomeAppUpperRegion
          : "relative z-0 flex min-h-0 flex-1 flex-col overflow-hidden"
      }
    >
      <div
        className={
          isApp
            ? mobileTokens.mobileHomeAppUpperInner
            : "mx-auto flex w-full max-w-2xl min-h-0 flex-1 flex-col px-4 pt-3 pb-0"
        }
      >
        <div
          className={
            isApp
              ? mobileTokens.mobileHomeAppContentStack
              : "flex min-h-0 flex-1 flex-col gap-2"
          }
        >
          <div className="shrink-0">{contentTop}</div>
          {primaryActions ? (
            <div
              className={
                isApp
                  ? mobileTokens.mobileHomeAppPrimaryActionsRegion
                  : "flex min-h-0 flex-1 flex-col"
              }
            >
              {primaryActions}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (isModuleHome) {
    return (
      <div
        data-mobile-home-layout-version="module-home-balanced-dock-v2"
        data-dock-width-mode="full-shell"
        data-mobile-route={route}
        className={cn(HOME_LAYOUT_ROOT, className)}
      >
        {/*
          Upper block absorbs free height (no justify-end void above title).
          Dock stays shrink-0 directly under quick actions (~4px pt-1, pb-1).
        */}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{upperBlock}</div>
          <div
            className={cn(
              "relative z-10 w-full shrink-0 px-4 pb-1",
              SITE_WALK_DOCK_TOP_GAP,
            )}
          >
            <div className={mobileTokens.mobileHomeDockInner}>{dock}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-mobile-home-layout-version="stretch-dock-v2"
      data-dock-width-mode="full-shell"
      data-mobile-route={route}
      className={cn(HOME_LAYOUT_ROOT, className)}
    >
      {upperBlock}
      <div className="relative z-10 min-h-0 w-full flex-1 px-4 pb-0">
        <div
          className={cn(
            mobileTokens.mobileHomeDockInner,
            "flex min-h-0 h-full flex-1 flex-col",
          )}
        >
          <div className={HOME_DOCK_PANEL}>{dock}</div>
        </div>
      </div>
    </div>
  );
}

export { HOME_LAYOUT_ROOT, HOME_DOCK_PANEL };
