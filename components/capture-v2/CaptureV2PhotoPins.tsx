"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { createPortal } from "react-dom";
import { Paperclip } from "lucide-react";
import type { Transform } from "@/components/site-walk/capture/markupCanvasGeometry";
import type { PhotoAttachmentFile, PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import { clientToImagePct } from "./capture-v2-photo-coords";
import { CaptureV2PhotoPinCard } from "./CaptureV2PhotoPinCard";
import { CaptureV2PinAttachmentViewer } from "./CaptureV2PinAttachmentViewer";

const CARD_WIDTH_PX = 280;
const CARD_GAP_PX = 12;

type PinDragState = { pinId: string; pointerId: number; startX: number; startY: number; dragging: boolean } | null;

type Props = {
  pins: PhotoAttachmentPin[];
  transform: Transform;
  stageRef: RefObject<HTMLDivElement | null>;
  onPinsChange: (pins: PhotoAttachmentPin[]) => void;
  onAttachFile: (pin: PhotoAttachmentPin) => void;
  onAttachPhoto: (pin: PhotoAttachmentPin) => void;
  openPinId?: string | null;
};

export function CaptureV2PhotoPins({
  pins,
  transform,
  stageRef,
  onPinsChange,
  onAttachFile,
  onAttachPhoto,
  openPinId = null,
}: Props) {
  const localPinsRef = useRef(pins);
  const pinButtonRefs = useRef(new Map<string, HTMLButtonElement>());
  const prevPinIdsRef = useRef(new Set<string>());
  const fileCountRef = useRef(new Map<string, number>());
  const dragRef = useRef<PinDragState>(null);
  const labelSaveTimerRef = useRef<number | null>(null);
  const [portalMounted, setPortalMounted] = useState(false);
  const [localPins, setLocalPins] = useState(pins);
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [labelDraft, setLabelDraft] = useState("Untitled");
  const [noteDraft, setNoteDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);
  const [cardPosition, setCardPosition] = useState({ left: 0, top: 0 });
  const [recentlyAttachedFileId, setRecentlyAttachedFileId] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<PhotoAttachmentFile | null>(null);

  useEffect(() => {
    setPortalMounted(true);
  }, []);

  useEffect(() => {
    if (!openPinId) return;
    const pin = pins.find((entry) => entry.id === openPinId);
    if (!pin) return;
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

  useEffect(() => {
    if (!activePinId) return;
    function updateCardPosition() {
      const button = pinButtonRefs.current.get(activePinId!);
      if (!button) return;
      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const belowTop = rect.bottom + CARD_GAP_PX;
      const aboveTop = rect.top - CARD_GAP_PX;
      const estimatedHeight = 290;
      const preferBelow = belowTop + estimatedHeight < window.innerHeight - 16;
      const clampedLeft = Math.round(
        Math.min(Math.max(centerX, CARD_WIDTH_PX / 2 + 8), window.innerWidth - CARD_WIDTH_PX / 2 - 8),
      );
      setCardPosition({
        left: clampedLeft,
        top: preferBelow ? belowTop : Math.max(16, aboveTop - estimatedHeight),
      });
    }
    updateCardPosition();
    window.addEventListener("resize", updateCardPosition);
    window.addEventListener("scroll", updateCardPosition, true);
    return () => {
      window.removeEventListener("resize", updateCardPosition);
      window.removeEventListener("scroll", updateCardPosition, true);
    };
  }, [activePinId, transform, localPins]);

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

  function closeCard() {
    commitLabel();
    commitNote();
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
    if (!drag.dragging && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 3) {
      drag.dragging = true;
      setDraggingPinId(drag.pinId);
      setActivePinId(null);
      setConfirmDelete(false);
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
    setConfirmDelete(false);
    setLabelDraft(pin.label?.trim() || "Untitled");
    setNoteDraft(pin.note ?? "");
    setActivePinId((current) => (current === pin.id ? null : pin.id));
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

      {portalMounted && activePin
        ? createPortal(
            <CaptureV2PhotoPinCard
              pin={activePin}
              labelDraft={labelDraft}
              noteDraft={noteDraft}
              confirmDelete={confirmDelete}
              recentlyAttachedFileId={recentlyAttachedFileId}
              style={cardPosition}
              onLabelChange={handleLabelChange}
              onLabelCommit={commitLabel}
              onNoteChange={handleNoteChange}
              onNoteCommit={commitNote}
              onClose={closeCard}
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
