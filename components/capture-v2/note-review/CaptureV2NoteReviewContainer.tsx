"use client";

import { useCallback, useMemo } from "react";
import { CaptureV2NoteReviewScreen } from "./CaptureV2NoteReviewScreen";
import type { CaptureV2Loop } from "../useCaptureV2Loop";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";

type Props = {
  loop: CaptureV2Loop;
  sessionId: string;
  stopNumber: number;
  activeAngleId: string | null;
  keyboardSimOverride?: number;
  onSelectMain: () => void;
  onSelectAngle: (angleId: string) => void;
  onPromoteAngle: (angleId: string) => void;
  onAddAngle: () => void;
  onBack: () => void;
};

export function CaptureV2NoteReviewContainer({
  loop,
  sessionId,
  stopNumber,
  activeAngleId,
  keyboardSimOverride,
  onSelectMain,
  onSelectAngle,
  onPromoteAngle,
  onAddAngle,
  onBack,
}: Props) {
  const {
    activeItem,
    draft,
    patchDraft,
    assignees,
    formatNotesWithAi,
    aiState,
    aiMessage,
    detailsSaving,
    busy,
    flushDetails,
    flushCurrentDraft,
    saveAndNextStop,
    focusFilmstripItem,
    items,
  } = loop;

  const previousTags = useMemo(
    () => Array.from(new Set(items.flatMap((item) => item.tags ?? []).filter(Boolean))),
    [items],
  );

  const handleSave = useCallback(async () => {
    await flushDetails();
    await flushCurrentDraft();
  }, [flushCurrentDraft, flushDetails]);

  const handleSaveAndNext = useCallback(async () => {
    const saved = await saveAndNextStop();
    if (saved) onBack();
  }, [onBack, saveAndNextStop]);

  const handleSelectStop = useCallback(
    async (item: CaptureItemRecord) => {
      // Persist the current stop's draft before switching so nothing is lost.
      await flushCurrentDraft();
      focusFilmstripItem(item);
    },
    [flushCurrentDraft, focusFilmstripItem],
  );

  if (!activeItem || !draft) return null;

  return (
    <CaptureV2NoteReviewScreen
      stopNumber={stopNumber}
      activeItem={activeItem}
      sessionId={sessionId}
      sessionItems={items}
      draft={draft}
      assignees={assignees}
      activeAngleId={activeAngleId}
      aiState={aiState}
      aiMessage={aiMessage}
      saving={detailsSaving || busy}
      saveError={loop.detailSaveError}
      keyboardSimOverride={keyboardSimOverride}
      previousTags={previousTags}
      onPatchDraft={patchDraft}
      onFormatNotesWithAi={() => void formatNotesWithAi()}
      onSelectMain={onSelectMain}
      onSelectAngle={onSelectAngle}
      onPromoteAngle={onPromoteAngle}
      onAddAngle={onAddAngle}
      onBack={onBack}
      onSave={() => void handleSave()}
      onSaveAndNext={() => void handleSaveAndNext()}
      onSelectStop={(item) => void handleSelectStop(item)}
    />
  );
}
