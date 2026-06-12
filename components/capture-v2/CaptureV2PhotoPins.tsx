"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Paperclip } from "lucide-react";
import type { Transform } from "@/components/site-walk/capture/markupCanvasGeometry";
import type { PhotoAttachmentFile, PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import { clientToImagePct } from "./capture-v2-photo-coords";
import { CaptureV2PhotoPinCard } from "./CaptureV2PhotoPinCard";
import { CaptureV2PinAttachmentViewer } from "./CaptureV2PinAttachmentViewer";

type PinDragState = { pinId: string; pointerId: number; startX: number; startY: number; dragging: boolean } | null;

type Props = {
  pins: PhotoAttachmentPin[];
  transform: Transform;
  stageRef: RefObject<HTMLDivElement | null>;
  onPinsChange: (pins: PhotoAttachmentPin[]) => void;
  onAttachFile: (pin: PhotoAttachmentPin) => void;
  onAttachPhoto: (pin: PhotoAttachmentPin) => void;
  openPinId?: string | null;
  /** When true (e.g. details screen overlays the canvas), the pin modal must close. */
  suspended?: boolean;
};

export function CaptureV2PhotoPins({
  pins,
  transform,
  stageRef,
  onPinsChange,
  onAttachFile,
  onAttachPhoto,
  openPinId = null,
  suspended = false,
}: Props) {
  const localPinsRef = useRef(pins);
  const pinButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const prevPinIdsRef = useRef(new Set<string>());
  const fileCountRef = useRef(new Map<string, number>());
  const dragRef = useRef<PinDragState>(null);
  const labelSaveTimerRef = useRef<number | null>(null);
  // Label/note values captured when the modal opens, so Cancel can revert
  // the debounced auto-saves that fire while typing.
  const openSnapshotRef = useRef<{ pinId: string; label: string; note: string } | null>(null);
  const [portalMounted, setPortalMounted] = useState(false);
  const [localPins, setLocalPins] = useState(pins);
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("Untitled");
  const [noteDraft, setNoteDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [recentlyAttachedFileId, setRecentlyAttachedFileId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<PhotoAttachmentFile | null>(null);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  const handledOpenPinIdRef = useRef<string | null>(null);
  useEffect(() => {
    // Open once per openPinId value — pins updates must not re-open a card
    // the user explicitly closed.
    if (!openPinId || handledOpenPinIdRef.current === openPinId) return;
    const pin = pins.find((entry) => entry.id === openPinId);
    if (!pin) return;
    handledOpenPinIdRef.current = openPinId;
    openSnapshotRef.current = { pinId: pin.id, label: pin.label ?? "", note: pin.note ?? "" };
    setActivePinId(openPinId);
    setLabelDraft(pin.label?.trim() || "Untitled");
    setNoteDraft(pin.note ?? "");
    setConfirmDelete(false);
  }, [openPinId, pins]);

  useEffect(() => {
    localPinsRef.current = pins;
    setLocalPins(pins);
    const nextIds = new Set(pins.map((pin) => pin.id));
    const added = pins.find((pin) => !prevPinIdsRef.current.has(pin.id));
    if (added) {
      openSnapshotRef.current = { pinId: added.id, label: added.label ?? "", note: added.note ?? "" };
      setActivePinId(added.id);
      setLabelDraft(added.label?.trim() || "Untitled");
      setNoteDraft(added.note ?? "");
      setConfirmDelete(false);
    }
    prevPinIdsRef.current = nextIds;
  }, [pins]);

  const activePin = localPins.find((pin) => pin.id === activePinId) ?? null;

  useEffect(() => {
    if (!activePin) return;
    const prevCount = fileCountRef.current.get(activePin.id) ?? 0;
    if (activePin.files.length > prevCount && activePin.files.length > 0) {
      const newest = activePin.files[activePin.files.length - 1];
      if (newest) {
        setRecentlyAttachedFileId(newest.id);
        window.setTimeout(() => setRecentlyAttachedFileId(null), 2400);
      }
    }
    fileCountRef.current.set(activePin.id, activePin.files.length);
  }, [activePin]);

  // The modal must never outlive the capture surface — when the details screen
  // (or any overlay) suspends the canvas, save pending edits and close.
  useEffect(() => {
    if (!suspended || !activePinId) return;
    if (labelSaveTimerRef.current) window.clearTimeout(labelSaveTimerRef.current);
    const trimmedLabel = labelDraft.trim() || "Untitled";
    const trimmedNote = noteDraft.trim();
    const nextPins = localPinsRef.current.map((pin) =>
      pin.id === activePinId ? { ...pin, label: trimmedLabel, note: trimmedNote } : pin,
    );
    localPinsRef.current = nextPins;
    setLocalPins(nextPins);
    onPinsChange(nextPins);
    setActivePinId(null);
    setConfirmDelete(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suspended]);

  useEffect(() => {
    return () => {
      if (labelSaveTimerRef.current) window.clearTimeout(labelSaveTimerRef.current);
    };
  }, []);

  function updatePinPosition(pinId: string, clientX: number, clientY: number) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const point = clientToImagePct(clientX, clientY, rect, transform);
    setLocalPins((currentPins) => {
      const nextPins = currentPins.map((pin) =>
        pin.id === pinId ? { ...pin, xPct: point.xPct, yPct: point.yPct } : pin,
      );
      localPinsRef.current = nextPins;
      return nextPins;
    });
  }

  function removePin(pinId: string) {
    const nextPins = localPins.filter((pin) => pin.id !== pinId);
    localPinsRef.current = nextPins;
    setLocalPins(nextPins);
    onPinsChange(nextPins);
    setActivePinId(null);
    setConfirmDelete(false);
  }

  function commitLabel() {
    if (!activePinId) return;
    const trimmed = labelDraft.trim() || "Untitled";
    const nextPins = localPins.map((pin) => (pin.id === activePinId ? { ...pin, label: trimmed } : pin));
    localPinsRef.current = nextPins;
    setLocalPins(nextPins);
    onPinsChange(nextPins);
    setLabelDraft(trimmed);
  }

  function handleLabelChange(value: string) {
    setLabelDraft(value);
    if (labelSaveTimerRef.current) window.clearTimeout(labelSaveTimerRef.current);
    labelSaveTimerRef.current = window.setTimeout(() => {
      if (!activePinId) return;
      const trimmed = value.trim() || "Untitled";
      const nextPins = localPinsRef.current.map((pin) =>
        pin.id === activePinId ? { ...pin, label: trimmed } : pin,
      );
      localPinsRef.current = nextPins;
      setLocalPins(nextPins);
      onPinsChange(nextPins);
    }, 350);
  }

  function commitNote() {
    if (!activePinId) return;
    const trimmed = noteDraft.trim();
    const nextPins = localPins.map((pin) => (pin.id === activePinId ? { ...pin, note: trimmed } : pin));
    localPinsRef.current = nextPins;
    setLocalPins(nextPins);
    onPinsChange(nextPins);
  }

  function handleNoteChange(value: string) {
    setNoteDraft(value);
    if (labelSaveTimerRef.current) window.clearTimeout(labelSaveTimerRef.current);
    labelSaveTimerRef.current = window.setTimeout(() => {
      if (!activePinId) return;
      const nextPins = localPinsRef.current.map((pin) =>
        pin.id === activePinId ? { ...pin, note: value.trim() } : pin,
      );
      localPinsRef.current = nextPins;
      setLocalPins(nextPins);
      onPinsChange(nextPins);
    }, 350);
  }

  function confirmCard() {
    if (labelSaveTimerRef.current) window.clearTimeout(labelSaveTimerRef.current);
    commitLabel();
    commitNote();
    setActivePinId(null);
    setConfirmDelete(false);
  }

  function cancelCard() {
    if (labelSaveTimerRef.current) window.clearTimeout(labelSaveTimerRef.current);
    const snapshot = openSnapshotRef.current;
    if (snapshot && snapshot.pinId === activePinId) {
      // Revert any debounced auto-saves that landed while typing.
      const nextPins = localPinsRef.current.map((pin) =>
        pin.id === snapshot.pinId ? { ...pin, label: snapshot.label, note: snapshot.note } : pin,
      );
      localPinsRef.current = nextPins;
      setLocalPins(nextPins);
      onPinsChange(nextPins);
    }
    setActivePinId(null);
    setConfirmDelete(false);
  }

  function beginPinPress(event: ReactPointerEvent<HTMLButtonElement>, pin: PhotoAttachmentPin) {
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      pinId: pin.id,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      dragging: false,
    };
  }

  function movePressedPin(event: ReactPointerEvent<HTMLButtonElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    event.stopPropagation();
    event.preventDefault();
    // Modal open = editing mode; never let a stray drag start or dismiss it.
    if (activePinId === drag.pinId) return;
    if (!drag.dragging && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 3) {
      drag.dragging = true;
      setDraggingPinId(drag.pinId);
    }
    if (!drag.dragging) return;
    updatePinPosition(drag.pinId, event.clientX, event.clientY);
  }

  function endPinPress(event: ReactPointerEvent<HTMLButtonElement>, pin: PhotoAttachmentPin) {
    const drag = dragRef.current;
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setDraggingPinId(null);
    if (drag?.dragging) {
      onPinsChange(localPinsRef.current);
      return;
    }
    if (activePinId === pin.id) return; // already editing — only ✓/X close
    setConfirmDelete(false);
    openSnapshotRef.current = { pinId: pin.id, label: pin.label ?? "", note: pin.note ?? "" };
    setLabelDraft(pin.label?.trim() || "Untitled");
    setNoteDraft(pin.note ?? "");
    setActivePinId(pin.id);
  }

  return (
    <>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: "center",
        }}
      >
        {localPins.map((pin) => (
          <div
            key={pin.id}
            className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}
          >
            <button
              ref={(node) => {
                if (node) pinButtonRefs.current.set(pin.id, node);
                else pinButtonRefs.current.delete(pin.id);
              }}
              type="button"
              onPointerDown={(event) => beginPinPress(event, pin)}
              onPointerMove={movePressedPin}
              onPointerUp={(event) => endPinPress(event, pin)}
              onPointerCancel={(event) => endPinPress(event, pin)}
              className={`flex h-7 w-7 touch-none items-center justify-center rounded-full border text-white shadow-[0_0_0_2px_rgba(0,0,0,0.55),0_8px_22px_rgba(0,230,153,0.35)] backdrop-blur-md ${
                draggingPinId === pin.id
                  ? "scale-110 border-white bg-[var(--graphite-primary)] text-[var(--graphite-canvas)]"
                  : "border-[color-mix(in_srgb,var(--graphite-primary)_55%,white)] bg-[color-mix(in_srgb,var(--graphite-primary)_88%,transparent)]"
              }`}
              aria-label={`Attachment pin ${pin.label}`}
              data-capture-chrome="photo-pin"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>

      {portalMounted && activePin && !suspended
        ? createPortal(
            <CaptureV2PhotoPinCard
              pin={activePin}
              labelDraft={labelDraft}
              noteDraft={noteDraft}
              confirmDelete={confirmDelete}
              recentlyAttachedFileId={recentlyAttachedFileId}
              onLabelChange={handleLabelChange}
              onLabelCommit={commitLabel}
              onNoteChange={handleNoteChange}
              onNoteCommit={commitNote}
              onConfirm={confirmCard}
              onCancel={cancelCard}
              onAttachFile={() => onAttachFile(activePin)}
              onAttachPhoto={() => onAttachPhoto(activePin)}
              onDeleteRequest={() => setConfirmDelete(true)}
              onDeleteConfirm={() => removePin(activePin.id)}
              onDeleteCancel={() => setConfirmDelete(false)}
              onOpenAttachment={setPreviewFile}
            />,
            document.body,
          )
        : null}

      {previewFile ? (
        <CaptureV2PinAttachmentViewer file={previewFile} onClose={() => setPreviewFile(null)} />
      ) : null}
    </>
  );
}
