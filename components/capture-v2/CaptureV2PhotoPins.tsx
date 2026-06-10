"use client";

import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import { Paperclip, Trash2 } from "lucide-react";
import type { Transform } from "@/components/site-walk/capture/markupCanvasGeometry";
import type { PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";
import { clientToImagePct } from "./capture-v2-photo-coords";

type PinDragState = { pinId: string; pointerId: number; startX: number; startY: number; dragging: boolean } | null;

type Props = {
  pins: PhotoAttachmentPin[];
  transform: Transform;
  stageRef: RefObject<HTMLDivElement | null>;
  onPinsChange: (pins: PhotoAttachmentPin[]) => void;
  onAttachFile: (pin: PhotoAttachmentPin) => void;
};

export function CaptureV2PhotoPins({ pins, transform, stageRef, onPinsChange, onAttachFile }: Props) {
  const localPinsRef = useRef(pins);
  const dragRef = useRef<PinDragState>(null);
  const [localPins, setLocalPins] = useState(pins);
  const [activePinId, setActivePinId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [draggingPinId, setDraggingPinId] = useState<string | null>(null);

  useEffect(() => {
    localPinsRef.current = pins;
    setLocalPins(pins);
  }, [pins]);

  const activePin = localPins.find((pin) => pin.id === activePinId) ?? null;

  function updatePinPosition(pinId: string, clientX: number, clientY: number) {
    const rect = stageRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const point = clientToImagePct(clientX, clientY, rect, transform);
    setLocalPins((currentPins) => {
      const nextPins = currentPins.map((pin) => (pin.id === pinId ? { ...pin, xPct: point.xPct, yPct: point.yPct } : pin));
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
    setEditingLabel(false);
    setConfirmDelete(false);
  }

  function saveLabel() {
    if (!activePinId) return;
    const trimmed = labelDraft.trim();
    if (!trimmed) return;
    const nextPins = localPins.map((pin) => (pin.id === activePinId ? { ...pin, label: trimmed } : pin));
    localPinsRef.current = nextPins;
    setLocalPins(nextPins);
    onPinsChange(nextPins);
    setEditingLabel(false);
  }

  function beginPinPress(event: ReactPointerEvent<HTMLButtonElement>, pin: PhotoAttachmentPin) {
    event.stopPropagation();
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = { pinId: pin.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dragging: false };
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
      setEditingLabel(false);
      setConfirmDelete(false);
    }
    if (!drag.dragging) return;
    updatePinPosition(drag.pinId, event.clientX, event.clientY);
  }

  function endPinPress(event: ReactPointerEvent<HTMLButtonElement>, pin: PhotoAttachmentPin) {
    const drag = dragRef.current;
    event.stopPropagation();
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setDraggingPinId(null);
    if (drag?.dragging) {
      onPinsChange(localPinsRef.current);
      return;
    }
    setConfirmDelete(false);
    setEditingLabel(false);
    setLabelDraft(pin.label);
    setActivePinId((current) => (current === pin.id ? null : pin.id));
  }

  return (
    <div
      className="pointer-events-none absolute inset-0"
      style={{ transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`, transformOrigin: "center" }}
    >
      {localPins.map((pin) => (
        <div key={pin.id} className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${pin.xPct}%`, top: `${pin.yPct}%` }}>
          <button
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
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>
          {activePinId === pin.id ? (
            <div
              className="absolute left-1/2 top-8 z-40 w-44 -translate-x-1/2 rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_92%,transparent)] p-2 text-[var(--graphite-text-header)] shadow-2xl backdrop-blur-xl"
              onPointerDown={(event) => event.stopPropagation()}
            >
              {editingLabel ? (
                <div className="space-y-2">
                  <input
                    value={labelDraft}
                    onChange={(event) => setLabelDraft(event.target.value)}
                    className="w-full rounded-lg border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_70%,transparent)] px-2 py-1.5 text-xs font-semibold outline-none"
                    placeholder="Label"
                    autoFocus
                  />
                  <button type="button" onClick={saveLabel} className="w-full rounded-lg bg-[var(--graphite-primary)] px-2 py-1.5 text-xs font-bold text-[var(--graphite-canvas)]">
                    Save label
                  </button>
                </div>
              ) : confirmDelete ? (
                <div className="space-y-2">
                  <p className="text-center text-xs font-semibold text-[var(--graphite-text-body)]">Delete this pin?</p>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => setConfirmDelete(false)} className="flex-1 rounded-lg border border-[var(--mobile-app-card-border)] px-2 py-1.5 text-xs font-semibold">
                      Cancel
                    </button>
                    <button type="button" onClick={() => removePin(pin.id)} className="flex-1 rounded-lg bg-[var(--destructive)] px-2 py-1.5 text-xs font-bold text-white">
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <button type="button" onClick={() => onAttachFile(pin)} className="rounded-lg px-2 py-1.5 text-left text-xs font-semibold hover:bg-[color-mix(in_srgb,var(--graphite-primary)_12%,transparent)]">
                    Attach file
                  </button>
                  <button type="button" onClick={() => { setEditingLabel(true); setLabelDraft(pin.label); }} className="rounded-lg px-2 py-1.5 text-left text-xs font-semibold hover:bg-[color-mix(in_srgb,var(--graphite-primary)_12%,transparent)]">
                    Edit label
                  </button>
                  <button type="button" onClick={() => setConfirmDelete(true)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-[var(--destructive)] hover:bg-[color-mix(in_srgb,var(--destructive)_12%,transparent)]">
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete
                  </button>
                </div>
              )}
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}
