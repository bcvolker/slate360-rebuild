"use client";

import { useMemo } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";
import { PlanViewerLeaflet } from "./PlanViewerLeaflet";
import { PlanViewerPdf } from "./PlanViewerPdf";

type Props = {
  projectId?: string | null;
  sessionId?: string;
  planSets?: SiteWalkPlanSet[];
  sheets?: SiteWalkPlanSheet[];
  items?: { id: string; title?: string; description?: string | null }[];
  onCaptureRequest?: (input: "camera" | "upload") => void;
  onSelectItem?: (itemId: string) => void;
};

export function PlanViewer(props: Props) {
  const isMobile = useIsMobile();

  const activePlanSet = useMemo(
    () => props.planSets?.find((set) => set.processing_status === "ready") ?? props.planSets?.[0] ?? null,
    [props.planSets]
  );

  const planSheets = useMemo(
    () => (activePlanSet ? props.sheets?.filter((sheet) => sheet.plan_set_id === activePlanSet.id) ?? [] : []),
    [activePlanSet, props.sheets]
  );

  // Mobile: always use Leaflet (it handles server-rasterized WebP and browser-side PDF rendering).
  // Desktop: Leaflet OR the PDF viewer depending on what's available.
  const usingLeaflet = isMobile;

  // Mobile without a plan set → show "upload a plan" screen.
  // When a plan set exists, PlanViewerLeaflet handles its own loading/rendering state.
  if (isMobile && !activePlanSet) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center">
        <div>
          <p className="text-base font-black text-white">No plan uploaded</p>
          <p className="mt-1 text-xs font-semibold text-slate-400">Upload a plan from the walk setup screen.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {usingLeaflet ? (
        <PlanViewerLeaflet {...props} />
      ) : (
        <PlanViewerPdf {...props} />
      )}
    </div>
  );
}

