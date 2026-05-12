"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
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
  const [retryMessage, setRetryMessage] = useState<string | null>(null);

  const activePlanSet = useMemo(
    () => props.planSets?.find((set) => set.processing_status === "ready") ?? props.planSets?.[0] ?? null,
    [props.planSets]
  );

  const planSheets = useMemo(
    () => (activePlanSet ? props.sheets?.filter((sheet) => sheet.plan_set_id === activePlanSet.id) ?? [] : []),
    [activePlanSet, props.sheets]
  );

  const hasRasterized = planSheets.length > 0 && planSheets.some((s) => s.rasterized_key != null);
  // On mobile: always use Leaflet (or show processing state). Never fall back to React-PDF on mobile.
  const usingLeaflet = isMobile && hasRasterized;

  async function handleRetryRasterization() {
    if (!activePlanSet) return;
    setRetrying(true);
    setRetryMessage(null);
    try {
      const response = await fetch(`/api/site-walk/plan-sets/${encodeURIComponent(activePlanSet.id)}/rasterize`, { method: "POST" });
      if (!response.ok) {
        const js = await response.json().catch(() => null) as { error?: string } | null;
        setRetryMessage(`Failed: ${js?.error ?? response.statusText}`);
      } else {
        setRetryMessage("Processing started — the plan will appear automatically when ready.");
      }
    } catch (e: unknown) {
      setRetryMessage(`Network error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setRetrying(false);
    }
  }

  // Mobile without a rasterized image → show a processing screen.
  // Never show React-PDF on mobile (it crashes with touch gestures).
  if (isMobile && !hasRasterized) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
        <div>
          <p className="text-base font-black text-white">
            {activePlanSet ? "Processing plan…" : "No plan set found"}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {activePlanSet
              ? "The plan is being converted for mobile. It will appear here automatically — no refresh needed."
              : "Upload a plan from the walk setup screen."}
          </p>
        </div>
        {activePlanSet && (
          <button
            onClick={() => void handleRetryRasterization()}
            disabled={retrying}
            className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {retrying ? "Starting…" : "Re-process plan"}
          </button>
        )}
        {retryMessage && (
          <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300">
            {retryMessage}
          </p>
        )}
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

