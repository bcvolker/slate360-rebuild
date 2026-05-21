"use client";

/**
 * MobileExpandableTabbedPanel — collapsible activity dock for /app and /site-walk.
 *
 * Collapsed: compact tabbed preview above bottom nav (12px gap).
 * Expanded: overlays page content upward without resizing cards above.
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
  /** Scrollable page content above the dock (apps, actions, module intro). */
  upper?: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function MobileExpandableTabbedPanel({
  tabs,
  defaultTab,
  upper,
  className,
  bodyClassName,
}: MobileExpandableTabbedPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const panelId = useId();
  const collapse = useCallback(() => setExpanded(false), []);
  const toggle = useCallback(() => setExpanded((value) => !value), []);

  const dock = (
    <div
      className={cn(
        mobileTokens.expandablePanelOuter,
        expanded && mobileTokens.expandablePanelExpandedPosition,
        className,
      )}
    >
      <div className={cn(mobileTokens.expandablePanelDock, expanded && mobileTokens.expandablePanelDockExpanded)}>
        <div className={mobileTokens.expandablePanelChrome}>
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
            <span className={mobileTokens.expandablePanelHandle} aria-hidden />
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
          className={cn(
            "border-0 bg-transparent shadow-none",
            expanded
              ? mobileTokens.expandablePanelExpandedFrame
              : mobileTokens.expandablePanelCollapsedFrame,
          )}
          bodyClassName={cn(
            expanded
              ? mobileTokens.expandablePanelExpandedBody
              : mobileTokens.expandablePanelCollapsedBody,
            bodyClassName,
          )}
          showBottomFade={expanded}
        />
      </div>
    </div>
  );

  if (!upper) {
    return dock;
  }

  return (
    <div className={cn("relative flex min-h-0 flex-1 flex-col overflow-hidden", className)}>
      {expanded && (
        <button
          type="button"
          className={mobileTokens.expandablePanelBackdrop}
          aria-label="Close activity panel"
          onClick={collapse}
        />
      )}
      <div
        className={cn(
          "flex-1 min-h-0 overflow-y-auto overscroll-contain",
          mobileTokens.expandablePanelUpperScroll,
          expanded && "overflow-hidden",
        )}
      >
        {upper}
      </div>
      {dock}
    </div>
  );
}
