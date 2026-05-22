"use client";

import { useEffect, useRef, useState } from "react";
import { CaptureV2DesktopStudio } from "./CaptureV2DesktopStudio";
import { CaptureV2MobileField } from "./CaptureV2MobileField";
import { useCaptureV2Loop } from "./useCaptureV2Loop";
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
};

function resolveInitialPhase(props: Props): CaptureV2UiPhase {
  if (props.autoOpenCamera) return "viewfinder";
  if (props.initialItemId) return "drawer";
  return "hub";
}

export function CaptureV2Orchestrator(props: Props) {
  const {
    session,
    showPlanCanvas,
    planSets,
    planSheets,
    launchId,
    initialItemId,
    isDesktop,
    autoOpenCamera,
  } = props;

  const loop = useCaptureV2Loop({
    sessionId: session.id,
    projectId: session.project_id,
    initialItemId,
    launchId,
  });

  const openedCameraRef = useRef(false);
  const [phase, setPhase] = useState<CaptureV2UiPhase>(() => resolveInitialPhase(props));
  const [activeAngleId, setActiveAngleId] = useState<string | null>(null);
  const [savingNext, setSavingNext] = useState(false);
  const [notesFocused, setNotesFocused] = useState(false);

  useEffect(() => {
    if (!autoOpenCamera || isDesktop || openedCameraRef.current) return;
    openedCameraRef.current = true;
    loop.openPickerDirect("camera", "quick_capture");
  }, [autoOpenCamera, isDesktop, loop]);

  async function handleVoiceNoteOnly() {
    await loop.startVoiceNoteOnly();
    setPhase("drawer");
  }

  async function handleSaveAndNext() {
    setSavingNext(true);
    try {
      await loop.saveAndNextStop();
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
        planSheets={planSheets}
        showPlanCanvas={showPlanCanvas}
        savingNext={savingNext}
        onSaveAndNext={handleSaveAndNext}
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
      onVoiceNoteOnly={handleVoiceNoteOnly}
      onAddAnotherAngle={handleAddAnotherAngle}
    />
  );
}
