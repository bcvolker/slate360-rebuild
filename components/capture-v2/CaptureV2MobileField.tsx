"use client";

import { useEffect } from "react";
import { CaptureV2ActionHub } from "./CaptureV2ActionHub";
import { CaptureV2DetailDrawer } from "./CaptureV2DetailDrawer";
import { CaptureV2Filmstrip } from "./CaptureV2Filmstrip";
import { CaptureV2Viewfinder } from "./CaptureV2Viewfinder";
import { FastTrackActionBar } from "./FastTrackActionBar";
import type { CaptureV2Session } from "./session-types";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import type { CaptureV2Loop } from "./useCaptureV2Loop";
import type { CaptureV2UiPhase } from "./types";

type Props = {
  session: CaptureV2Session;
  loop: CaptureV2Loop;
  phase: CaptureV2UiPhase;
  setPhase: (phase: CaptureV2UiPhase) => void;
  activeAngleId: string | null;
  setActiveAngleId: (id: string | null) => void;
  notesFocused: boolean;
  setNotesFocused: (focused: boolean) => void;
  savingNext: boolean;
  onSaveAndNext: () => Promise<void>;
  onVoiceNoteOnly: () => Promise<void>;
  onAddAnotherAngle: () => void;
};

export function CaptureV2MobileField({
  session,
  loop,
  phase,
  setPhase,
  activeAngleId,
  setActiveAngleId,
  notesFocused,
  setNotesFocused,
  savingNext,
  onSaveAndNext,
  onVoiceNoteOnly,
  onAddAnotherAngle,
}: Props) {
  const showHubOverlay = !loop.activePreview && phase !== "drawer";
  const showCaptureChrome = Boolean(loop.activePreview) || phase === "drawer";

  useEffect(() => {
    if (loop.activePreview && phase !== "viewfinder" && phase !== "drawer") {
      setPhase("viewfinder");
    }
  }, [loop.activePreview, phase, setPhase]);

  function handleFilmstripSelect(item: CaptureItemRecord) {
    loop.focusFilmstripItem(item);
    setActiveAngleId(null);
    setPhase("viewfinder");
  }

  return (
    <>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <CaptureV2Viewfinder
          sessionId={session.id}
          loop={loop}
          activeAngleId={activeAngleId}
          notesFocused={notesFocused}
        />

        {showHubOverlay && (
          <CaptureV2ActionHub
            loop={loop}
            onVoiceNoteOnly={() => void onVoiceNoteOnly()}
          />
        )}

        {showCaptureChrome && (
          <>
            {loop.activePreview && (
              <FastTrackActionBar
                loop={loop}
                activeAngleId={activeAngleId}
                onSelectAngle={setActiveAngleId}
                onOpenDrawer={() => setPhase("drawer")}
                onSaveAndNext={() => void onSaveAndNext()}
                saving={savingNext}
              />
            )}

            {phase === "viewfinder" && loop.activeItem && (
              <CaptureV2DetailDrawer
                loop={loop}
                projectId={session.project_id}
                mode="mobile-overlay"
                notesFocused={notesFocused}
                onNotesFocusChange={setNotesFocused}
                onAddAnotherAngle={onAddAnotherAngle}
                onClose={() => setPhase("viewfinder")}
              />
            )}

            {phase === "drawer" && (
              <CaptureV2DetailDrawer
                loop={loop}
                projectId={session.project_id}
                mode="mobile-full"
                initialDetent="expanded"
                notesFocused={notesFocused}
                onNotesFocusChange={setNotesFocused}
                onAddAnotherAngle={onAddAnotherAngle}
                onClose={() => setPhase(loop.activePreview ? "viewfinder" : "hub")}
              />
            )}
          </>
        )}
      </div>

      <CaptureV2Filmstrip loop={loop} onSelectItem={handleFilmstripSelect} />

      <CaptureV2HiddenFileInputs loop={loop} />
    </>
  );
}

function CaptureV2HiddenFileInputs({ loop }: { loop: CaptureV2Loop }) {
  return (
    <>
      <input
        ref={loop.cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onClick={loop.resetFileInputClick}
        onChange={(event) => loop.handleDirectFileChange(event, false)}
      />
      <input
        ref={loop.uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onClick={loop.resetFileInputClick}
        onChange={(event) => loop.handleDirectFileChange(event, false)}
      />
    </>
  );
}
