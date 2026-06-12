"use client";

import { useEffect, useState } from "react";
import { Camera, Check, Paperclip, Trash2, X } from "lucide-react";
import type { PhotoAttachmentFile, PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import { captureCanvasGlass } from "./capture-canvas-glass-tokens";
import { CaptureV2PinAttachmentThumb } from "./CaptureV2PinAttachmentThumb";

type Props = {
  pin: PhotoAttachmentPin;
  labelDraft: string;
  noteDraft: string;
  confirmDelete: boolean;
  recentlyAttachedFileId: string | null;
  onLabelChange: (value: string) => void;
  onLabelCommit: () => void;
  onNoteChange: (value: string) => void;
  onNoteCommit: () => void;
  onConfirm: () => void;
  onCancel: () => void;
  onAttachFile: () => void;
  onAttachPhoto: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onOpenAttachment: (file: PhotoAttachmentFile) => void;
};

const MIN_TAP_PX = 44;

/** Keyboard inset via visualViewport so the centered modal is never covered on iOS. */
function useKeyboardInset() {
  const [inset, setInset] = useState(0);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const update = () =>
      setInset(Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop));
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
    };
  }, []);
  return inset;
}

export function CaptureV2PhotoPinCard({
  pin,
  labelDraft,
  noteDraft,
  confirmDelete,
  recentlyAttachedFileId,
  onLabelChange,
  onLabelCommit,
  onNoteChange,
  onNoteCommit,
  onConfirm,
  onCancel,
  onAttachFile,
  onAttachPhoto,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  onOpenAttachment,
}: Props) {
  const keyboardInset = useKeyboardInset();

  return (
    <div
      className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-black/45 px-4"
      style={{ paddingBottom: keyboardInset }}
      data-capture-chrome="pin-popover"
      onPointerDown={(event) => event.stopPropagation()}
      // Closes only via the ✓ / X buttons — backdrop taps are intentionally inert.
      role="dialog"
      aria-modal="true"
      aria-label={`Pin details for ${pin.label || "untitled pin"}`}
    >
      <div
        className={`${captureCanvasGlass.surface} ${captureCanvasGlass.radiusLg} w-[300px] max-w-full overflow-hidden shadow-2xl`}
      >
        <div className="flex items-start gap-2 border-b border-[var(--mobile-app-card-border)] px-3 py-2">
          <input
            value={labelDraft}
            onChange={(event) => onLabelChange(event.target.value)}
            onBlur={onLabelCommit}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                onLabelCommit();
              }
            }}
            placeholder="Untitled"
            className="min-h-11 min-w-0 flex-1 rounded-lg border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_65%,transparent)] px-3 text-sm font-semibold text-[var(--graphite-text-header)] outline-none focus:border-[var(--graphite-primary)]"
            aria-label="Pin label"
            data-capture-chrome="pin-label-input"
          />
          <button
            type="button"
            onClick={onConfirm}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--graphite-primary)] text-[var(--graphite-canvas)] transition active:scale-[0.98]"
            style={{ width: MIN_TAP_PX, height: MIN_TAP_PX }}
            aria-label="Save pin details"
            data-capture-chrome="pin-popover-accept"
          >
            <Check className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex shrink-0 items-center justify-center rounded-lg text-[var(--graphite-text-header)] transition active:scale-[0.98]"
            style={{ width: MIN_TAP_PX, height: MIN_TAP_PX }}
            aria-label="Cancel pin edits"
            data-capture-chrome="pin-popover-close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-[var(--mobile-app-card-border)] px-3 py-2">
          <textarea
            value={noteDraft}
            onChange={(event) => onNoteChange(event.target.value)}
            onBlur={onNoteCommit}
            placeholder="Add a note…"
            rows={2}
            className="w-full resize-none rounded-lg border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_65%,transparent)] px-3 py-2 text-sm text-[var(--graphite-text-body)] outline-none placeholder:text-[var(--graphite-muted)] focus:border-[var(--graphite-primary)]"
            aria-label="Pin note"
            data-capture-chrome="pin-note-input"
          />
        </div>

        {confirmDelete ? (
          <div className="space-y-2 px-3 py-3">
            <p className="text-center text-sm font-medium text-[var(--graphite-text-body)]">Delete this pin?</p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onDeleteCancel}
                className="min-h-11 flex-1 rounded-lg border border-[var(--mobile-app-card-border)] text-sm font-semibold text-[var(--graphite-text-header)]"
                data-capture-chrome="pin-action-row"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onDeleteConfirm}
                className="min-h-11 flex-1 rounded-lg bg-[var(--destructive)] text-sm font-bold text-white"
                data-capture-chrome="pin-action-row"
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 overflow-x-auto no-scrollbar">
              {pin.files.map((file) => (
                <CaptureV2PinAttachmentThumb
                  key={file.id}
                  file={file}
                  showSuccess={recentlyAttachedFileId === file.id}
                  onOpen={onOpenAttachment}
                />
              ))}
              <button
                type="button"
                onClick={onAttachPhoto}
                className="inline-flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--mobile-app-card-border)] text-[var(--graphite-primary)] transition active:scale-[0.98]"
                aria-label="Attach photo"
                data-capture-chrome="pin-action-row"
              >
                <Camera className="h-4 w-4" />
                <span className="text-[8px] font-semibold text-[var(--graphite-muted)]">Photo</span>
              </button>
              <button
                type="button"
                onClick={onAttachFile}
                className="inline-flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg border border-dashed border-[var(--mobile-app-card-border)] text-[var(--graphite-primary)] transition active:scale-[0.98]"
                aria-label="Attach file"
                data-capture-chrome="pin-action-row"
              >
                <Paperclip className="h-4 w-4" />
                <span className="text-[8px] font-semibold text-[var(--graphite-muted)]">File</span>
              </button>
            </div>
            <button
              type="button"
              onClick={onDeleteRequest}
              className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-[var(--destructive)] transition active:scale-[0.98]"
              aria-label="Delete pin"
              data-capture-chrome="pin-action-row"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
