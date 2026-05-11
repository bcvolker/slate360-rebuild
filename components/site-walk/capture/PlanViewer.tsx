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

  const hasRasterized = planSheets.length > 0 && planSheets.some((s) => s.rasterized_key != null);

  if (isMobile && hasRasterized) {
    return <PlanViewerLeaflet {...props} />;
  }

  return <PlanViewerPdf {...props} />;
}
