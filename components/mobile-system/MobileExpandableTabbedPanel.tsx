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

/** 62px in-flow bottom nav band (mobileTokens MOBILE_BOTTOM_NAV_HEIGHT_PX). */
const HOME_NAV_BOTTOM_OFFSET = "bottom-[calc(62px+env(safe-area-inset-bottom,0px))]";
/** 180px body = 2.5 × 72px row target (MOBILE_PANEL_COLLAPSED_BODY_PX). */
const HOME_DOCK_COLLAPSED_BODY =
  "h-[180px] max-h-[180px] min-h-0 overflow-hidden overscroll-contain";
const HOME_DOCK_COLLAPSED_FADE =
  "pointer-events-none absolute inset-x-0 bottom-0 z-[4] h-[72px] bg-gradient-to-t from-[#0B0F15] from-35% via-[#0B0F15]/92 via-65% to-transparent";
const HOME_DOCK_COLLAPSED_CHEVRON = "size-7 shrink-0 text-[#85CBC3]";
const HOME_DOCK_TAB_TRIGGER =
  "flex-1 rounded-none border-b-2 border-transparent py-2 text-[13px] font-medium text-zinc-300 transition-colors data-[state=active]:border-[#85CBC3] data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none";
const HOME_DOCK_FOCUS_RING =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6EA7A0]/50 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0B0F15]";

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
              isHomeDock ? HOME_DOCK_FOCUS_RING : mobileTokens.focusRing,
              !expanded && isHomeDock && "flex-col gap-1 py-1.5 text-[#6EA7A0]",
            )}
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={expanded ? "Collapse activity panel" : "Expand activity panel"}
            onClick={toggle}
          >
            {!expanded && isHomeDock ? (
              <>
                <ChevronUp className={HOME_DOCK_COLLAPSED_CHEVRON} aria-hidden />
                <span className={mobileTokens.mobileExpandablePanelHandle} aria-hidden />
              </>
            ) : (
              <>
                <span className={mobileTokens.mobileExpandablePanelHandle} aria-hidden />
                {expanded ? (
                  <ChevronDown className="size-6 shrink-0 text-zinc-300" aria-hidden />
                ) : (
                  <ChevronUp className="size-6 shrink-0 text-zinc-300" aria-hidden />
                )}
              </>
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
                ? HOME_DOCK_COLLAPSED_BODY
                : mobileTokens.mobileExpandablePanelCollapsedBody
          }
          showBottomFade={expanded || !isHomeDock}
          bottomFadeClassName={mobileTokens.mobileExpandablePanelFade}
          tabTriggerClassName={isHomeDock ? HOME_DOCK_TAB_TRIGGER : undefined}
        />

        {!expanded && isHomeDock ? <div className={HOME_DOCK_COLLAPSED_FADE} aria-hidden /> : null}
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
                className="fixed inset-0 z-[45] bg-black/50 backdrop-blur-[2px] lg:hidden"
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
          data-expandable-panel-version="fixed-region-v2"
          data-panel-mode="fixed-region"
          data-dock-width-mode="full-shell"
          data-expanded-state={expanded ? "true" : "false"}
          data-collapsed-height={MOBILE_HOME_DOCK_COLLAPSED_CLAMP}
          data-expanded-height={MOBILE_HOME_DOCK_EXPANDED_CLAMP}
          className={cn("relative flex w-full shrink-0 flex-col pb-1", className)}
        >
          {!expanded ? dock : null}
        </div>
        {expandedOverlay}
      </>
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
