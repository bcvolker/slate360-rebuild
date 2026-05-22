"use client";

import type { CaptureV2Loop } from "./useCaptureV2Loop";
import { CaptureV2PrimaryAction } from "./CaptureV2PrimaryAction";
import { draftHasContent } from "./capture-v2-state-machine";

type Props = {
  loop: CaptureV2Loop;
};

export function CaptureV2DetailDrawer({ loop }: Props) {
  const {
    activeItem,
    draft,
    patchDraft,
    saveState,
    machineState,
    isDesktop,
    handlePrimaryAction,
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

  return (
    <div
      id="capture-v2-log-drawer"
      className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-[max(env(safe-area-inset-bottom),1rem)] pt-4"
    >
      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300/80">
        Log Entry
      </p>
      <h2 className="mt-2 truncate text-xl font-black text-white">{activeItem.title}</h2>
      <p className="mt-1 text-xs font-bold uppercase tracking-wider text-slate-500">
        Save state · {saveState}
      </p>

      <label className="mt-4 block text-left">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Title</span>
        <input
          value={draft.title}
          onChange={(event) => patchDraft({ title: event.target.value })}
          className="mt-1 w-full rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-semibold text-white outline-none ring-amber-400/40 focus:ring-2"
        />
      </label>

      <label className="mt-3 block min-h-0 flex-1 text-left">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Notes</span>
        <textarea
          value={draft.notes}
          onChange={(event) => patchDraft({ notes: event.target.value })}
          rows={6}
          className="mt-1 w-full min-h-[8rem] flex-1 resize-none rounded-2xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm font-semibold leading-6 text-white outline-none ring-amber-400/40 focus:ring-2"
          placeholder={draftHasContent(draft) ? undefined : "Add field notes for this stop"}
        />
      </label>

      {aiMessage && <p className="mt-2 text-xs font-semibold text-amber-200/80">{aiMessage}</p>}

      <div className="mt-4 shrink-0">
        <CaptureV2PrimaryAction
          state={machineState}
          isDesktop={isDesktop}
          onAction={handlePrimaryAction}
        />
      </div>
    </div>
  );
}
