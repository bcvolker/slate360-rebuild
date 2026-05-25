"use client";

/**
 * MobileExpandableTabbedPanel — unified collapsible activity dock for /app and /site-walk.
 */

import { useCallback, useEffect, useId, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MOBILE_HOME_DOCK_COLLAPSED_CLAMP,
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

export function MobileExpandableTabbedPanel({
  tabs,
  defaultTab,
  upper,
  className,
}: MobileExpandableTabbedPanelProps) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const collapse = useCallback(() => setExpanded(false), []);
  const toggle = useCallback(() => setExpanded((value) => !value), []);

  useEffect(() => {
    setExpanded(false);
  }, [pathname]);

  const isHomeDock = !upper;

  const dock = (
    <div
      className={cn(
        isHomeDock
          ? "relative z-30 w-full pointer-events-auto"
          : mobileTokens.mobileExpandablePanelOuter,
        expanded && mobileTokens.mobileExpandablePanelExpandedPosition,
      )}
    >
      <div
        data-testid="mobile-expandable-panel-frame"
        data-expandable-panel-state={expanded ? "expanded" : "collapsed"}
        className={cn(
          mobileTokens.mobileExpandablePanelFrame,
          expanded
            ? cn(
                mobileTokens.mobileExpandablePanelExpandedHeight,
                mobileTokens.mobileExpandablePanelFrameExpanded,
              )
            : isHomeDock
              ? mobileTokens.mobileHomeAppDockCollapsedHeight
              : mobileTokens.mobileExpandablePanelCollapsedHeight,
        )}
      >
        <div className={mobileTokens.mobileExpandablePanelChrome}>
          <button
            type="button"
            className={cn(
              mobileTokens.mobileExpandablePanelToggleButton,
              mobileTokens.focusRing,
            )}
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={expanded ? "Collapse activity panel" : "Expand activity panel"}
            onClick={toggle}
          >
            <span className={mobileTokens.mobileExpandablePanelHandle} aria-hidden />
            {expanded ? (
              <ChevronDown className="size-5 shrink-0" aria-hidden />
            ) : (
              <ChevronUp className="size-5 shrink-0" aria-hidden />
            )}
          </button>
        </div>

        <MobileTabbedPanel
          id={panelId}
          tabs={tabs}
          defaultTab={defaultTab}
          minHeight="min-h-0"
          className={mobileTokens.mobileExpandablePanelTabbedFill}
          bodyClassName={
            expanded
              ? mobileTokens.mobileExpandablePanelExpandedBody
              : isHomeDock
                ? mobileTokens.mobileHomeDockCollapsedBody
                : mobileTokens.mobileExpandablePanelCollapsedBody
          }
          showBottomFade
          bottomFadeClassName={mobileTokens.mobileExpandablePanelFade}
        />
      </div>
    </div>
  );

  if (isHomeDock) {
    return (
      <div
        data-expandable-panel-version="fixed-region-v2"
        data-panel-mode="fixed-region"
        data-dock-width-mode="full-shell"
        data-expanded-state={expanded ? "true" : "false"}
        data-collapsed-height={MOBILE_HOME_DOCK_COLLAPSED_CLAMP}
        data-expanded-height={MOBILE_HOME_DOCK_EXPANDED_CLAMP}
        className={cn(
          "relative flex w-full flex-col",
          expanded ? "z-50 h-full min-h-0 flex-grow" : "mt-auto shrink-0",
          className,
        )}
      >
        {expanded && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] lg:hidden"
            aria-label="Close activity panel"
            onClick={collapse}
          />
        )}
        <div className={cn(expanded && "relative z-50")}>{dock}</div>
      </div>
    );
  }

  return (
    <div
      data-expandable-panel-version="capped-spacer-v2"
      data-expanded={expanded ? "true" : "false"}
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
