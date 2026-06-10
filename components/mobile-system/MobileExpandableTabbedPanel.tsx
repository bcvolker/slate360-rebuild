"use client";

/**
 * MobileExpandableTabbedPanel — unified collapsible activity dock for /app and /site-walk.
 */

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveMobileRoute } from "./mainMobileTabs";
import {
  MOBILE_HOME_DOCK_EXPANDED_CLAMP,
  mobileTokens,
} from "./mobileTokens";
import { MobileTabbedPanel } from "./MobileTabbedPanel";
import type { MobilePanelTab } from "./MobileTabbedPanel";

type MobileExpandableTabbedPanelProps = {
  tabs: MobilePanelTab[];
  defaultTab?: string;
  upper?: ReactNode;
  className?: string;
  /** Optional count badge beside collapsed label (home dock). */
  badgeCount?: number;
  /** Collapsed chrome height — defaults to 56px; /app home uses 40px. */
  collapsedHeightPx?: number;
};

/** Collapsed dock chrome only — grabber, label, chevron. */
const DEFAULT_COLLAPSED_DOCK_HEIGHT_PX = 56;

/** 62px in-flow bottom nav band (mobileTokens MOBILE_BOTTOM_NAV_HEIGHT_PX). */
const HOME_NAV_BOTTOM_OFFSET = "bottom-[calc(62px+env(safe-area-inset-bottom,0px))]";

export function MobileExpandableTabbedPanel({
  tabs,
  defaultTab,
  upper,
  className,
  badgeCount,
  collapsedHeightPx = DEFAULT_COLLAPSED_DOCK_HEIGHT_PX,
}: MobileExpandableTabbedPanelProps) {
  const pathname = usePathname() ?? "";
  const mobileRoute = resolveMobileRoute(pathname);
  const [expanded, setExpanded] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelId = useId();
  const collapse = useCallback(() => setExpanded(false), []);
  const toggle = useCallback(() => setExpanded((value) => !value), []);

  useEffect(() => {
    setExpanded(false);
  }, [pathname]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isHomeDock = !upper;
  const showTabbedContent = expanded;

  const dock = (
    <div
      className={cn(
        isHomeDock
          ? cn("relative w-full pointer-events-auto", !expanded && "z-10")
          : mobileTokens.mobileExpandablePanelOuter,
        expanded && !isHomeDock && mobileTokens.mobileExpandablePanelExpandedPosition,
      )}
    >
      <div
        data-testid="mobile-expandable-panel-frame"
        data-expandable-panel-state={expanded ? "expanded" : "collapsed"}
        className={cn(
          "relative shrink-0 overflow-hidden",
          mobileTokens.mobileExpandablePanelFrame,
          expanded
            ? cn(
                mobileTokens.mobileExpandablePanelExpandedHeight,
                mobileTokens.mobileExpandablePanelFrameExpanded,
              )
            : null,
        )}
        style={
          expanded
            ? undefined
            : {
                height: collapsedHeightPx,
                minHeight: collapsedHeightPx,
                maxHeight: collapsedHeightPx,
              }
        }
      >
        <div
          className={cn(
            mobileTokens.mobileExpandablePanelChrome,
            !expanded && "min-h-0 h-full",
          )}
        >
          <button
            type="button"
            className={cn(
              mobileTokens.mobileExpandablePanelToggleButton,
              mobileTokens.focusRing,
              !expanded && "min-h-0 h-full gap-2 border-b-0 py-1.5",
            )}
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={expanded ? "Collapse activity panel" : "Expand activity panel"}
            onClick={toggle}
          >
            <span className={mobileTokens.mobileExpandablePanelHandle} aria-hidden />
            {!expanded ? (
              <>
                <span className="flex min-w-0 flex-1 items-center justify-center gap-2">
                  <span className="truncate text-sm font-semibold text-zinc-200">Activity</span>
                  {badgeCount != null && badgeCount > 0 ? (
                    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-[#2A3340] bg-[#11161E] px-1.5 text-[10px] font-semibold tabular-nums text-[#F8FAFC]">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  ) : null}
                </span>
                <ChevronUp
                  className={mobileTokens.mobileExpandablePanelChevron}
                  aria-hidden
                />
              </>
            ) : (
              <ChevronDown
                className={mobileTokens.mobileExpandablePanelChevron}
                aria-hidden
              />
            )}
          </button>
        </div>

        {showTabbedContent ? (
          <MobileTabbedPanel
            id={panelId}
            tabs={tabs}
            defaultTab={defaultTab}
            minHeight="min-h-0"
            className={mobileTokens.mobileExpandablePanelTabbedFill}
            bodyClassName={mobileTokens.mobileExpandablePanelExpandedBody}
            showBottomFade
            bottomFadeClassName={mobileTokens.mobileExpandablePanelFade}
            tabTriggerClassName={mobileTokens.mobileExpandablePanelTabTrigger}
          />
        ) : null}
      </div>
    </div>
  );

  if (isHomeDock) {
    const expandedOverlay =
      expanded && mounted
        ? createPortal(
            <div data-mobile-route={mobileRoute}>
              <button
                type="button"
                className={mobileTokens.mobileExpandablePanelBackdrop}
                aria-label="Close activity panel"
                onClick={collapse}
              />
              <div
                className={cn(
                  "pointer-events-none fixed inset-x-0 z-[50] w-full px-4",
                  HOME_NAV_BOTTOM_OFFSET,
                )}
              >
                <div className="pointer-events-auto w-full">{dock}</div>
              </div>
            </div>,
            document.body,
          )
        : null;

    return (
      <>
        <div
          data-expandable-panel-version="fixed-region-v3"
          data-panel-mode="fixed-region"
          data-dock-width-mode="full-shell"
          data-expanded-state={expanded ? "true" : "false"}
          data-collapsed-height={`${collapsedHeightPx}px`}
          data-expanded-height={MOBILE_HOME_DOCK_EXPANDED_CLAMP}
          className={cn(
            "relative flex w-full shrink-0 flex-col",
            className,
          )}
        >
          {!expanded ? dock : null}
        </div>
        {expandedOverlay}
      </>
    );
  }

  return (
    <div
      data-expandable-panel-version="capped-spacer-v3"
      data-expanded={expanded ? "true" : "false"}
      data-collapsed-height={`${collapsedHeightPx}px`}
      data-testid="mobile-expandable-panel-host"
      className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden", className)}
    >
      {expanded && (
        <button
          type="button"
          className={mobileTokens.mobileExpandablePanelBackdrop}
          aria-label="Close activity panel"
          onClick={collapse}
        />
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div
          className={cn(
            "shrink-0",
            mobileTokens.mobileShellContentTopGap,
            mobileTokens.mobileShellContentPaddingX,
          )}
        >
          {upper}
        </div>
        <div className={mobileTokens.mobileShellDockSpacer} aria-hidden />
        <div className={cn("shrink-0", mobileTokens.mobileShellDockGap)}>{dock}</div>
      </div>
    </div>
  );
}
