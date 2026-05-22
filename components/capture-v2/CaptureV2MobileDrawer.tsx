"use client";

import { ChevronDown, X } from "lucide-react";
import { useViewportInsets } from "@/lib/hooks/useViewportInsets";
import { CAPTURE_V2_LAYER_IDS, CAPTURE_V2_LAYERS } from "./layers";
import { CaptureV2DetailForm } from "./CaptureV2DetailForm";
import { CaptureV2PrimaryAction } from "./CaptureV2PrimaryAction";
import { CaptureV2SaveStatus } from "./CaptureV2SaveStatus";
import type { CaptureV2DrawerDetent } from "./useCaptureV2DetailDrawer";
import type { CaptureV2Loop } from "./useCaptureV2Loop";
import type { useCaptureV2DetailDrawer } from "./useCaptureV2DetailDrawer";

type DrawerHook = ReturnType<typeof useCaptureV2DetailDrawer>;

type Props = {
  loop: CaptureV2Loop;
  drawer: DrawerHook;
  presentation: "overlay" | "full";
  onClose?: () => void;
};

const DETENT_HEIGHT: Record<CaptureV2DrawerDetent, string> = {
  compact: "max-h-[24dvh]",
  default: "max-h-[48dvh]",
  expanded: "max-h-[min(88dvh,calc(100dvh-env(safe-area-inset-top)))]",
};

export function CaptureV2MobileDrawer({ loop, drawer, presentation, onClose }: Props) {
  const { keyboardOffset } = useViewportInsets();
  const {
    activeItem,
    draft,
    patchDraft,
    assignees,
    machineState,
    isDesktop,
    handlePrimaryAction,
    saveState,
    detailsSaving,
    detailSaveError,
    formatNotesWithAi,
    aiState,
    aiMessage,
  } = loop;

  if (!activeItem || !draft) return null;

  const { locationLabel, patchLocation, detent, cycleDetent, applyChip, chips } = drawer;
  const isCompact = detent === "compact" && presentation === "overlay";
  const isInline = presentation === "full";

  return (
    <div
      id={CAPTURE_V2_LAYER_IDS.logDrawer}
      className={`${CAPTURE_V2_LAYERS.drawer} pointer-events-auto flex flex-col border-white/10 bg-slate-950/97 backdrop-blur-xl md:hidden ${
        isInline
          ? "min-h-0 flex-1 overflow-hidden border-t"
          : `fixed inset-x-0 bottom-0 z-[45] rounded-t-[1.5rem] border-t shadow-[0_-20px_50px_rgba(0,0,0,0.45)] ${DETENT_HEIGHT[detent]}`
      }`}
      style={{ paddingBottom: keyboardOffset > 0 ? keyboardOffset : undefined }}
      aria-label="Capture details"
    >
      <div className="flex shrink-0 items-center gap-2 px-3 pb-2 pt-2">
        <button
          type="button"
          onClick={cycleDetent}
          className="inline-flex h-9 flex-1 flex-col items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] px-2"
          aria-label="Change drawer height"
        >
          <span className="h-1 w-10 rounded-full bg-white/25" />
          <span className="mt-1 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider text-slate-500">
            {detent} <ChevronDown className="h-3 w-3" />
          </span>
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-white/80"
            aria-label="Collapse drawer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4">
        <div className="shrink-0 pb-2">
          <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300/80">
            Log Entry
          </p>
          <h2 className="truncate text-base font-black text-white">
            {draft.title || activeItem.title || "Captured stop"}
          </h2>
          <CaptureV2SaveStatus
            saveState={saveState}
            detailSaveError={detailSaveError}
            detailsSaving={detailsSaving}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar pb-2">
          <CaptureV2DetailForm
            draft={draft}
            locationLabel={locationLabel}
            assignees={assignees}
            tradeOptions={drawer.tradeSettings.trades}
            compact={isCompact && detent === "compact"}
            onPatch={patchDraft}
            onLocationChange={patchLocation}
            onApplyChip={applyChip}
            chips={chips}
          />

          {detent !== "compact" && (
            <button
              type="button"
              disabled={aiState === "formatting" || !draft.notes.trim()}
              onClick={() => void formatNotesWithAi()}
              className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 text-sm font-black text-amber-100 disabled:opacity-60"
            >
              {aiState === "formatting" ? "Formatting…" : "AI Format Note"}
            </button>
          )}

          {aiMessage && detent !== "compact" && (
            <p className="mt-2 rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-100">
              {aiMessage}
            </p>
          )}
        </div>

        <div
          className="shrink-0 border-t border-white/10 bg-slate-950/95 pt-3"
          style={{
            paddingBottom: `max(${keyboardOffset}px, env(safe-area-inset-bottom, 0px), 0.75rem)`,
          }}
        >
          <CaptureV2PrimaryAction
            state={machineState}
            isDesktop={isDesktop}
            onAction={handlePrimaryAction}
          />
        </div>
      </div>
    </div>
  );
}
