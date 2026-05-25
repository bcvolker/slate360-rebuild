"use client";

/**
 * SlateDrop file picker — CaptureFlowClient integration
 * ----------------------------------------------------
 * 1. Pass `projectId` from the session row on the server page
 *    (`session.project_id`). Without it, browse-project is hidden.
 * 2. Long-press the photo reference (650ms) or tap "Attach from project"
 *    to open `SlateDropFilePickerModal`.
 * 3. Selected files land in local `attachedFiles` state. To persist, extend
 *    `CaptureStopDraftPayload` in `lib/site-walk-v2/capture-stop-drafts.ts`
 *    with `attachedFiles: PhotoAttachmentFile[]` and wire through
 *    `useCaptureFlowPersistence` save/load.
 * 4. Production Capture V2 already wires the same modal via
 *    `PhotoAttachmentPins` → long-press on photo → "Browse project".
 *    Pass `projectId` through `PhotoMarkupCanvas` (done in CaptureV2Viewfinder).
 */

import { useCallback, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  ArrowUpRight,
  Camera,
  ChevronRight,
  Circle,
  FolderOpen,
  Loader2,
  MapPin,
  Paperclip,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SlateDropFilePickerModal } from "@/components/slatedrop/SlateDropFilePickerModal";
import type { SlateDropPickerFile } from "@/lib/slatedrop/file-picker-types";
import type { PhotoAttachmentFile } from "@/lib/site-walk/photo-attachments";
import {
  CAPTURE_CLASSIFICATIONS,
  type CaptureFlowClientProps,
} from "./capture-flow-types";
import { useCaptureFlowPersistence } from "./useCaptureFlowPersistence";
import { useCaptureFlowPhoto } from "./useCaptureFlowPhoto";

export {
  CAPTURE_CLASSIFICATIONS,
  type CaptureClassification,
  type CaptureStopSummary,
  type MarkupTool,
} from "./capture-flow-types";

const TEAL = "#6EA7A0";
const glassPanel =
  "rounded-2xl border border-white/[0.06] bg-white/[0.04] backdrop-blur-xl";

