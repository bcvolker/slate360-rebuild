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
  preferredPlanSetId?: string | null;
};

function resolveInitialFork(args: Args): CaptureV2MobileFork {
  // An explicit deep-link pick (ProjectPlansTab "Start walk on this plan") always
  // wins — the user chose this exact plan, so land on the plan canvas and let it
  // show that set's real state (ready/processing/failed) instead of silently
  // falling back to camera mode just because it isn't ready yet.
  if (
    args.preferredPlanSetId &&
    args.showPlanCanvas &&
    args.planSets.some((set) => set.id === args.preferredPlanSetId)
  ) {
    return "plan";
  }

  const forkEligible =
    args.shellEnabled &&
    !args.isDesktop &&
    args.showStartChoice &&
    args.showPlanCanvas &&
    hasReadyPlanSet(args.planSets);

  // Only default into plan mode when there's an actual ready plan to show — a
  // project with zero (or not-yet-ready) plan sets must fall through to camera,
  // never into a plan canvas with nothing to render (docs/audit/PLANS_WALK_TRACE.md).
  if (!forkEligible) {
    return args.showPlanCanvas && hasReadyPlanSet(args.planSets) ? "plan" : "camera";
  }

  // A resumed session with an explicit stored choice always honors it — a walk
  // deliberately started camera-only must stay camera-only on resume, even once
  // the project has a ready plan. Only fall back to the "resuming with captured
  // stops implies plan mode" heuristic when nothing was ever explicitly chosen.
  const stored = readStoredCaptureV2Fork(args.sessionId);
  if (stored) return stored;
  if (args.existingStopCount > 0) return "plan";
  return "choice";
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
