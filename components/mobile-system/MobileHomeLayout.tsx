"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";
import { useMobileShellDock } from "./MobileShell";

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

/**
 * @deprecated Use MobileShell scroll content + useMobileShellDock instead.
 * Kept for preview/quarantine routes during migration.
 */
export function MobileHomeLayout({
  route,
  contentTop,
  primaryActions,
  dock,
  className,
}: MobileHomeLayoutProps) {
  useMobileShellDock(dock);

  return (
    <div
      data-mobile-home-layout-version="mobile-shell-v1"
      data-dock-width-mode="full-shell"
      data-mobile-route={route}
      className={cn(mobileTokens.mobileShellScrollInner, className)}
    >
      {contentTop ? <div className="shrink-0">{contentTop}</div> : null}
      {primaryActions ? (
        <div className={mobileTokens.mobileHomeSection}>{primaryActions}</div>
      ) : null}
    </div>
  );
}

/** @deprecated Use MobileShell outer container classes */
export const HOME_LAYOUT_ROOT =
  "relative flex h-full w-full flex-col overflow-hidden bg-[#0B0F15]";
