"use client";

import { useCallback, useEffect, useRef, useState, type FocusEvent, type PointerEvent } from "react";
import { Camera, Loader2, Sparkles, X } from "lucide-react";
import { motion, type PanInfo } from "framer-motion";
import type { CaptureItemDraft } from "@/lib/types/site-walk-capture";
import { CAPTURE_V2_LAYER_IDS, CAPTURE_V2_LAYERS } from "./layers";
import { CaptureV2PrimaryAction } from "./CaptureV2PrimaryAction";
import { CaptureV2SaveStatus } from "./CaptureV2SaveStatus";
import { SmartClassificationChips } from "./SmartClassificationChips";
import type { CaptureV2DrawerDetent } from "./useCaptureV2DetailDrawer";
import type { useCaptureV2DetailDrawer } from "./useCaptureV2DetailDrawer";
import type { CaptureV2Loop } from "./useCaptureV2Loop";

type DrawerHook = ReturnType<typeof useCaptureV2DetailDrawer>;

type Props = {
  loop: CaptureV2Loop;
  drawer: DrawerHook;
  mode: "mobile-overlay" | "mobile-full" | "desktop";
  initialDetent?: CaptureV2DrawerDetent;
  notesFocused?: boolean;
  onNotesFocusChange?: (focused: boolean) => void;
  onAddAnotherAngle?: () => void;
  onClose?: () => void;
};

const selectClass =
  "mt-1 h-10 w-full rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 text-sm font-medium text-slate-100 outline-none focus:border-white/20 focus:ring-1 focus:ring-white/10 disabled:opacity-50";
const labelClass = "text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500";

const DRAWER_ITEM_STATUSES = ["open", "in_progress", "resolved"] as const;
const DRAWER_PRIORITIES = ["low", "medium", "high", "critical"] as const;

const DETENT_RATIO: Record<CaptureV2DrawerDetent, number> = {
  default: 0.6,
  expanded: 1,
};

function formatOption(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function isFormField(element: EventTarget | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  const tag = element.tagName;
  return tag === "TEXTAREA" || tag === "SELECT" || tag === "INPUT";
}

function useDrawerViewportBounds(detent: CaptureV2DrawerDetent, keyboardActive: boolean) {
  const [maxHeightPx, setMaxHeightPx] = useState<number | null>(null);
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const update = () => {
      const vv = window.visualViewport;
      const layoutHeight = window.innerHeight;
      const keyboard = vv
        ? Math.max(0, layoutHeight - vv.height - vv.offsetTop)
        : 0;
      setKeyboardOffset(keyboard);

      const visibleHeight = vv?.height ?? layoutHeight;
      const ratio = keyboardActive || keyboard > 0 ? 1 : DETENT_RATIO[detent];
      setMaxHeightPx(Math.round(visibleHeight * ratio));
    };

    update();
    window.visualViewport?.addEventListener("resize", update);
    window.visualViewport?.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.visualViewport?.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [detent, keyboardActive]);

  return { maxHeightPx, keyboardOffset };
}

