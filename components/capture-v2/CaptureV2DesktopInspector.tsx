"use client";

import { CaptureV2DetailForm } from "./CaptureV2DetailForm";
import { CaptureV2PrimaryAction } from "./CaptureV2PrimaryAction";
import { CaptureV2SaveStatus } from "./CaptureV2SaveStatus";
import type { useCaptureV2DetailDrawer } from "./useCaptureV2DetailDrawer";
import type { CaptureV2Loop } from "./useCaptureV2Loop";

type DrawerHook = ReturnType<typeof useCaptureV2DetailDrawer>;

type Props = {
  loop: CaptureV2Loop;
  drawer: DrawerHook;
};

export function CaptureV2DesktopInspector({ loop, drawer }: Props) {
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

  if (!activeItem || !draft) {
    return (
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-semibold text-slate-400">
          Capture a photo first. Details autosave against the active item.
        </p>
      </div>
    );
  }

  const { locationLabel, patchLocation, applyChip, chips } = drawer;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 border-b border-white/5 px-4 pb-3 pt-4">
        <p className="text-[11px] font-black uppercase tracking-[0.22em] text-[var(--graphite-primary)]">
          Inspector
        </p>
        <h2 className="mt-1 truncate text-lg font-black text-white">
          {draft.title || activeItem.title}
        </h2>
        <CaptureV2SaveStatus
          saveState={saveState}
          detailSaveError={detailSaveError}
          detailsSaving={detailsSaving}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 no-scrollbar">
        <CaptureV2DetailForm
          draft={draft}
          locationLabel={locationLabel}
          assignees={assignees}
          tradeOptions={drawer.tradeSettings.trades}
          onPatch={patchDraft}
          onLocationChange={patchLocation}
          onApplyChip={applyChip}
          chips={chips}
        />

        <button
          type="button"
          disabled={aiState === "formatting" || !draft.notes.trim()}
          onClick={() => void formatNotesWithAi()}
          className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-2xl border border-[color-mix(in_srgb,var(--graphite-primary)_30%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] px-4 text-sm font-black text-[var(--graphite-primary)] disabled:opacity-60"
        >
          {aiState === "formatting" ? "Formatting…" : "AI Format Note"}
        </button>

        {aiMessage && (
          <p className="mt-2 rounded-2xl border border-white/10 bg-white/[0.05] px-3 py-2 text-xs font-bold text-[var(--graphite-muted)]">
            {aiMessage}
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-white/10 bg-slate-950/95 px-4 py-3">
        <CaptureV2PrimaryAction
          state={machineState}
          isDesktop={isDesktop}
          onAction={handlePrimaryAction}
        />
      </div>
    </div>
  );
}
