"use client";

/**
 * MobileExpandableTabbedPanel — unified collapsible activity dock for /app and /site-walk.
 */

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
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
};

/** Collapsed dock chrome only — grabber, label, chevron (~56px). */
const COLLAPSED_DOCK_HEIGHT_PX = 56;
const COLLAPSED_DOCK_FRAME = "h-14 max-h-14 min-h-14 shrink-0 overflow-hidden";

/** 62px in-flow bottom nav band (mobileTokens MOBILE_BOTTOM_NAV_HEIGHT_PX). */
const HOME_NAV_BOTTOM_OFFSET = "bottom-[calc(62px+env(safe-area-inset-bottom,0px))]";

export function MobileExpandableTabbedPanel({
  tabs,
  defaultTab,
  upper,
  className,
}: MobileExpandableTabbedPanelProps) {
  const pathname = usePathname();
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
          "relative",
          mobileTokens.mobileExpandablePanelFrame,
          expanded
            ? cn(
                mobileTokens.mobileExpandablePanelExpandedHeight,
                mobileTokens.mobileExpandablePanelFrameExpanded,
              )
            : COLLAPSED_DOCK_FRAME,
        )}
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
              !expanded && "min-h-0 h-full gap-2 border-b-0 py-2",
            )}
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={expanded ? "Collapse activity panel" : "Expand activity panel"}
            onClick={toggle}
          >
            <span className={mobileTokens.mobileExpandablePanelHandle} aria-hidden />
            {!expanded ? (
              <>
                <span className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-zinc-200">
                  Activity
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
            <>
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
            </>,
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
          data-collapsed-height={`${COLLAPSED_DOCK_HEIGHT_PX}px`}
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
      data-collapsed-height={`${COLLAPSED_DOCK_HEIGHT_PX}px`}
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
