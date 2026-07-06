"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSiteWalkSession } from "@/components/site-walk/SiteWalkSessionProvider";
import { CAPTURE_CANVAS_SHELL_ENABLED } from "@/lib/site-walk/capture-v2-config";
import { hasReadyPlanSet } from "@/lib/site-walk/capture-v2-fork";
import { usePlanSheetsRealtime } from "@/lib/hooks/usePlanSheetsRealtime";
import { CaptureV2DesktopStudio } from "./CaptureV2DesktopStudio";
import { CaptureV2MobileField } from "./CaptureV2MobileField";
import { WalkStartSheet } from "./WalkStartSheet";
import { NoPlansCaptureCanvas } from "./NoPlansCaptureCanvas";
import { WithPlansCaptureCanvas } from "./plan-canvas/WithPlansCaptureCanvas";
import { useCaptureV2Loop } from "./useCaptureV2Loop";
import { useCaptureV2MobileFork } from "./useCaptureV2MobileFork";
import type { CaptureV2UiPhase } from "./types";
import type { CaptureV2Session } from "./session-types";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";

type Props = {
  session: CaptureV2Session;
  showPlanCanvas: boolean;
  showStartChoice: boolean;
  autoOpenCamera: boolean;
  launchId: string | null;
  initialItemId: string | null;
  planSets: SiteWalkPlanSet[];
  planSheets: SiteWalkPlanSheet[];
  isDesktop: boolean;
  photo360Entitled?: boolean;
  returnFromSummary?: boolean;
};

function resolveInitialPhase(props: Props): CaptureV2UiPhase {
  if (props.autoOpenCamera) return "viewfinder";
  if (props.initialItemId) return "drawer";
  return "hub";
}

/**
 * Explains WHY camera mode was landed on when a project is attached but no ready
 * plan exists to walk on — never shown when the user explicitly picked "Walk
 * without plan" (that only happens once a ready plan already exists to decline).
 * See docs/audit/PLANS_WALK_TRACE.md.
 */
function resolvePlanStatusNotice(showPlanCanvas: boolean, planSets: SiteWalkPlanSet[]): string | null {
  if (!showPlanCanvas || hasReadyPlanSet(planSets)) return null;
  if (planSets.length === 0) {
    return "No plans yet for this project — add plans from desktop, then start a walk with drawings.";
  }
  const failedOnly = planSets.every((set) => set.processing_status === "failed");
  if (failedOnly) {
    return "Plan conversion failed for this project — re-upload from desktop, or continue without pins.";
  }
  const converting = planSets.filter(
    (set) => set.processing_status === "pending" || set.processing_status === "processing",
  ).length;
  return `${converting} plan${converting === 1 ? "" : "s"} still converting — capturing without pins for now.`;
}

export function CaptureV2Orchestrator(props: Props) {
  const {
    session,
    showPlanCanvas,
    showStartChoice,
    planSets,
    planSheets,
    launchId,
    initialItemId,
    isDesktop,
    autoOpenCamera,
    photo360Entitled = false,
    returnFromSummary = false,
  } = props;

  const { capturedItems } = useSiteWalkSession();
  const loop = useCaptureV2Loop({
    sessionId: session.id,
    projectId: session.project_id,
    initialItemId,
    launchId,
  });

  const { fork, choosePlan, chooseCamera } = useCaptureV2MobileFork({
    sessionId: session.id,
    showPlanCanvas,
    showStartChoice,
    planSets,
    shellEnabled: CAPTURE_CANVAS_SHELL_ENABLED,
    isDesktop,
    existingStopCount: capturedItems.length,
  });

  const openedCameraRef = useRef(false);
  const [phase, setPhase] = useState<CaptureV2UiPhase>(() => resolveInitialPhase(props));
  const [activeAngleId, setActiveAngleId] = useState<string | null>(null);
  const [savingNext, setSavingNext] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);

  const useNoPlansCanvas =
    CAPTURE_CANVAS_SHELL_ENABLED && !isDesktop && (!showPlanCanvas || fork === "camera");
  const useWithPlansCanvas =
    CAPTURE_CANVAS_SHELL_ENABLED && showPlanCanvas && !isDesktop && fork === "plan";
  const planStatusNotice = useMemo(
    () => resolvePlanStatusNotice(showPlanCanvas, planSets),
    [showPlanCanvas, planSets],
  );
  const livePlanSheets = usePlanSheetsRealtime(planSheets, session.project_id);

  useEffect(() => {
    // Native auto-open is a legacy-mobile-field fallback only. With the canvas
    // shell enabled on mobile, the live canvas owns the camera — firing here
    // races the async fork resolution and pops the iOS native camera on launch.
    if (CAPTURE_CANVAS_SHELL_ENABLED && !isDesktop) return;
    if (!autoOpenCamera || isDesktop || openedCameraRef.current || useNoPlansCanvas) return;
    openedCameraRef.current = true;
    loop.openPickerDirect("camera", "quick_capture");
  }, [autoOpenCamera, isDesktop, loop, useNoPlansCanvas]);

  async function handleSaveAndNext() {
    setSavingNext(true);
    try {
      const saved = await loop.saveAndNextStop();
      if (!saved) return; // error stays visible; do not advance phase
      setActiveAngleId(null);
      setPhase(isDesktop ? "hub" : "viewfinder");
    } finally {
      setSavingNext(false);
    }
  }

  function handleAddAnotherAngle() {
    setNotesFocused(false);
    setPhase("viewfinder");
    loop.addAnotherAngle();
  }

  if (isDesktop) {
    return (
      <CaptureV2DesktopStudio
        session={session}
        loop={loop}
        planSets={planSets}
        planSheets={livePlanSheets}
        showPlanCanvas={showPlanCanvas}
        savingNext={savingNext}
        onSaveAndNext={handleSaveAndNext}
      />
    );
  }

  if (fork === "choice") {
    const walkLabel =
      session.project_name?.trim() || session.title?.trim() || "Walk with drawings";
    const readyPlanCount = planSets.filter((set) => set.processing_status === "ready").length;
    return (
      <WalkStartSheet
        walkLabel={walkLabel}
        readyPlanCount={readyPlanCount}
        onWalkOnPlans={choosePlan}
        onCameraOnly={chooseCamera}
      />
    );
  }

  if (useNoPlansCanvas) {
    const contextLabel = session.is_ad_hoc
      ? "Quick Walk"
      : session.project_name?.trim() || "Walk";
    return (
      <NoPlansCaptureCanvas
        session={session}
        loop={loop}
        contextLabel={contextLabel}
        photo360Entitled={photo360Entitled}
        returnFromSummary={returnFromSummary}
        planStatusNotice={planStatusNotice}
      />
    );
  }

  if (useWithPlansCanvas) {
    return (
      <WithPlansCaptureCanvas
        session={session}
        loop={loop}
        planSets={planSets}
        planSheets={livePlanSheets}
        photo360Entitled={photo360Entitled}
      />
    );
  }

  return (
    <CaptureV2MobileField
      session={session}
      loop={loop}
      phase={phase}
      setPhase={setPhase}
      activeAngleId={activeAngleId}
      setActiveAngleId={setActiveAngleId}
      notesFocused={notesFocused}
      setNotesFocused={setNotesFocused}
      savingNext={savingNext}
      onSaveAndNext={handleSaveAndNext}
      onAddAnotherAngle={handleAddAnotherAngle}
    />
  );
}
