"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { CaptureAssignee, CaptureItemDraft, CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { CaptureV2NoteAccessoryRow } from "./CaptureV2NoteAccessoryRow";
import { CaptureV2NoteField } from "./CaptureV2NoteField";
import { CaptureV2NoteReviewActionBar } from "./CaptureV2NoteReviewActionBar";
import { CaptureV2NoteReviewAngleStrip } from "./CaptureV2NoteReviewAngleStrip";
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
}: CaptureV2NoteReviewScreenProps) {
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const { keyboardOffset } = useCaptureV2NoteReviewViewport({ keyboardSimOverride });

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
      <CaptureV2NoteReviewTopBar stopNumber={stopNumber} onBack={onBack} />

      {activeItem.item_type === "photo" ? (
        <CaptureV2NoteReviewAngleStrip
          item={activeItem}
          activeAngleId={activeAngleId}
          onSelectMain={onSelectMain}
          onSelectAngle={onSelectAngle}
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

      <CaptureV2NoteAccessoryRow
        aiState={aiState}
        notesEmpty={!draft.notes.trim()}
        onBoostWithAi={onFormatNotesWithAi}
        keyboardOffset={keyboardOffset}
        actionBarHeightPx={ACTION_BAR_HEIGHT_PX}
      />

      <CaptureV2NoteReviewActionBar
        saving={saving}
        onSave={onSave}
        onSaveAndNext={onSaveAndNext}
        keyboardOffset={keyboardOffset}
      />
    </div>
  );
}
