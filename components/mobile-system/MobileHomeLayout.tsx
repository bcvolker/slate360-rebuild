"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";

type MobileHomeLayoutProps = {
  route: "app" | "site-walk";
  contentTop: ReactNode;
  primaryActions?: ReactNode;
  dock: ReactNode;
  className?: string;
};

/**
 * Shared grid-based vertical composition for /app and /site-walk home surfaces.
 *
 * Rows:
 * 1. contentTop (auto)
 * 2. primaryActions (minmax(0,1fr) — children must stretch to h-full)
 * 3. capped spacer (auto)
 * 4. dock (auto, fixed collapsed height)
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
      data-mobile-home-layout-version="home-layout-v3"
      data-mobile-route={route}
      className={cn(mobileTokens.mobileHomeLayoutRoot, className)}
    >
      <div
        className={cn(
          mobileTokens.mobileHomeContentTopRow,
          mobileTokens.mobileShellContentPaddingX,
        )}
      >
        <div className={cn("mx-auto w-full max-w-2xl", mobileTokens.mobileShellContentStackGap)}>
          {contentTop}
        </div>
      </div>

      {primaryActions ? (
        <div
          className={cn(
            mobileTokens.mobileHomePrimaryActionsRow,
            mobileTokens.mobileShellContentPaddingX,
          )}
        >
          <div className={cn("mx-auto flex h-full min-h-0 w-full max-w-2xl flex-col")}>
            {primaryActions}
          </div>
        </div>
      ) : (
        <div className={mobileTokens.mobileHomePrimaryActionsRow} aria-hidden />
      )}

      <div className={mobileTokens.mobileHomeContentDockSpacer} aria-hidden />

      <div className={mobileTokens.mobileHomeDockZone}>{dock}</div>
    </div>
  );
}
