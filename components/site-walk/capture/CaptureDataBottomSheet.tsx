"use client";

import { useState, type PointerEvent, type ReactElement } from "react";
import { ArrowLeft, Camera, Link2, Loader2, Settings2, SkipForward, Sparkles, Upload } from "lucide-react";
import { useDeviceContext, type DeviceCaptureInput } from "@/lib/hooks/useDeviceContext";
import { CAPTURE_ITEM_STATUSES, type CaptureAssignee, type CaptureItemDraft, type CaptureItemRecord } from "@/lib/types/site-walk-capture";

type Props = {
  item: CaptureItemRecord | null;
  items: CaptureItemRecord[];
  assignees: CaptureAssignee[];
  draft: CaptureItemDraft | null;
  saveState: string;
  aiState: string;
  aiMessage: string | null;
  currentLocation: string;
  tradeOptions: string[];
  canManageTrades: boolean;
  returnsToPlan?: boolean;
  onDraftChange: (patch: Partial<CaptureItemDraft>) => void;
  onCapture: (input?: DeviceCaptureInput) => void;
  onFormatNotes: () => void;
  onSaveNextStop: () => void | Promise<void>;
  onOpenManageTrades?: () => void;
};

export function CaptureDataBottomSheet({ item, items, assignees, draft, saveState, aiState, aiMessage, currentLocation, tradeOptions, canManageTrades, returnsToPlan = false, onDraftChange, onCapture, onFormatNotes, onSaveNextStop, onOpenManageTrades }: Props) {
  const [expandedMobile, setExpandedMobile] = useState(false);
  const [linkProgression, setLinkProgression] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const { primaryCaptureInput, primaryCaptureLabel } = useDeviceContext();
  const isSaving = saveState === "saving";
  const actionBusy = isSaving || advancing;
  const aiBusy = aiState === "loading" || aiState === "formatting";
  const progressionActive = Boolean(draft?.beforeItemId) || linkProgression;
  const previousItems = items.filter((candidate) => isUuid(candidate.id) && candidate.id !== item?.id && candidate.client_item_id !== item?.client_item_id);
  const selectClass = "mt-1 h-10 w-full rounded-2xl border border-white/10 bg-black/35 px-3 text-xs font-black text-slate-100 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 disabled:opacity-50";
  const saveActionIcon = returnsToPlan ? <Link2 className="h-5 w-5" /> : <SkipForward className="h-5 w-5" />;
  const saveActionLabel = returnsToPlan ? "Save & Return to Plan" : "Save & Next Camera";

  function handleContentPointerDown(event: PointerEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("button, a, input, textarea, select, [contenteditable='true']")) return;
    blurActiveField();
  }

  function handleSaveNextClick() {
    if (advancing) return;
    setAdvancing(true);
    // Synchronously advance — do NOT await. Awaiting breaks the Safari user-gesture token
    // and hides the picker behind a never-resolved spinner.
    Promise.resolve(onSaveNextStop()).catch((err) => console.error("[capture] save & next failed", err));
    setExpandedMobile(false);
    setTimeout(() => setAdvancing(false), 2000);
  }

  return (
    <>
      {/* MOBILE: FAB when minimized → full-screen modal when expanded */}
      {!expandedMobile && (
        <button
          type="button"
          onClick={() => setExpandedMobile(true)}
          className="md:hidden fixed right-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full bg-amber-500 px-5 py-3 text-sm font-black text-slate-950 shadow-[0_4px_24px_rgba(245,158,11,0.45)] active:scale-95 transition"
          style={{ bottom: `max(env(safe-area-inset-bottom, 0.75rem) + 0.75rem, 1.5rem)` }}
          aria-label="Add details and save"
        >
          <SkipForward className="h-5 w-5" /> {item ? "Details & Save" : "Start Capture"}
        </button>
      )}
      {expandedMobile && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col bg-slate-950/97 backdrop-blur-xl" aria-label="Capture details (mobile)">
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2.5">
            <button type="button" onClick={() => setExpandedMobile(false)} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-2.5 text-[11px] font-black text-white/80" aria-label="Back to photo">
              <ArrowLeft className="h-4 w-4" /> Photo
            </button>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-black uppercase tracking-[0.14em] text-amber-300/80">{currentLocation}</p>
              <h2 className="truncate text-sm font-black text-white">{item?.title || "Ready"}</h2>
            </div>
            {item && (
              <button type="button" onClick={handleSaveNextClick} disabled={advancing} className="inline-flex h-9 items-center gap-1 rounded-xl bg-amber-500 px-3 text-[11px] font-black text-slate-950 shadow-lg disabled:opacity-60">
                {actionBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : saveActionIcon}
                <span>Save</span>
              </button>
            )}
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 pb-12">
            <SheetContents
              item={item} draft={draft} actionBusy={actionBusy} advancing={advancing}
              saveActionIcon={saveActionIcon} saveActionLabel={saveActionLabel}
              primaryCaptureInput={primaryCaptureInput} primaryCaptureLabel={primaryCaptureLabel}
              onCapture={onCapture} handleSaveNextClick={handleSaveNextClick}
              handleContentPointerDown={handleContentPointerDown}
              onDraftChange={onDraftChange} onFormatNotes={onFormatNotes}
              aiBusy={aiBusy} aiMessage={aiMessage}
              tradeOptions={tradeOptions} canManageTrades={canManageTrades} onOpenManageTrades={onOpenManageTrades}
              assignees={assignees} previousItems={previousItems}
              progressionActive={progressionActive} setLinkProgression={setLinkProgression}
              selectClass={selectClass}
              maxHeightClass=""
            />
          </div>
        </div>
      )}

      {/* DESKTOP: full-height right column inside the section flex */}
      <aside className="hidden md:flex flex-col w-96 shrink-0 border-l border-white/10 bg-slate-950/92 backdrop-blur-2xl shadow-[-20px_0_40px_rgba(0,0,0,0.3)] h-full overflow-hidden" aria-label="Capture details (desktop)">
        <div className="px-4 pt-4 pb-3 border-b border-white/5">
          <p className="truncate text-xs font-black uppercase tracking-[0.16em] text-amber-300/80">{currentLocation}</p>
          <h2 className="truncate text-base font-black text-white">{item?.title || "Ready for next field stop"}</h2>
        </div>
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
          <SheetContents
            item={item} draft={draft} actionBusy={actionBusy} advancing={advancing}
            saveActionIcon={saveActionIcon} saveActionLabel={saveActionLabel}
            primaryCaptureInput={primaryCaptureInput} primaryCaptureLabel={primaryCaptureLabel}
            onCapture={onCapture} handleSaveNextClick={handleSaveNextClick}
            handleContentPointerDown={handleContentPointerDown}
            onDraftChange={onDraftChange} onFormatNotes={onFormatNotes}
            aiBusy={aiBusy} aiMessage={aiMessage}
            tradeOptions={tradeOptions} canManageTrades={canManageTrades} onOpenManageTrades={onOpenManageTrades}
            assignees={assignees} previousItems={previousItems}
            progressionActive={progressionActive} setLinkProgression={setLinkProgression}
            selectClass={selectClass}
            maxHeightClass=""
          />
        </div>
      </aside>
    </>
  );
}

