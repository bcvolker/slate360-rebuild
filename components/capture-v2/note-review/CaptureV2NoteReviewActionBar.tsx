"use client";

import { ArrowRight, Loader2 } from "lucide-react";
import { noteReviewTokens } from "./capture-v2-note-review-tokens";

type Props = {
  saving: boolean;
  onSave: () => void;
  onSaveAndNext: () => void;
  keyboardOffset: number;
};

export function CaptureV2NoteReviewActionBar({
  saving,
  onSave,
  onSaveAndNext,
  keyboardOffset,
}: Props) {
  return (
    <footer
      className={`${noteReviewTokens.pinnedBar} ${noteReviewTokens.margin} py-2`}
      style={{
        bottom: keyboardOffset,
        paddingBottom: keyboardOffset > 0 ? 8 : "max(env(safe-area-inset-bottom), 8px)",
      }}
      data-note-review="action-bar"
    >
      <div className="flex w-full min-w-0 gap-2">
        <button
          type="button"
          data-testid="note-review-save"
          disabled={saving}
          onMouseDown={(event) => event.preventDefault()}
          onTouchStart={(event) => event.preventDefault()}
          onClick={onSave}
          className={noteReviewTokens.ghostButton}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
        </button>
        <button
          type="button"
          data-testid="note-review-save-next"
          disabled={saving}
          onMouseDown={(event) => event.preventDefault()}
          onTouchStart={(event) => event.preventDefault()}
          onClick={onSaveAndNext}
          className={noteReviewTokens.primaryButton}
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save & next stop"}
          {!saving && <ArrowRight className="h-4 w-4" />}
        </button>
      </div>
    </footer>
  );
}
