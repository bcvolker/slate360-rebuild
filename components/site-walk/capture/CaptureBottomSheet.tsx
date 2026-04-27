"use client";

import { useState } from "react";
import { ClipboardList, X } from "lucide-react";
import { CaptureItemForm } from "./CaptureItemForm";
import { CaptureItemListPanel } from "./CaptureItemListPanel";
import { publishCaptureItemFocus, useCaptureItemFocus } from "./capture-item-events";
import { useCaptureItems } from "./useCaptureItems";

type Props = {
  sessionId: string;
  projectId: string | null;
};

export function CaptureBottomSheet({ sessionId, projectId }: Props) {
  const [open, setOpen] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const { items, assignees, activeItem, draft, saveState, aiState, aiMessage, selectItem, patchDraft, formatNotesWithAi } = useCaptureItems({ sessionId, projectId });

  useCaptureItemFocus(() => setOpen(true));

  function handleSelect(item: typeof items[number]) {
    selectItem(item);
    setOpen(true);
    publishCaptureItemFocus({ item, reason: "selected" });
  }

  return (
    <section className={`fixed inset-x-0 bottom-0 z-40 max-h-[86dvh] overflow-y-auto rounded-t-[2rem] border border-slate-300 bg-white p-4 pb-[max(env(safe-area-inset-bottom),1rem)] shadow-2xl transition-transform focus-within:pb-[calc(max(env(safe-area-inset-bottom),1rem)+26dvh)] md:sticky md:top-4 md:max-h-[calc(100dvh-2rem)] md:rounded-3xl md:shadow-sm ${open || activeItem ? "translate-y-0" : "translate-y-[calc(100%-5.75rem)] md:translate-y-0"}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-blue-200 bg-blue-50 text-blue-800">
          <ClipboardList className="h-5 w-5" />
        </div>
        <button type="button" onClick={() => setOpen(true)} className="min-w-0 flex-1 text-left">
          <h2 className="font-black text-slate-950">Capture details</h2>
          <p className="text-xs font-medium text-slate-600">Classification, notes, assignee, and autosave.</p>
        </button>
        <button type="button" onClick={() => setOpen((current) => !current)} className="rounded-xl border border-slate-300 bg-white p-2 text-slate-700 hover:border-blue-300 hover:text-blue-800 md:hidden" aria-label={open ? "Collapse capture details" : "Open capture details"}>
          <X className={`h-4 w-4 transition ${open ? "rotate-0" : "rotate-45"}`} />
        </button>
      </div>

      <div className="mt-4 space-y-4">
        <CaptureItemListPanel items={items} activeItemId={activeItem?.id ?? null} open={listOpen} onOpenChange={setListOpen} onSelect={handleSelect} />
        {activeItem && draft ? (
          <CaptureItemForm item={activeItem} draft={draft} assignees={assignees} saveState={saveState} aiState={aiState} aiMessage={aiMessage} onDraftChange={patchDraft} onFormatNotes={() => void formatNotesWithAi()} />
        ) : (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm leading-6 text-slate-700">
            Capture a photo, save a note, or long-press the plan to drop a pin. The drawer will slide up automatically for title, classification, assignment, and notes.
          </div>
        )}
      </div>
    </section>
  );
}
