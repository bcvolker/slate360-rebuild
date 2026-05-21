"use client";

/**
 * MobileExpandableTabbedPanel — unified collapsible activity dock for /app and /site-walk.
 */

import { useCallback, useId, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { mobileTokens } from "./mobileTokens";
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
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const collapse = useCallback(() => setExpanded(false), []);
  const toggle = useCallback(() => setExpanded((value) => !value), []);

  const dock = (
    <div
      className={cn(
        mobileTokens.mobileExpandablePanelOuter,
        expanded && mobileTokens.mobileExpandablePanelExpandedPosition,
      )}
    >
      <div
        data-testid="mobile-expandable-panel-frame"
        className={cn(
          mobileTokens.mobileExpandablePanelFrame,
          expanded
            ? cn(
                mobileTokens.mobileExpandablePanelExpandedHeight,
                mobileTokens.mobileExpandablePanelFrameExpanded,
              )
            : cn(
                mobileTokens.mobileExpandablePanelCollapsedHeight,
                "flex-1",
              ),
        )}
      >
        <div className={mobileTokens.mobileExpandablePanelChrome}>
          <button
            type="button"
            className={cn(
              "flex min-h-[28px] flex-1 flex-col items-center justify-center gap-1 py-1",
              mobileTokens.focusRing,
            )}
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={expanded ? "Collapse activity panel" : "Expand activity panel"}
            onClick={toggle}
          >
            <span className={mobileTokens.mobileExpandablePanelHandle} aria-hidden />
          </button>
          <button
            type="button"
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white",
              mobileTokens.focusRing,
            )}
            aria-expanded={expanded}
            aria-controls={panelId}
            aria-label={expanded ? "Collapse panel" : "Expand panel"}
            onClick={toggle}
          >
            {expanded ? (
              <ChevronDown className="size-5" aria-hidden />
            ) : (
              <ChevronUp className="size-5" aria-hidden />
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
              : mobileTokens.mobileExpandablePanelCollapsedBody
          }
          showBottomFade
          bottomFadeClassName={mobileTokens.mobileExpandablePanelFade}
        />
      </div>
    </div>
  );

  if (!upper) {
    return (
      <div
        data-expandable-panel-version="capped-spacer-v1"
        className={cn("relative flex h-full min-h-0 flex-1 flex-col", className)}
      >
        {dock}
      </div>
    );
  }

  return (
    <div
      data-expandable-panel-version="capped-spacer-v1"
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
      {/* Upper content at top; flex spacer grows between content and dock */}
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
        <div className={cn("shrink-0", mobileTokens.mobileShellDockGap)}>
          <div
            className={cn(
              "shrink-0",
              expanded && mobileTokens.mobileExpandablePanelCollapsedHeight,
            )}
          >
            {dock}
          </div>
        </div>
      </div>
    </div>
  );
}