export function LogEntryDrawer({
  loop,
  drawer,
  mode,
  notesFocused = false,
  onNotesFocusChange,
  onAddAnotherAngle,
  onClose,
}: Props) {
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const [formFieldFocused, setFormFieldFocused] = useState(false);
  const [followUpBusy, setFollowUpBusy] = useState(false);
  const { detent, setDetent, cycleDetent, locationLabel, patchLocation, tradeSettings } = drawer;

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
    createFollowUpStop,
  } = loop;

  const dismissLocked = formFieldFocused || notesFocused;
  const isMobileInline = mode === "mobile-full";
  const isDesktopPanel = mode === "desktop";
  const { maxHeightPx, keyboardOffset } = useDrawerViewportBounds(detent, dismissLocked);
  const keyboardOpen = keyboardOffset > 0;

  const syncNotesFocus = useCallback(
    (focused: boolean) => {
      setFormFieldFocused(focused);
      onNotesFocusChange?.(focused);
    },
    [onNotesFocusChange],
  );

  useEffect(() => {
    if (!activeItem) syncNotesFocus(false);
  }, [activeItem, syncNotesFocus]);

  function handleFormFocus(event: FocusEvent) {
    if (isFormField(event.target)) setFormFieldFocused(true);
    if (event.target instanceof HTMLTextAreaElement && event.target.name === "field-notes") {
      syncNotesFocus(true);
    }
  }

  function handleFormBlur(event: FocusEvent) {
    const next = event.relatedTarget;
    if (next instanceof HTMLElement && event.currentTarget.contains(next)) return;
    window.setTimeout(() => {
      const active = document.activeElement;
      if (active instanceof HTMLElement && event.currentTarget.contains(active)) return;
      setFormFieldFocused(false);
      if (notesRef.current && document.activeElement !== notesRef.current) {
        syncNotesFocus(false);
      }
    }, 0);
  }

  function handleContentPointerDown(event: PointerEvent<HTMLDivElement>) {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;
    if (target.closest("button, a, input, textarea, select, [contenteditable='true']")) return;
    if (notesRef.current) notesRef.current.blur();
  }

  function handleDragEnd(_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) {
    if (dismissLocked) return;
    if (info.offset.y > 80) {
      if (detent === "expanded") setDetent("default");
      else onClose?.();
      return;
    }
    if (info.offset.y < -60) setDetent("expanded");
  }

  async function handleCreateFollowUp() {
    if (followUpBusy || !activeItem) return;
    setFollowUpBusy(true);
    try {
      await createFollowUpStop();
    } finally {
      setFollowUpBusy(false);
    }
  }

  if (!activeItem || !draft) {
    if (isDesktopPanel) {
      return (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
          <p className="text-sm font-medium text-slate-400">
            Capture a photo first. Details autosave against the active item.
          </p>
        </div>
      );
    }
    return null;
  }

  const saveAction = (
    <CaptureV2PrimaryAction
      state={machineState}
      isDesktop={isDesktop}
      onAction={handlePrimaryAction}
    />
  );

  const secondaryActions = (
    <div className="space-y-2">
      <button
        type="button"
        disabled={loop.busy || detailsSaving}
        onMouseDown={(event) => event.preventDefault()}
        onTouchStart={(event) => event.preventDefault()}
        onClick={() => onAddAnotherAngle?.()}
        className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-2.5 text-sm text-slate-300 transition hover:border-white/15 hover:bg-white/[0.04] hover:text-slate-100 disabled:opacity-60"
      >
        <Camera className="h-4 w-4 shrink-0" />
        Add Another Angle
      </button>

      <button
        type="button"
        disabled={followUpBusy || detailsSaving}
        onMouseDown={(event) => event.preventDefault()}
        onTouchStart={(event) => event.preventDefault()}
        onClick={() => void handleCreateFollowUp()}
        className="w-full py-2 text-center text-xs font-medium text-slate-500 underline-offset-2 transition hover:text-slate-300 hover:underline disabled:opacity-50"
      >
        {followUpBusy ? "Creating follow-up…" : "Create follow-up stop"}
      </button>
    </div>
  );

  const formBody = (
    <LogEntryFormBody
      draft={draft}
      locationLabel={locationLabel}
      assignees={assignees}
      tradeOptions={tradeSettings.trades}
      notesRef={notesRef}
      onPatch={patchDraft}
      onLocationChange={patchLocation}
      onNotesChange={(value) => patchDraft({ notes: value })}
      onNotesFocus={() => syncNotesFocus(true)}
      onNotesBlur={() => syncNotesFocus(false)}
      onContentPointerDown={handleContentPointerDown}
      selectClass={selectClass}
      labelClass={labelClass}
    />
  );

  const aiSection = (
    <>
      <button
        type="button"
        disabled={aiState === "formatting" || !draft.notes.trim()}
        onMouseDown={(event) => event.preventDefault()}
        onTouchStart={(event) => event.preventDefault()}
        onClick={() => void formatNotesWithAi()}
        className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 text-sm font-medium text-slate-300 transition hover:border-white/15 hover:bg-white/[0.04] disabled:opacity-60"
      >
        {aiState === "formatting" ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        AI Format Note
      </button>
      {aiMessage && (
        <p className="mt-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-xs font-medium text-slate-300">
          {aiMessage}
        </p>
      )}
    </>
  );

  if (isDesktopPanel) {
    return (
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden" aria-label="Log entry inspector">
        <div className="shrink-0 border-b border-white/[0.05] px-4 pb-3 pt-4">
          <h2 className="truncate text-lg font-semibold text-white">
            {draft.title || activeItem.title || "Captured stop"}
          </h2>
          <CaptureV2SaveStatus
            saveState={saveState}
            detailSaveError={detailSaveError}
            detailsSaving={detailsSaving}
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3 no-scrollbar">
          <SmartClassificationChips
            textareaRef={notesRef}
            notes={draft.notes}
            onNotesChange={(value) => patchDraft({ notes: value })}
            className="mb-3"
          />
          {formBody}
          {aiSection}
        </div>

        <div className="shrink-0 space-y-2 border-t border-white/[0.05] px-4 py-3">
          {secondaryActions}
          {saveAction}
        </div>
      </div>
    );
  }

  const mobileHeader = (
    <div className="relative flex shrink-0 items-center gap-2 px-3 pb-2 pt-2">
      <button
        type="button"
        onClick={cycleDetent}
        disabled={dismissLocked}
        className="inline-flex h-9 flex-1 flex-col items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] px-2 disabled:opacity-50"
        aria-label={`Drawer height: ${detent === "expanded" ? "full screen" : "60 percent"}`}
      >
        <span className="h-1 w-10 rounded-full bg-white/20" />
        <span className="mt-1 text-[9px] font-medium uppercase tracking-wider text-slate-500">
          {detent === "expanded" ? "Full" : "60%"}
        </span>
      </button>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          disabled={dismissLocked}
          className="absolute right-3 top-2 inline-flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-slate-300 disabled:opacity-50"
          aria-label="Close log entry"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );

  const scrollFooter = (
    <div
      className="shrink-0 space-y-2 border-t border-white/[0.05] pt-3"
      style={{
        paddingBottom: keyboardOpen
          ? "0.5rem"
          : `max(env(safe-area-inset-bottom, 0px), 0.75rem)`,
      }}
    >
      {secondaryActions}
      {!keyboardOpen && saveAction}
    </div>
  );

  const mobileContent = (
    <>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4">
        <div className="shrink-0 pb-2">
          <h2 className="truncate text-base font-semibold text-white">
            {draft.title || activeItem.title || "Captured stop"}
          </h2>
          <CaptureV2SaveStatus
            saveState={saveState}
            detailSaveError={detailSaveError}
            detailsSaving={detailsSaving}
          />
        </div>

        <div
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar pb-2"
          style={{
            maxHeight: keyboardOpen
              ? maxHeightPx
                ? `${Math.max(120, maxHeightPx - keyboardOffset - 160)}px`
                : `calc(100% - ${keyboardOffset}px)`
              : undefined,
            paddingBottom: keyboardOpen ? `${keyboardOffset + 88}px` : undefined,
          }}
        >
          <SmartClassificationChips
            textareaRef={notesRef}
            notes={draft.notes}
            onNotesChange={(value) => patchDraft({ notes: value })}
            className="mb-3"
          />
          {formBody}
          {detent === "expanded" && aiSection}
        </div>

        {scrollFooter}
      </div>

      {keyboardOpen && (
        <div
          className={`${CAPTURE_V2_LAYERS.copilot} fixed inset-x-0 z-[60] border-t border-white/[0.05] bg-[#0B0F15]/95 px-4 py-2 backdrop-blur-xl`}
          style={{ bottom: keyboardOffset }}
        >
          {saveAction}
        </div>
      )}
    </>
  );

  if (isMobileInline) {
    const inlineMaxHeight =
      keyboardOffset > 0
        ? `calc(100% - ${keyboardOffset}px)`
        : maxHeightPx
          ? `${maxHeightPx}px`
          : undefined;

    return (
      <div
        id={CAPTURE_V2_LAYER_IDS.logDrawer}
        className={`${CAPTURE_V2_LAYERS.drawer} relative flex min-h-0 flex-1 flex-col overflow-hidden border-t border-white/[0.05] bg-[#0B0F15]/95 backdrop-blur-xl md:hidden`}
        style={{
          maxHeight: inlineMaxHeight,
        }}
        onFocusCapture={handleFormFocus}
        onBlurCapture={handleFormBlur}
        aria-label="Log entry drawer"
      >
        {mobileHeader}
        {mobileContent}
      </div>
    );
  }

  return (
    <motion.div
      id={CAPTURE_V2_LAYER_IDS.logDrawer}
      drag={dismissLocked ? false : "y"}
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.08}
      dragMomentum={false}
      onDragStart={(event) => {
        if (dismissLocked) event.preventDefault();
      }}
      onDragEnd={handleDragEnd}
      animate={{ height: maxHeightPx ?? "60dvh" }}
      transition={{ type: "spring", stiffness: 420, damping: 36 }}
      className={`${CAPTURE_V2_LAYERS.drawer} pointer-events-auto fixed inset-x-0 bottom-0 z-[45] flex flex-col overflow-hidden rounded-t-[1.5rem] border-t border-white/[0.05] bg-[#0B0F15]/95 shadow-[0_-20px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl md:hidden`}
      style={{
        maxHeight: maxHeightPx ? `${maxHeightPx}px` : "60dvh",
        bottom: keyboardOpen ? keyboardOffset : 0,
      }}
      onFocusCapture={handleFormFocus}
      onBlurCapture={handleFormBlur}
      aria-label="Log entry drawer"
    >
      {mobileHeader}
      {mobileContent}
    </motion.div>
  );
}