export function CaptureFlowClient({
  sessionId,
  projectId = null,
  stopIndex: initialStopIndex = 0,
  stops = [
    { id: "1", label: "Entry", complete: false },
    { id: "2", label: "Level 2", complete: false },
    { id: "3", label: "Roof", complete: false },
  ],
}: CaptureFlowClientProps) {
  const photoRef = useRef<HTMLDivElement>(null);
  const longPressRef = useRef<number | null>(null);
  const pressOriginRef = useRef<{ x: number; y: number } | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<PhotoAttachmentFile[]>([]);
  const flow = useCaptureFlowPersistence({ sessionId, stops, initialStopIndex });
  const {
    stopIndex,
    stopLabel,
    notes,
    setNotes,
    classification,
    setClassification,
    photoPreviewUrl,
    setPhotoUpload,
    markupTool,
    setMarkupTool,
    pinPct,
    setPinPct,
    markupCount,
    setMarkupCount,
    hydrated,
    saveState,
    saveError,
    clearSaveError,
    handleSaveAndNext,
    handleStopSelect,
  } = flow;

  const photo = useCaptureFlowPhoto({
    sessionId,
    onUploaded: setPhotoUpload,
  });

  const handlePhotoTap = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!photoRef.current || markupTool !== "pin") return;
      const rect = photoRef.current.getBoundingClientRect();
      setPinPct({
        x: ((event.clientX - rect.left) / rect.width) * 100,
        y: ((event.clientY - rect.top) / rect.height) * 100,
      });
    },
    [markupTool, setPinPct],
  );

  const clearLongPress = useCallback(() => {
    if (longPressRef.current !== null) {
      window.clearTimeout(longPressRef.current);
      longPressRef.current = null;
    }
    pressOriginRef.current = null;
  }, []);

  const handlePhotoPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (!projectId) return;
      pressOriginRef.current = { x: event.clientX, y: event.clientY };
      longPressRef.current = window.setTimeout(() => {
        longPressRef.current = null;
        setPickerOpen(true);
        if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
          navigator.vibrate(12);
        }
      }, 650);
    },
    [projectId],
  );

  const handlePhotoPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const origin = pressOriginRef.current;
      if (!origin || longPressRef.current === null) return;
      if (Math.hypot(event.clientX - origin.x, event.clientY - origin.y) > 6) {
        clearLongPress();
      }
    },
    [clearLongPress],
  );

  const handlePhotoPointerUp = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);

  const handleAttachFromProject = useCallback((selected: SlateDropPickerFile[]) => {
    setAttachedFiles((current) => {
      const mapped: PhotoAttachmentFile[] = selected.map((file) => ({
        id: file.id,
        name: file.name,
        size: file.size,
        type: file.type || "application/octet-stream",
      }));
      return [...current, ...mapped].slice(0, 4);
    });
  }, []);

  const handleEmptyPhotoTap = useCallback(() => {
    if (!photoPreviewUrl) photo.openGallery();
  }, [photo, photoPreviewUrl]);

  const handleAddMarkup = () => {
    // PERSISTENCE: append shape to markup_data (see lib/site-walk/markup-types.ts).
    setMarkupCount((n) => n + 1);
  };

  const saving = saveState === "saving";
  const finishing = saveState === "finishing";
  const busy = saving || finishing;

  if (!hydrated) {
    return (
      <div className="flex h-full min-h-0 w-full flex-col items-center justify-center gap-3 bg-[#0B0F15] text-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-amber-400" strokeWidth={1.75} />
        <p className="text-sm font-medium text-zinc-300">Loading walk…</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden bg-[#0B0F15] text-slate-50">
      {finishing ? (
        <div
          className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 bg-[#0B0F15]/92 px-6 backdrop-blur-sm"
          aria-live="polite"
          aria-busy="true"
        >
          <Loader2 className="h-10 w-10 animate-spin text-amber-400" strokeWidth={1.75} />
          <p className="text-center text-sm font-semibold text-white">Saving captures and finishing walk…</p>
          <p className="text-center text-xs text-zinc-400">This may take a moment on slower connections.</p>
        </div>
      ) : null}
      <header className="shrink-0 border-b border-white/[0.06] px-4 pb-3 pt-[max(env(safe-area-inset-top),0.75rem)]">
        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#6EA7A0]">
          Site Walk Capture
        </p>
        <h1 className="mt-1 text-lg font-semibold text-white">{stopLabel}</h1>
        <p className="text-xs text-zinc-400">
          Stop {stopIndex + 1} of {flow.stops.length}
        </p>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          <section className={cn(glassPanel, "flex min-h-[180px] flex-1 flex-col p-3 sm:min-h-[220px]")}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-300">
                Photo reference
              </span>
              {markupCount > 0 ? (
                <span className="text-[10px] text-[#6EA7A0]">{markupCount} markup</span>
              ) : null}
            </div>
            <div
              ref={photoRef}
              role="button"
              tabIndex={0}
              onClick={(event) => {
                if (!photoPreviewUrl) {
                  handleEmptyPhotoTap();
                  return;
                }
                handlePhotoTap(event);
              }}
              onPointerDown={handlePhotoPointerDown}
              onPointerMove={handlePhotoPointerMove}
              onPointerUp={handlePhotoPointerUp}
              onPointerCancel={handlePhotoPointerUp}
              onKeyDown={(e) =>
                e.key === "Enter" &&
                handlePhotoTap(e as unknown as React.MouseEvent<HTMLDivElement>)
              }
              className={cn(
                "relative flex min-h-[140px] flex-1 cursor-crosshair items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/10 bg-black/30 touch-none",
                photoPreviewUrl && "border-solid border-white/[0.08]",
              )}
            >
              {photo.uploading ? (
                <div className="flex flex-col items-center gap-2 text-[#6EA7A0]">
                  <Camera className="h-8 w-8 animate-pulse" strokeWidth={1.5} />
                  <span className="text-xs">Uploading photo…</span>
                </div>
              ) : photoPreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoPreviewUrl} alt="Capture reference" className="h-full w-full object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 text-zinc-500">
                  <Camera className="h-8 w-8" strokeWidth={1.5} />
                  <span className="text-xs">Tap gallery or use capture button</span>
                </div>
              )}
              {pinPct ? (
                <span
                  className="absolute -translate-x-1/2 -translate-y-full"
                  style={{ left: `${pinPct.x}%`, top: `${pinPct.y}%` }}
                >
                  <MapPin className="h-7 w-7 drop-shadow-md" fill={TEAL} stroke={TEAL} />
                </span>
              ) : null}
            </div>
            {attachedFiles.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {attachedFiles.map((file) => (
                  <span
                    key={file.id}
                    className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-zinc-300"
                  >
                    <Paperclip className="h-3 w-3 shrink-0 text-amber-400" />
                    <span className="truncate">{file.name}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </section>

          <section className={cn(glassPanel, "flex min-h-[180px] flex-1 flex-col p-3 sm:min-h-[220px]")}>
            <label
              htmlFor="capture-notes"
              className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-300"
            >
              Notes
            </label>
            <textarea
              id="capture-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you observe at this stop?"
              className="min-h-[120px] flex-1 resize-none rounded-xl border border-white/[0.08] bg-black/25 px-3 py-2.5 text-sm leading-relaxed text-slate-100 placeholder:text-zinc-500 focus:border-[#6EA7A0]/40 focus:outline-none focus:ring-2 focus:ring-[#6EA7A0]/20 sm:min-h-[140px]"
            />
          </section>
        </div>

        <section className="mt-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-300">
            Classification
          </p>
          <div className="flex flex-wrap gap-2">
            {CAPTURE_CLASSIFICATIONS.map((item) => {
              const active = classification === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => setClassification(active ? null : item)}
                  className={cn(
                    "min-h-[44px] rounded-xl border px-4 text-sm font-medium transition-colors",
                    active
                      ? "border-[#6EA7A0]/50 bg-[#6EA7A0]/15 text-[#6EA7A0]"
                      : "border-white/[0.08] bg-white/[0.03] text-zinc-300 hover:border-white/15",
                  )}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-4">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-zinc-300">
            Pin &amp; markup
          </p>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["pin", MapPin, "Place pin"],
                ["rect", Square, "Box"],
                ["arrow", ArrowUpRight, "Arrow"],
              ] as const
            ).map(([tool, Icon, label]) => (
              <button
                key={tool}
                type="button"
                aria-label={label}
                onClick={() => setMarkupTool(tool)}
                className={cn(
                  "flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-xl border px-3 text-sm transition-colors",
                  markupTool === tool
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                    : "border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-zinc-200",
                )}
              >
                <Icon className="h-4 w-4" strokeWidth={1.75} />
                <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
            <button
              type="button"
              onClick={handleAddMarkup}
              disabled={!photoPreviewUrl || markupTool === "pin"}
              className="min-h-[44px] rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 text-sm text-zinc-300 disabled:opacity-40"
            >
              Add {markupTool}
            </button>
            {projectId ? (
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                disabled={attachedFiles.length >= 4}
                className="flex min-h-[44px] items-center gap-2 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 text-sm font-medium text-amber-200 disabled:opacity-40"
              >
                <FolderOpen className="h-4 w-4" />
                Attach from project
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Pin mode: tap the photo. Long-press photo to attach SlateDrop files.
            {projectId ? "" : " Link a project to enable project file browse."}
          </p>
        </section>
      </main>

      <footer className="shrink-0 border-t border-white/[0.06] bg-[#0B0F15]/95 px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-3 backdrop-blur-xl">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={photo.openCamera}
            disabled={photo.uploading || busy}
            aria-label="Capture photo"
            className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full border-2 border-[#6EA7A0]/40 bg-[#6EA7A0]/15 text-[#6EA7A0] shadow-[0_0_24px_rgba(110,167,160,0.15)] transition-transform active:scale-95 disabled:opacity-50"
          >
            <Circle className="h-10 w-10" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => {
              clearSaveError();
              void handleSaveAndNext();
            }}
            disabled={busy}
            className="flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-2xl bg-amber-500 text-base font-semibold text-slate-950 transition-colors hover:bg-amber-400 active:scale-[0.99] disabled:opacity-60"
          >
            {finishing ? "Finishing walk…" : saving ? "Saving…" : stopIndex + 1 >= flow.stops.length ? "Finish walk" : "Save & next"}
            <ChevronRight className="h-5 w-5" strokeWidth={2} />
          </button>
        </div>

        <nav aria-label="Previous stops" className="mt-3">
          <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {flow.stops.map((stop, index) => {
              const isCurrent = index === stopIndex;
              return (
                <button
                  key={stop.id}
                  type="button"
                  onClick={() => handleStopSelect(stop.id, index)}
                  className={cn(
                    "flex shrink-0 items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition-colors",
                    isCurrent
                      ? "border-[#6EA7A0]/50 bg-[#6EA7A0]/15 text-[#6EA7A0]"
                      : stop.complete
                        ? "border-white/10 bg-white/[0.05] text-zinc-300"
                        : "border-white/[0.06] bg-transparent text-zinc-500",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold",
                      isCurrent ? "bg-[#6EA7A0] text-[#0B0F15]" : "bg-white/10",
                    )}
                  >
                    {index + 1}
                  </span>
                  {stop.label}
                </button>
              );
            })}
          </div>
        </nav>
        {photo.uploadError ? (
          <p className="mt-2 text-xs text-red-400">{photo.uploadError}</p>
        ) : null}
        {saveError ? (
          <div className="mt-2 space-y-2">
            <p className="rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-200">
              {saveError}
            </p>
            {stopIndex + 1 >= flow.stops.length ? (
              <button
                type="button"
                onClick={() => {
                  clearSaveError();
                  void handleSaveAndNext();
                }}
                disabled={busy}
                className="w-full rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-100 disabled:opacity-60"
              >
                Retry finish walk
              </button>
            ) : null}
          </div>
        ) : null}
      </footer>

      <input
        ref={photo.cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onClick={photo.resetInput}
        onChange={photo.handleFileChange}
      />
      <input
        ref={photo.galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onClick={photo.resetInput}
        onChange={photo.handleFileChange}
      />

      <SlateDropFilePickerModal
        open={pickerOpen}
        projectId={projectId}
        maxFiles={4 - attachedFiles.length}
        onClose={() => setPickerOpen(false)}
        onConfirm={handleAttachFromProject}
        title="Attach from SlateDrop"
      />
    </div>
  );
}
