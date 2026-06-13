"use client";

import { useMemo, useState } from "react";
import { captureItemToDraft } from "@/lib/types/site-walk-capture";
import { DEV_MOCK_CAPTURE_ITEMS, DEV_MOCK_SESSION } from "@/lib/dev/mock-site-walk";
import { CaptureV2NoteReviewScreen } from "@/components/capture-v2/note-review/CaptureV2NoteReviewScreen";

type Props = {
  keyboardSim?: number;
};

export function DevNoteReviewSandbox({ keyboardSim }: Props) {
  const [sessionItems] = useState(DEV_MOCK_CAPTURE_ITEMS);
  const [activeId, setActiveId] = useState(DEV_MOCK_CAPTURE_ITEMS[0]!.id);
  const activeItem = sessionItems.find((item) => item.id === activeId) ?? sessionItems[0]!;
  const activeIndex = sessionItems.findIndex((item) => item.id === activeItem.id);
  const [draft, setDraft] = useState(() => captureItemToDraft(activeItem));
  const [activeAngleId, setActiveAngleId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const previousTags = useMemo(
    () => Array.from(new Set(sessionItems.flatMap((item) => item.tags ?? []))),
    [sessionItems],
  );

  return (
    <CaptureV2NoteReviewScreen
      stopNumber={activeIndex + 1}
      activeItem={activeItem}
      sessionId={DEV_MOCK_SESSION.id}
      sessionItems={sessionItems}
      draft={draft}
      assignees={[]}
      activeAngleId={activeAngleId}
      aiState="idle"
      aiMessage={null}
      saving={saving}
      keyboardSimOverride={keyboardSim}
      previousTags={previousTags}
      onPatchDraft={(patch) => setDraft((current) => ({ ...current, ...patch }))}
      onFormatNotesWithAi={() => {}}
      onSelectMain={() => setActiveAngleId(null)}
      onSelectAngle={(angleId) => setActiveAngleId(angleId)}
      onPromoteAngle={() => setActiveAngleId(null)}
      onAddAngle={() => {}}
      onBack={() => {}}
      onSave={() => {
        setSaving(true);
        window.setTimeout(() => setSaving(false), 400);
      }}
      onSaveAndNext={() => {}}
      onSelectStop={(item) => {
        setActiveId(item.id);
        setDraft(captureItemToDraft(item));
        setActiveAngleId(null);
      }}
    />
  );
}
