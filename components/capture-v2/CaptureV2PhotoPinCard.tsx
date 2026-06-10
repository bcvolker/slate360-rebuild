"use client";

import { MoreHorizontal, Paperclip, Trash2, X } from "lucide-react";
import type { PhotoAttachmentFile, PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import { captureCanvasGlass } from "./capture-canvas-glass-tokens";
import { CaptureV2PinAttachmentThumb } from "./CaptureV2PinAttachmentThumb";

type Props = {
  pin: PhotoAttachmentPin;
  labelDraft: string;
  confirmDelete: boolean;
  overflowOpen: boolean;
  recentlyAttachedFileId: string | null;
  style: { left: number; top: number };
  onLabelChange: (value: string) => void;
  onLabelCommit: () => void;
  onClose: () => void;
  onAttachFile: () => void;
  onAttachPhoto: () => void;
  onDeleteRequest: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
  onOverflowToggle: () => void;
  onFocusLabel: () => void;
  onOpenAttachment: (file: PhotoAttachmentFile) => void;
};

const MIN_TAP_PX = 44;

export function CaptureV2PhotoPinCard({
  pin,
  labelDraft,
  confirmDelete,
  overflowOpen,
  recentlyAttachedFileId,
  style,
  onLabelChange,
  onLabelCommit,
  onClose,
  onAttachFile,
  onAttachPhoto,
  onDeleteRequest,
  onDeleteConfirm,
  onDeleteCancel,
  onOverflowToggle,
  onFocusLabel,
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
            onClick={onOverflowToggle}
            className="inline-flex shrink-0 items-center justify-center rounded-lg text-[var(--graphite-muted)] transition active:scale-[0.98]"
            style={{ width: MIN_TAP_PX, height: MIN_TAP_PX }}
            aria-label="More options"
            aria-expanded={overflowOpen}
          >
            <MoreHorizontal className="h-5 w-5" />
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

        {overflowOpen ? (
          <button
            type="button"
            onClick={onFocusLabel}
            className="flex min-h-11 w-full items-center px-4 text-left text-sm font-medium text-[var(--graphite-text-body)] transition hover:bg-[color-mix(in_srgb,var(--graphite-primary)_8%,transparent)]"
            data-capture-chrome="pin-action-row"
          >
            Edit label
          </button>
        ) : null}

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