type FormBodyProps = {
  draft: CaptureItemDraft;
  locationLabel: string;
  assignees: CaptureV2Loop["assignees"];
  tradeOptions: string[];
  notesRef: React.RefObject<HTMLTextAreaElement | null>;
  onPatch: (patch: Partial<CaptureItemDraft>) => void;
  onLocationChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onNotesFocus: () => void;
  onNotesBlur: () => void;
  onContentPointerDown: (event: PointerEvent<HTMLDivElement>) => void;
  selectClass: string;
  labelClass: string;
};

function LogEntryFormBody({
  draft,
  locationLabel,
  assignees,
  tradeOptions,
  notesRef,
  onPatch,
  onLocationChange,
  onNotesChange,
  onNotesFocus,
  onNotesBlur,
  onContentPointerDown,
  selectClass,
  labelClass,
}: FormBodyProps) {
  return (
    <div className="space-y-3" onPointerDownCapture={onContentPointerDown}>
      <label className="block text-left">
        <span className={labelClass}>Field note</span>
        <textarea
          ref={notesRef}
          name="field-notes"
          value={draft.notes}
          onChange={(event) => onNotesChange(event.target.value)}
          onFocus={onNotesFocus}
          onBlur={onNotesBlur}
          rows={4}
          placeholder="Type what happened, what changed, and who owns the next action…"
          className="mt-2 min-h-[140px] w-full resize-none rounded-xl border border-white/[0.07] bg-slate-900/40 p-3 text-base leading-6 text-slate-100 outline-none placeholder:text-slate-500 focus:border-[color-mix(in_srgb,var(--graphite-primary)_50%,transparent)]"
          style={{ WebkitUserSelect: "text", userSelect: "text" }}
          onPointerDown={(event) => event.stopPropagation()}
        />
      </label>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-left">
          <span className={labelClass}>Status</span>
          <select
            value={draft.status}
            onChange={(event) =>
              onPatch({ status: event.target.value as CaptureItemDraft["status"] })
            }
            className={selectClass}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {DRAWER_ITEM_STATUSES.map((status) => (
              <option key={status} value={status}>
                {formatOption(status)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-left">
          <span className={labelClass}>Priority</span>
          <select
            value={draft.priority}
            onChange={(event) =>
              onPatch({ priority: event.target.value as CaptureItemDraft["priority"] })
            }
            className={selectClass}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {DRAWER_PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {formatOption(priority)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block text-left">
          <span className={labelClass}>Category</span>
          <select
            value={draft.trade}
            onChange={(event) => onPatch({ trade: event.target.value })}
            className={selectClass}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <option value="">Select category…</option>
            {tradeOptions.map((trade) => (
              <option key={trade} value={trade}>
                {trade}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-left">
          <span className={labelClass}>Assignee</span>
          <select
            value={draft.assignedTo}
            onChange={(event) => onPatch({ assignedTo: event.target.value })}
            className={selectClass}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <option value="">Unassigned</option>
            {assignees
              .filter((assignee) => assignee.assignable)
              .map((assignee) => (
                <option key={assignee.id} value={assignee.id}>
                  {assignee.label}
                </option>
              ))}
          </select>
        </label>
      </div>

      <label className="block text-left">
        <span className={labelClass}>Room / area / location</span>
        <input
          value={locationLabel}
          onChange={(event) => onLocationChange(event.target.value)}
          className="mt-1 w-full rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5 text-sm font-medium text-slate-100 outline-none placeholder:text-slate-500 focus:border-white/15 focus:ring-1 focus:ring-white/10"
          placeholder="e.g. Level 2 · East corridor"
          onPointerDown={(event) => event.stopPropagation()}
        />
      </label>
    </div>
  );
}