type SheetContentsProps = {
  item: CaptureItemRecord | null;
  draft: CaptureItemDraft | null;
  actionBusy: boolean;
  advancing: boolean;
  saveActionIcon: ReactElement;
  saveActionLabel: string;
  primaryCaptureInput: DeviceCaptureInput;
  primaryCaptureLabel: string;
  onCapture: (input?: DeviceCaptureInput) => void;
  handleSaveNextClick: () => void;
  handleContentPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  onDraftChange: (patch: Partial<CaptureItemDraft>) => void;
  onFormatNotes: () => void;
  aiBusy: boolean;
  aiMessage: string | null;
  tradeOptions: string[];
  canManageTrades: boolean;
  onOpenManageTrades?: () => void;
  assignees: CaptureAssignee[];
  previousItems: CaptureItemRecord[];
  progressionActive: boolean;
  setLinkProgression: (value: boolean) => void;
  selectClass: string;
  maxHeightClass: string;
};

function SheetContents({
  item, draft, actionBusy, advancing, saveActionIcon, saveActionLabel,
  primaryCaptureInput, primaryCaptureLabel, onCapture, handleSaveNextClick,
  handleContentPointerDown, onDraftChange, onFormatNotes, aiBusy, aiMessage,
  tradeOptions, canManageTrades, onOpenManageTrades, assignees, previousItems,
  progressionActive, setLinkProgression, selectClass, maxHeightClass,
}: SheetContentsProps) {
  return (
    <div className={`flex flex-col ${maxHeightClass}`}>
      {/* ── Body: scrollable form fields ── */}
      <div className={`flex-1 space-y-3 overflow-y-auto pr-1 pb-3 no-scrollbar ${maxHeightClass ? "" : ""}`} onPointerDownCapture={handleContentPointerDown}>
        {/* Capture trigger — shown only when there's no active item */}
        {!item && (
          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/95 p-2 shadow-xl backdrop-blur-xl">
            <button type="button" onClick={() => onCapture(primaryCaptureInput)} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-5 text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(245,158,11,0.38)] transition hover:bg-amber-400">
              {primaryCaptureInput === "camera" ? <Camera className="h-5 w-5" /> : <Upload className="h-5 w-5" />} {primaryCaptureLabel}
            </button>
          </div>
        )}

        <label className="block">
          <span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Field note</span>
        <textarea
          value={draft?.notes ?? ""}
          onChange={(event) => onDraftChange({ notes: event.target.value })}
          rows={5}
          disabled={!draft}
          placeholder="Type what happened, what changed, and who owns the next action…"
          className="mt-2 w-full rounded-3xl border border-white/10 bg-black/35 px-4 py-3 text-base leading-6 text-slate-100 outline-none placeholder:text-slate-600 focus:border-amber-400 focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60"
          style={{ WebkitUserSelect: "text", userSelect: "text" }}
          onPointerDown={(e) => e.stopPropagation()}
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="block sm:col-span-1">
          <span className="flex items-center justify-between text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
            <span>Category <span className="normal-case tracking-normal text-slate-600">(Customizable in Org Settings)</span></span>
            {canManageTrades && onOpenManageTrades && (
              <button type="button" onClick={onOpenManageTrades} className="inline-flex items-center gap-1 rounded-md px-1 py-0.5 text-[9px] font-black uppercase tracking-wider text-amber-300 hover:text-amber-100" aria-label="Manage project categories"><Settings2 className="h-3 w-3" /> Manage</button>
            )}
          </span>
          <select value={draft?.trade ?? ""} onChange={(event) => onDraftChange({ trade: event.target.value })} disabled={!draft} className={selectClass}>
            <option value="">Select category…</option>
            {tradeOptions.map((trade) => <option key={trade} value={trade}>{trade}</option>)}
          </select>
        </label>
        <label className="block"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Assignee</span><select value={draft?.assignedTo ?? ""} onChange={(event) => onDraftChange({ assignedTo: event.target.value })} disabled={!draft} className={selectClass}><option value="">Unassigned</option>{assignees.filter((assignee) => assignee.assignable).map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.label}</option>)}</select></label>
        <label className="block"><span className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">Status</span><select value={draft?.status ?? "open"} onChange={(event) => onDraftChange({ status: event.target.value as CaptureItemDraft["status"] })} disabled={!draft} className={selectClass}>{CAPTURE_ITEM_STATUSES.map((status) => <option key={status} value={status}>{formatOption(status)}</option>)}</select></label>
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-3">
        <button type="button" disabled={!draft} onClick={() => { if (progressionActive) { setLinkProgression(false); onDraftChange({ beforeItemId: "", itemRelationship: "standalone" }); } else { setLinkProgression(true); onDraftChange({ itemRelationship: "after" }); } }} className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black transition disabled:opacity-50 ${progressionActive ? "bg-amber-500 text-slate-950" : "border border-white/10 bg-black/25 text-slate-200"}`}>
          <Link2 className="h-4 w-4" /> Link to Previous (Progression)
        </button>
        {progressionActive && (
          <>
            <select value={draft?.beforeItemId ?? ""} onChange={(event) => onDraftChange({ beforeItemId: event.target.value })} disabled={!draft || previousItems.length === 0} className={selectClass} aria-label="Previous item for progression timeline">
              <option value="">Select existing pin/item…</option>
              {previousItems.length === 0 && <option value="" disabled>No previous items yet</option>}
              {previousItems.map((previousItem) => <option key={previousItem.id} value={previousItem.id}>{formatItemLabel(previousItem)}</option>)}
            </select>
            <div className="mt-2 flex gap-2">
              {(["after","progress"] as const).map((role) => (
                <button key={role} type="button" onClick={() => onDraftChange({ itemRelationship: role })} className={`flex-1 rounded-2xl border px-3 py-2 text-[11px] font-black uppercase tracking-wider transition ${draft?.itemRelationship === role ? "border-amber-400 bg-amber-500/20 text-amber-100" : "border-white/10 bg-black/25 text-slate-300 hover:text-white"}`}>{role === "after" ? "After (paired)" : "Progress step"}</button>
              ))}
            </div>
            {draft?.beforeItemId && (
              <a href={`/site-walk/items/${draft.beforeItemId}/compare`} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block text-[10px] font-black uppercase tracking-[0.16em] text-amber-300 hover:text-amber-100">Open before/after viewer ↗</a>
            )}
          </>
        )}
      </div>

      <div className="flex">
        <button type="button" onClick={onFormatNotes} disabled={!draft || aiBusy} className="inline-flex w-full min-h-12 items-center justify-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 text-sm font-black text-amber-100 disabled:opacity-60">
          {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} AI Format Note
        </button>
      </div>

        {aiMessage && <p className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-100">{aiMessage}</p>}
      </div>

      {/* ── Footer: Save & Next — always visible, never scrolls off-screen ── */}
      {item && (
        <div className="shrink-0 border-t border-white/10 bg-slate-950/95 px-1 pt-3 pb-[max(env(safe-area-inset-bottom),0.5rem)]">
          <button type="button" onClick={handleSaveNextClick} disabled={advancing} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-amber-500 px-4 text-sm font-black text-slate-950 shadow-[0_0_24px_rgba(245,158,11,0.38)] transition hover:bg-amber-400 disabled:opacity-60">
            {actionBusy ? <Loader2 className="h-5 w-5 animate-spin" /> : saveActionIcon}
            <span>{saveActionLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
}

function formatOption(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatItemLabel(item: CaptureItemRecord) {
  const title = item.title.trim() || item.category || item.item_type;
  const time = new Date(item.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${title} · ${time}`;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

function blurActiveField() {
  const activeElement = document.activeElement;
  if (activeElement instanceof HTMLElement) activeElement.blur();
}
