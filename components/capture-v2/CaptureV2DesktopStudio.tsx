"use client";

import { useState, type ChangeEvent, type DragEvent } from "react";
import { ImagePlus, Upload } from "lucide-react";
import { PlanViewerLeaflet } from "@/components/site-walk/capture/PlanViewerLeaflet";
import { CaptureV2DesktopInspector } from "./CaptureV2DesktopInspector";
import { CaptureV2Filmstrip } from "./CaptureV2Filmstrip";
import { CaptureV2Viewfinder } from "./CaptureV2Viewfinder";
import { FastTrackActionBar } from "./FastTrackActionBar";
import { useCaptureV2DetailDrawer } from "./useCaptureV2DetailDrawer";
import type { CaptureV2Session } from "./session-types";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";
import type { CaptureV2Loop } from "./useCaptureV2Loop";

type Props = {
  session: CaptureV2Session;
  loop: CaptureV2Loop;
  planSets: SiteWalkPlanSet[];
  planSheets: SiteWalkPlanSheet[];
  showPlanCanvas: boolean;
  savingNext: boolean;
  onSaveAndNext: () => Promise<void>;
};

export function CaptureV2DesktopStudio({
  session,
  loop,
  planSets,
  planSheets,
  showPlanCanvas,
  savingNext,
  onSaveAndNext,
}: Props) {
  const drawer = useCaptureV2DetailDrawer(loop, session.project_id, "expanded");
  const [dragActive, setDragActive] = useState(false);
  const [activeAngleId, setActiveAngleId] = useState<string | null>(null);
  const [notesFocused, setNotesFocused] = useState(false);

  const planItems = loop.items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
  }));

  function handleFilmstripSelect(item: CaptureItemRecord) {
    loop.focusFilmstripItem(item);
    setActiveAngleId(null);
  }

  function onDesktopFilesChange(event: ChangeEvent<HTMLInputElement>) {
    event.stopPropagation();
    const files = event.currentTarget.files;
    event.currentTarget.value = "";
    if (!files?.length) return;
    loop.handleMultiFileDrop(Array.from(files));
  }

  function onDesktopDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();
    setDragActive(false);
    const files = Array.from(event.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (files.length === 0) return;
    loop.handleMultiFileDrop(files);
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <section className="relative flex min-h-0 w-[60%] flex-col overflow-hidden border-r border-white/[0.07] bg-zinc-950">
          {showPlanCanvas && session.project_id ? (
            <PlanViewerLeaflet
              projectId={session.project_id}
              sessionId={session.id}
              planSets={planSets}
              sheets={planSheets}
              items={planItems}
              onCaptureRequest={(input) => loop.openPickerDirect(input, "quick_capture")}
              onSelectItem={(itemId) => {
                const target = loop.items.find(
                  (item) => item.id === itemId || item.client_item_id === itemId,
                );
                if (target) handleFilmstripSelect(target);
              }}
            />
          ) : (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center bg-zinc-950 px-8 text-center">
              <p className="text-sm font-semibold text-slate-400">
                Link a worksite plan room to pin captures on sheet coordinates.
              </p>
            </div>
          )}
        </section>

        <aside className="flex min-h-0 w-[40%] flex-col overflow-hidden bg-slate-900/50 backdrop-blur-xl">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDesktopDrop}
            className={`mx-4 mt-4 flex min-h-[140px] shrink-0 flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-8 text-center transition ${
              dragActive
                ? "border-[var(--graphite-primary)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)]"
                : "border-white/[0.12] bg-white/[0.03]"
            }`}
          >
            <Upload className="mb-3 h-8 w-8 text-slate-400" aria-hidden />
            <p className="text-base font-semibold text-white">Drop photos here</p>
            <p className="mt-1 max-w-xs text-xs leading-5 text-slate-400">
              Drag files from desktop or email — previews appear instantly while upload continues
              in the background.
            </p>
            <button
              type="button"
              onClick={() => loop.desktopMultiInputRef.current?.click()}
              disabled={loop.busy}
              className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[var(--graphite-primary)] px-5 text-sm font-semibold text-[var(--graphite-canvas)] disabled:opacity-60"
            >
              <ImagePlus className="h-4 w-4" aria-hidden />
              Select from computer
            </button>
          </div>

          {loop.activePreview ? (
            <div className="relative mx-4 mt-3 min-h-[200px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-zinc-950">
              <CaptureV2Viewfinder
                sessionId={session.id}
                loop={loop}
                activeAngleId={activeAngleId}
                notesFocused={notesFocused}
              />
              <FastTrackActionBar
                loop={loop}
                activeAngleId={activeAngleId}
                onSelectAngle={setActiveAngleId}
                onOpenDrawer={() => setNotesFocused(true)}
                onSaveAndNext={() => void onSaveAndNext()}
                saving={savingNext}
              />
            </div>
          ) : null}

          <div className="min-h-0 flex-1 overflow-hidden">
            <CaptureV2DesktopInspector loop={loop} drawer={drawer} />
          </div>
        </aside>
      </div>

      <CaptureV2Filmstrip loop={loop} onSelectItem={handleFilmstripSelect} />

      <input
        ref={loop.desktopMultiInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onClick={loop.resetFileInputClick}
        onChange={onDesktopFilesChange}
      />
      <input
        ref={loop.cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onClick={loop.resetFileInputClick}
        onChange={(event) => loop.handleDirectFileChange(event, false)}
      />
      <input
        ref={loop.uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onClick={loop.resetFileInputClick}
        onChange={(event) => loop.handleDirectFileChange(event, false)}
      />
    </>
  );
}
