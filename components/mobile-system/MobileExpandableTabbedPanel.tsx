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

const HOME_NAV_BOTTOM_OFFSET = "bottom-[calc(62px+env(safe-area-inset-bottom,0px))]";
const HOME_DOCK_COLLAPSED_BODY =
  "h-[180px] max-h-[180px] min-h-0 overflow-hidden overscroll-contain";
const HOME_DOCK_COLLAPSED_FADE =
  "pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-14 bg-gradient-to-t from-[#0B0F15] via-[#0B0F15]/95 to-transparent";

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
          ? cn("relative w-full pointer-events-auto", !expanded && "z-30")
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
              mobileTokens.focusRing,
              !expanded && isHomeDock && "text-[#6EA7A0]",
            )}
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={expanded ? "Collapse activity panel" : "Expand activity panel"}
            onClick={toggle}
          >
            <span className={mobileTokens.mobileExpandablePanelHandle} aria-hidden />
            {expanded ? (
              <ChevronDown className="size-6 shrink-0 text-zinc-400" aria-hidden />
            ) : (
              <ChevronUp
                className={cn(
                  "size-6 shrink-0",
                  isHomeDock ? "text-[#6EA7A0] drop-shadow-[0_0_8px_rgba(110,167,160,0.45)]" : "text-zinc-400",
                )}
                aria-hidden
              />
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
          showBottomFade
          bottomFadeClassName={mobileTokens.mobileExpandablePanelFade}
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
                  "pointer-events-none fixed inset-x-0 z-50 w-full px-4 pb-3",
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
          className={cn("relative mt-auto flex w-full shrink-0 flex-col", className)}
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
