"use client";

import { Paperclip, Trash2, X } from "lucide-react";
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
      className="pointer-events-auto fixed z-[4000] w-[280px]"
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
          <div className="flex flex-col">
            <button
              type="button"
              onClick={onAttachFile}
              className="flex min-h-11 items-center gap-2 px-4 text-left text-sm font-medium text-[var(--graphite-text-header)] transition hover:bg-[color-mix(in_srgb,var(--graphite-primary)_8%,transparent)]"
              data-capture-chrome="pin-action-row"
            >
              <Paperclip className="h-4 w-4 text-[var(--graphite-primary)]" />
              Attach file
            </button>
            <button
              type="button"
              onClick={onAttachPhoto}
              className="flex min-h-11 items-center gap-2 px-4 text-left text-sm font-medium text-[var(--graphite-text-header)] transition hover:bg-[color-mix(in_srgb,var(--graphite-primary)_8%,transparent)]"
              data-capture-chrome="pin-action-row"
            >
              <Paperclip className="h-4 w-4 text-[var(--graphite-primary)]" />
              Attach photo
            </button>
            <button
              type="button"
              onClick={onDeleteRequest}
              className="flex min-h-11 items-center gap-2 px-4 text-left text-sm font-medium text-[var(--destructive)] transition hover:bg-[color-mix(in_srgb,var(--destructive)_10%,transparent)]"
              data-capture-chrome="pin-action-row"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        )}

        {pin.files.length > 0 ? (
          <div className="flex flex-wrap gap-2 border-t border-[var(--mobile-app-card-border)] px-3 py-3">
            {pin.files.map((file) => (
              <CaptureV2PinAttachmentThumb
                key={file.id}
                file={file}
                showSuccess={recentlyAttachedFileId === file.id}
                onOpen={onOpenAttachment}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
