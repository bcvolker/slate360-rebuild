"use client";

import { useCallback } from "react";
import type { CaptureV2Loop } from "@/components/capture-v2/useCaptureV2Loop";

type PlanPinFlow = {
  projectLabel: string;
  stopNumber: number;
  onReturnToPlan: () => void;
};

export function usePlanPinCaptureActions(
  loop: CaptureV2Loop,
  planPinFlow: PlanPinFlow | null,
  setDetailsOpen: (open: boolean) => void,
  setActiveAngleId: (id: string | null) => void,
  setActiveTool: (tool: "markup" | "angle" | null) => void,
  detailsOpen: boolean,
) {
  const handleShutterTapCaptured = useCallback(async () => {
    if (planPinFlow) {
      const flushed = await loop.flushDetails();
      if (!flushed) return; // error surfaced via banner; stay put
      planPinFlow.onReturnToPlan();
      setActiveAngleId(null);
      setActiveTool(null);
      setDetailsOpen(false);
      return;
    }
    const saved = await loop.saveAndNextStop();
    if (!saved) return;
    setActiveAngleId(null);
    setActiveTool(null);
  }, [loop, planPinFlow, setActiveAngleId, setActiveTool, setDetailsOpen]);

  const handleReviewBackForPlan = useCallback(() => {
    if (!planPinFlow) return false;
    if (detailsOpen) {
      setDetailsOpen(false);
      return true;
    }
    planPinFlow.onReturnToPlan();
    return true;
  }, [detailsOpen, planPinFlow, setDetailsOpen]);

  return { handleShutterTapCaptured, handleReviewBackForPlan };
}
