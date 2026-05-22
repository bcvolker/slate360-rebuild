"use client";

import { AlertTriangle, Camera, FileText, ShieldAlert } from "lucide-react";
import { getCaptureImageUrl } from "@/lib/site-walk/capture-image-url";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import { CaptureV2ItemSyncBadge } from "./CaptureV2SyncBadge";
import {
  deriveCaptureV2ItemSyncKind,
  itemHasUnsavedDraft,
} from "./capture-v2-item-sync";
import { CAPTURE_V2_STATUS_RING_CLASS } from "./types";

type Props = {
  item: CaptureItemRecord;
  stopNumber: number;
  isActive: boolean;
  isOnline: boolean;
  saveState?: string;
  detailsSaving?: boolean;
  detailSaveError?: string | null;
  imageUrlOverride?: string | null;
  onSelect: () => void;
};

export function CaptureV2ItemThumb({
  item,
  stopNumber,
  isActive,
  isOnline,
  saveState,
  detailsSaving,
  detailSaveError,
  imageUrlOverride,
  onSelect,
}: Props) {
  const imageUrl = imageUrlOverride ?? getCaptureImageUrl(item);
  const syncKind = deriveCaptureV2ItemSyncKind({
    item,
    isActive,
    saveState,
    detailsSaving,
    detailSaveError,
    isOnline,
  });
  const unsaved = itemHasUnsavedDraft(isActive, saveState);
  const ringClass =
    CAPTURE_V2_STATUS_RING_CLASS[item.item_status] ?? "ring-slate-600";
  const label = item.title?.trim() || `Stop ${stopNumber}`;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isActive ? "true" : undefined}
      aria-label={`${label}, ${syncKind}${unsaved ? ", unsaved changes" : ""}`}
      className={`group relative flex w-[4.75rem] shrink-0 flex-col gap-1 rounded-2xl border p-1 text-left transition ${
        isActive
          ? "border-amber-400/70 bg-amber-500/15 shadow-lg shadow-amber-500/10"
          : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.06]"
      }`}
    >
      <div
        className={`relative aspect-[4/5] overflow-hidden rounded-xl bg-black/50 ring-[3px] ring-offset-2 ring-offset-slate-950 ${ringClass}`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-slate-500">
            {item.item_type === "text_note" ? (
              <FileText className="h-5 w-5" />
            ) : (
              <Camera className="h-5 w-5" />
            )}
          </div>
        )}

        <div className="absolute left-1 top-1 rounded-md bg-black/70 px-1 py-0.5 text-[9px] font-black text-white">
          #{stopNumber}
        </div>

        <div className="absolute right-1 top-1">
          {syncKind === "offline_queued" ? (
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-amber-400/50 bg-amber-500/20 text-amber-200 shadow-sm shadow-amber-500/30"
              title="Cached locally — not synced yet"
              aria-label="Cached locally — not synced yet"
            >
              <ShieldAlert className="h-3 w-3" />
            </span>
          ) : (
            <CaptureV2ItemSyncBadge kind={syncKind} compact />
          )}
        </div>

        {unsaved && (
          <div
            className="absolute bottom-1 left-1 inline-flex items-center gap-0.5 rounded-md bg-amber-500/90 px-1 py-0.5 text-[8px] font-black uppercase text-slate-950"
            title="Unsaved changes"
          >
            <AlertTriangle className="h-2.5 w-2.5" />
            Draft
          </div>
        )}
      </div>

      <p className="truncate px-0.5 text-[9px] font-bold leading-tight text-slate-300 group-hover:text-white">
        {label}
      </p>
    </button>
  );
}
