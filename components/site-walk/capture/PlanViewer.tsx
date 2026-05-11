"use client";

import { useMemo, useState } from "react";
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
  const [retrying, setRetrying] = useState(false);

  const activePlanSet = useMemo(
    () => props.planSets?.find((set) => set.processing_status === "ready") ?? props.planSets?.[0] ?? null,
    [props.planSets]
  );
  
  const planSheets = useMemo(
    () => (activePlanSet ? props.sheets?.filter((sheet) => sheet.plan_set_id === activePlanSet.id) ?? [] : []),
    [activePlanSet, props.sheets]
  );

  const hasRasterized = planSheets.length > 0 && planSheets.some((s) => s.rasterized_key != null);
  const usingLeaflet = isMobile && hasRasterized;

  async function handleRetryRasterization() {
    if (!activePlanSet) return;
    setRetrying(true);
    try {
      const response = await fetch(`/api/site-walk/plan-sets/${encodeURIComponent(activePlanSet.id)}/rasterize`, { method: "POST" });
      if (!response.ok) {
        let msg = response.statusText;
        try {
          const js = await response.json();
          if (js.error) msg = js.error;
        } catch(e) {}
        alert(`Rasterization failed: ${response.status} ${msg}`);
      } else {
        alert("Rasterization succeeded! Please refresh the page.");
      }
    } catch (e: any) {
      alert(`Rasterization network error: ${e.message}`);
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="relative h-full w-full">
      <div className="absolute top-0 left-0 z-50 p-1 flex gap-2 items-start pointer-events-none">
        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded shadow-xl ${usingLeaflet ? 'bg-emerald-500 text-black' : 'bg-rose-500 text-white'}`}>
          {usingLeaflet ? '[ USING: LEAFLET ]' : '[ USING: REACT-PDF ]'}
        </span>
        {isMobile && !hasRasterized && activePlanSet && (
          <button 
            onClick={handleRetryRasterization}
            disabled={retrying}
            className="pointer-events-auto bg-amber-500 text-black text-[10px] font-black px-1.5 py-0.5 rounded shadow-xl"
          >
            {retrying ? "RETRYING..." : "[ RETRY RASTERIZATION ]"}
          </button>
        )}
      </div>

      {usingLeaflet ? (
        <PlanViewerLeaflet {...props} />
      ) : (
        <PlanViewerPdf {...props} />
      )}
    </div>
  );
}
