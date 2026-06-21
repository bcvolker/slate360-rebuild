"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { CaptureAssignee, CaptureItemDraft, CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { CaptureV2NoteField } from "./CaptureV2NoteField";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import { getItemPhotoAngles, getPhotoAngleImageUrl } from "@/lib/site-walk/photo-angles";
import { CaptureV2NoteReviewActionBar } from "./CaptureV2NoteReviewActionBar";
import { CaptureV2NoteReviewAngleStrip } from "./CaptureV2NoteReviewAngleStrip";
import { CaptureV2NoteReviewPhotoViewer } from "./CaptureV2NoteReviewPhotoViewer";
import { CaptureV2NoteReviewStopStrip } from "./CaptureV2NoteReviewStopStrip";
import { CaptureV2NoteReviewTags } from "./CaptureV2NoteReviewTags";
import { CaptureV2NoteReviewTopBar } from "./CaptureV2NoteReviewTopBar";
import { CaptureV2NoteReviewTracking } from "./CaptureV2NoteReviewTracking";
import { CaptureV2VoiceMemosSection } from "./CaptureV2VoiceMemosSection";
import { noteReviewTokens } from "./capture-v2-note-review-tokens";
import { useCaptureV2NoteDictation } from "./useCaptureV2NoteDictation";
import { useCaptureV2NoteReviewViewport } from "./useCaptureV2NoteReviewViewport";
import { useCaptureV2VoiceMemos } from "./useCaptureV2VoiceMemos";

const ACTION_BAR_HEIGHT_PX = 60;
const ACCESSORY_BAR_HEIGHT_PX = 52;
const PINNED_FOOTER_PX = ACTION_BAR_HEIGHT_PX + ACCESSORY_BAR_HEIGHT_PX;

export type CaptureV2NoteReviewScreenProps = {
  stopNumber: number;
  activeItem: CaptureItemRecord;
  sessionId: string;
  sessionItems: CaptureItemRecord[];
  draft: CaptureItemDraft;
  assignees: CaptureAssignee[];
  activeAngleId: string | null;
  aiState: "idle" | "formatting" | "blocked" | "error";
  aiMessage: string | null;
  saving: boolean;
  saveError?: string | null;
  keyboardSimOverride?: number;
  previousTags?: string[];
  onPatchDraft: (patch: Partial<CaptureItemDraft>) => void;
  onFormatNotesWithAi: () => void;
  onSelectMain: () => void;
  onSelectAngle: (angleId: string) => void;
  onPromoteAngle: (angleId: string) => void;
  onAddAngle: () => void;
  onBack: () => void;
  onSave: () => void;
  onSaveAndNext: () => void;
  onSelectStop?: (item: CaptureItemRecord) => void;
};

