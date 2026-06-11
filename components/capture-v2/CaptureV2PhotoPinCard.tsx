"use client";

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
  style: { left: number; top: number };
  onLabelChange: (value: string) => void;
  onLabelCommit: () => void;
  onNoteChange: (value: string) => void;
  onNoteCommit: () => void;
  onClose: () => void;
  onAttachFile: () => void;
  onAttachPhoto: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onOpenAttachment: (file: PhotoAttachmentFile) => void;
};

const MIN_TAP_PX = 44;

export function CaptureV2PhotoPinCard({
  pin,
  labelDraft,
  noteDraft,
  confirmDelete,
  recentlyAttachedFileId,
  style,
  onLabelChange,
  onLabelCommit,
  onNoteChange,
  onNoteCommit,
  onClose,
  onAttachFile,
  onAttachPhoto,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  onOpenAttachment,
}: Props) {
  return (
    <div
      className="pointer-events-auto fixed z-40 w-[280px]"
      style={{ left: style.left, top: style.top, transform: "translateX(-50%)" }}
      data-capture-chrome="pin-popover"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div
        className={`${captureCanvasGlass.surface} ${captureCanvasGlass.radiusLg} overflow-hidden shadow-2xl`}
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
            onClick={onClose}
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-[var(--graphite-primary)] text-[var(--graphite-canvas)] transition active:scale-[0.98]"
            style={{ width: MIN_TAP_PX, height: MIN_TAP_PX }}
            aria-label="Save pin"
            data-capture-chrome="pin-popover-accept"
          >
            <Check className="h-5 w-5" strokeWidth={2.5} />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex shrink-0 items-center justify-center rounded-lg text-[var(--graphite-text-header)] transition active:scale-[0.98]"
            style={{ width: MIN_TAP_PX, height: MIN_TAP_PX }}
            aria-label="Close pin card"
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
