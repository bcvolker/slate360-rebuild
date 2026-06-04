"use client";

import { useEffect } from "react";
import { PlanViewerLeaflet } from "@/components/site-walk/capture/PlanViewerLeaflet";
import { ensureCaptureTypesInstalled } from "@/lib/site-walk/capture-types";
import { CAPTURE_CANVAS_SHELL_ENABLED } from "@/lib/site-walk/capture-v2-config";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { CaptureV2Viewfinder } from "./CaptureV2Viewfinder";
import { CaptureStopFilmstrip } from "./CaptureStopFilmstrip";
import { CAPTURE_V2_LAYER_IDS, CAPTURE_V2_LAYERS } from "./layers";
import type { CaptureV2Loop } from "./useCaptureV2Loop";

export type CaptureCanvasLayer = "plan" | "camera";

export type CaptureCanvasShellProps = {
  loop: CaptureV2Loop;
  sessionId: string;
  layer: CaptureCanvasLayer;
  projectId?: string | null;
  planSets?: SiteWalkPlanSet[];
  planSheets?: SiteWalkPlanSheet[];
  items?: CaptureItemRecord[];
  activeAngleId?: string | null;
  notesFocused?: boolean;
  onSelectItem?: (item: CaptureItemRecord) => void;
  defaultTrackerCollapsed?: boolean;
  onPlanCaptureRequest?: (input: "camera" | "upload") => void;
};

export function CaptureCanvasShell(props: CaptureCanvasShellProps) {
  if (!CAPTURE_CANVAS_SHELL_ENABLED) return null;
  return <CaptureCanvasShellInner {...props} />;
}

function CaptureCanvasShellInner({
  loop,
  sessionId,
  layer,
  projectId = null,
  planSets = [],
  planSheets = [],
  items = [],
  activeAngleId = null,
  notesFocused = false,
  onSelectItem,
  defaultTrackerCollapsed = false,
  onPlanCaptureRequest,
}: CaptureCanvasShellProps) {
  useEffect(() => {
    ensureCaptureTypesInstalled();
  }, []);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--graphite-canvas)]">
      <div className={`relative min-h-0 flex-1 ${CAPTURE_V2_LAYERS.canvas}`} id={CAPTURE_V2_LAYER_IDS.canvasBase}>
        {layer === "plan" && projectId ? (
          <PlanViewerLeaflet
            projectId={projectId}
            sessionId={sessionId}
            planSets={planSets}
            sheets={planSheets}
            items={items.length > 0 ? items : loop.items}
            onCaptureRequest={onPlanCaptureRequest}
            onSelectItem={(itemId) => {
              const target = loop.items.find((row) => row.id === itemId);
              if (target) (onSelectItem ?? loop.focusFilmstripItem)(target);
            }}
          />
        ) : (
          <CaptureV2Viewfinder
            sessionId={sessionId}
            loop={loop}
            activeAngleId={activeAngleId}
            notesFocused={notesFocused}
          />
        )}
      </div>

      <CaptureStopFilmstrip
        loop={loop}
        defaultCollapsed={defaultTrackerCollapsed}
        onSelectItem={onSelectItem ?? loop.focusFilmstripItem}
      />
    </div>
  );
}