export function CaptureV2NoteReviewScreen({
  stopNumber,
  activeItem,
  sessionId,
  sessionItems,
  draft,
  assignees,
  activeAngleId,
  aiState,
  aiMessage,
  saving,
  saveError = null,
  keyboardSimOverride,
  previousTags,
  onPatchDraft,
  onFormatNotesWithAi,
  onSelectMain,
  onSelectAngle,
  onPromoteAngle,
  onAddAngle,
  onBack,
  onSave,
  onSaveAndNext,
  onSelectStop,
}: CaptureV2NoteReviewScreenProps) {
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const { keyboardOffset } = useCaptureV2NoteReviewViewport({ keyboardSimOverride });
  const [photoViewerOpen, setPhotoViewerOpen] = useState(false);
  const [stripOpen, setStripOpen] = useState(false);

  const viewerImage = useMemo(() => {
    if (activeAngleId) {
      const angle = getItemPhotoAngles(activeItem).find((entry) => entry.id === activeAngleId);
      return {
        url: getPhotoAngleImageUrl(activeItem, activeAngleId),
        label: angle?.label ?? "Angle",
      };
    }
    return { url: getCaptureImageUrl(activeItem), label: null };
  }, [activeAngleId, activeItem]);

  const dictation = useCaptureV2NoteDictation({
    notes: draft.notes,
    onNotesChange: (value) => onPatchDraft({ notes: value }),
  });

  const appendNote = useCallback(
    (text: string) => {
      const base = draft.notes.trim();
      onPatchDraft({ notes: base ? `${base}\n\n${text}` : text });
    },
    [draft.notes, onPatchDraft],
  );

  const voiceMemos = useCaptureV2VoiceMemos({
    sessionId,
    parentItemId: activeItem.id,
    sessionItems,
    onAppendNote: appendNote,
  });

  const tagPool = useMemo(() => {
    const fromItems = sessionItems.flatMap((item) => item.tags ?? []);
    return Array.from(new Set([...(previousTags ?? []), ...fromItems]));
  }, [previousTags, sessionItems]);

  const scrollPadBottom = keyboardOffset + PINNED_FOOTER_PX + 12;

  return (
    <div
      className={`relative flex h-full min-h-0 max-h-full flex-col overflow-hidden ${noteReviewTokens.canvas}`}
      data-note-review="screen"
      data-keyboard-offset={keyboardOffset}
    >
      <CaptureV2NoteReviewTopBar
        stopNumber={stopNumber}
        onBack={onBack}
        stripOpen={stripOpen}
        onToggleStrip={
          onSelectStop && sessionItems.length > 1 ? () => setStripOpen((v) => !v) : undefined
        }
      />

      {onSelectStop ? (
        <CaptureV2NoteReviewStopStrip
          open={stripOpen && sessionItems.length > 1}
          items={sessionItems}
          activeItemId={activeItem.id}
          onSelectStop={(item) => {
            setStripOpen(false);
            if (item.id !== activeItem.id) onSelectStop(item);
          }}
        />
      ) : null}

      {activeItem.item_type === "photo" ? (
        <CaptureV2NoteReviewAngleStrip
          item={activeItem}
          activeAngleId={activeAngleId}
          onSelectMain={() => {
            onSelectMain();
            setPhotoViewerOpen(true);
          }}
          onSelectAngle={(angleId) => {
            onSelectAngle(angleId);
            setPhotoViewerOpen(true);
          }}
          onPromoteAngle={onPromoteAngle}
          onAddAngle={onAddAngle}
        />
      ) : null}

      <div
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar"
        data-note-review="scroll"
        style={{ paddingBottom: scrollPadBottom }}
      >
        <CaptureV2NoteField
          notes={draft.notes}
          onNotesChange={(value) => onPatchDraft({ notes: value })}
          onNotesFocus={() => {}}
          onNotesBlur={() => {}}
          notesRef={notesRef}
          dictationError={dictation.error}
          aiMessage={aiMessage}
          dictationRecording={dictation.recording}
          dictationTranscribing={dictation.transcribing}
          dictationDisabled={dictation.disabled}
          onToggleDictation={dictation.toggleDictation}
        />
        <CaptureV2VoiceMemosSection
          rows={voiceMemos.rows}
          recording={voiceMemos.recording}
          busy={voiceMemos.busy}
          error={voiceMemos.error}
          onStartRecord={() => void voiceMemos.startMemo()}
          onStopRecord={() => void voiceMemos.stopAndSaveMemo()}
          onSaveTranscript={(memoId, transcript) => void voiceMemos.saveTranscript(memoId, transcript)}
          onDeleteMemo={(memoId, keep) => void voiceMemos.deleteMemo(memoId, keep)}
        />
        <CaptureV2NoteReviewTracking draft={draft} assignees={assignees} onPatch={onPatchDraft} />
        <CaptureV2NoteReviewTags
          tags={draft.tags}
          previousTags={tagPool}
          onChange={(tags) => onPatchDraft({ tags })}
        />
      </div>

      {saveError ? (
        <p
          role="alert"
          className="absolute inset-x-3 z-20 rounded-xl border border-red-500/40 bg-red-950/85 px-3 py-2 text-sm font-semibold text-red-200 backdrop-blur-md"
          style={{ bottom: keyboardOffset + PINNED_FOOTER_PX + 8 }}
        >
          {saveError}
        </p>
      ) : null}

      <CaptureV2NoteReviewPhotoViewer
        open={photoViewerOpen && activeItem.item_type === "photo"}
        imageUrl={viewerImage.url}
        stopNumber={stopNumber}
        angleLabel={viewerImage.label}
        onClose={() => setPhotoViewerOpen(false)}
      />

      {/* "Boost with AI" floating row removed — it was orphaned from the note
          field's voice-to-text and the rewrite backend isn't wired yet, so it
          read as a dead control. When ready it belongs inside CaptureV2NoteField
          beside the dictation button, not as a separate pinned row. */}

      <CaptureV2NoteReviewActionBar
        saving={saving}
        onSave={onSave}
        onSaveAndNext={onSaveAndNext}
        keyboardOffset={keyboardOffset}
      />
    </div>
  );
}
