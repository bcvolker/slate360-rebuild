"use client";

import { useCallback, useEffect, useState } from "react";
import {
  hasReadyPlanSet,
  persistCaptureV2Fork,
  readStoredCaptureV2Fork,
  type CaptureV2MobileFork,
} from "@/lib/site-walk/capture-v2-fork";
import type { SiteWalkPlanSet } from "@/lib/types/site-walk";

type Args = {
  sessionId: string;
  showPlanCanvas: boolean;
  showStartChoice: boolean;
  planSets: SiteWalkPlanSet[];
  shellEnabled: boolean;
  isDesktop: boolean;
  existingStopCount: number;
};

function resolveInitialFork(args: Args): CaptureV2MobileFork {
  const forkEligible =
    args.shellEnabled &&
    !args.isDesktop &&
    args.showStartChoice &&
    args.showPlanCanvas &&
    hasReadyPlanSet(args.planSets);

  if (!forkEligible) return args.showPlanCanvas ? "plan" : "camera";
  if (args.existingStopCount > 0) return "plan";
  return readStoredCaptureV2Fork(args.sessionId) ?? "choice";
}

export function useCaptureV2MobileFork(args: Args) {
  const [fork, setFork] = useState<CaptureV2MobileFork>(() => resolveInitialFork(args));

  useEffect(() => {
    if (fork === "choice" && args.existingStopCount > 0) {
      setFork("plan");
    }
  }, [args.existingStopCount, fork]);

  const choosePlan = useCallback(() => {
    persistCaptureV2Fork(args.sessionId, "plan");
    setFork("plan");
  }, [args.sessionId]);

  const chooseCamera = useCallback(() => {
    persistCaptureV2Fork(args.sessionId, "camera");
    setFork("camera");
  }, [args.sessionId]);

  return { fork, choosePlan, chooseCamera };
}
