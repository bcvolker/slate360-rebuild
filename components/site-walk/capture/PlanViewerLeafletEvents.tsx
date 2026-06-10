"use client";

import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import L from "leaflet";
import { useMap, useMapEvents } from "react-leaflet";
import type { PlanViewerPin } from "./PlanPin";
import { createClientPinId, type QuickMenuState } from "./planViewerModel";
import { PLAN_PIN_MARKER } from "@/lib/capture-v2/plan-pin-marker-tokens";

export type PlanPinDropPayload = {
  clientPinId: string;
  planSheetId: string;
  xPct: number;
  yPct: number;
  pinNumber: number;
  pin: PlanViewerPin;
};

type Props = {
  toolMode: "pan" | "draw";
  imageWidth: number;
  imageHeight: number;
  sessionId: string;
  planSheetId: string;
  pins: PlanViewerPin[];
  setPins: Dispatch<SetStateAction<PlanViewerPin[]>>;
  setQuickMenu: Dispatch<SetStateAction<QuickMenuState>>;
  onPinDropped?: (payload: PlanPinDropPayload) => void;
  onPersistPin?: (pin: PlanViewerPin) => Promise<{ id: string } | null>;
  useSourcePickerFlow?: boolean;
};

const MOVE_CANCEL_PX = 10;

export function PlanViewerLeafletEvents({
  toolMode,
  imageWidth,
  imageHeight,
  sessionId,
  planSheetId,
  pins,
  setPins,
  setQuickMenu,
  onPinDropped,
  onPersistPin,
  useSourcePickerFlow = false,
}: Props) {
  const map = useMap();
  const timerRef = useRef<number | null>(null);
  const pressRef = useRef<{ pointerId: number; x: number; y: number; pointerCount: number } | null>(null);
  const pointerCountRef = useRef(0);
  const sessionPinCount = pins.filter((pin) => pin.session_id === sessionId).length;

  const createPinAtLatLng = useCallback((latLng: L.LatLng) => {
    const yPct = (latLng.lat / imageHeight) * 100;
    const xPct = (latLng.lng / imageWidth) * 100;
    if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) return;
    const clientPinId = createClientPinId();
    const pinNumber = sessionPinCount + 1;
    const newPin: PlanViewerPin = {
      id: clientPinId,
      client_pin_id: clientPinId,
      x_pct: xPct,
      y_pct: yPct,
      session_id: sessionId,
      label: String(pinNumber).padStart(2, "0"),
      amber: true,
      item_id: null,
    };
    setPins((current) => [...current, newPin]);

    const finalizeDrop = (serverId: string | null) => {
      const reconciled = { ...newPin, id: serverId ?? newPin.id };
      if (useSourcePickerFlow && onPinDropped) {
        onPinDropped({
          clientPinId,
          planSheetId,
          xPct,
          yPct,
          pinNumber,
          pin: reconciled,
        });
        return;
      }
      setQuickMenu({ clientPinId, xPct, yPct });
    };

    if (onPersistPin) {
      void onPersistPin(newPin).then((saved) => {
        if (!saved?.id) {
          finalizeDrop(null);
          return;
        }
        setPins((current) =>
          current.map((entry) =>
            entry.client_pin_id === clientPinId ? { ...entry, id: saved.id } : entry,
          ),
        );
        finalizeDrop(saved.id);
      });
      return;
    }

    finalizeDrop(null);
    if (navigator.vibrate) navigator.vibrate(50);
  }, [
    imageHeight,
    imageWidth,
    onPersistPin,
    onPinDropped,
    planSheetId,
    sessionId,
    sessionPinCount,
    setPins,
    setQuickMenu,
    useSourcePickerFlow,
  ]);

  useEffect(() => {
    if (toolMode === "draw") map.dragging.disable();
    else map.dragging.enable();
  }, [map, toolMode]);

  useEffect(() => {
    const container = map.getContainer();

    function clearTimer() {
      if (timerRef.current) window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    function endPress() {
      clearTimer();
      pressRef.current = null;
      pointerCountRef.current = Math.max(0, pointerCountRef.current - 1);
    }

    function handlePointerDown(event: PointerEvent) {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      if (isMarkerEventTarget(event.target)) return;
      pointerCountRef.current += 1;
      if (pointerCountRef.current > 1) {
        clearTimer();
        return;
      }
      pressRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, pointerCount: pointerCountRef.current };
      clearTimer();
      timerRef.current = window.setTimeout(() => {
        const press = pressRef.current;
        if (!press || press.pointerId !== event.pointerId || press.pointerCount !== 1 || pointerCountRef.current !== 1) return;
        const latLng = map.mouseEventToLatLng(event as unknown as MouseEvent);
        console.log("[PLAN_WALK] long press detected");
        createPinAtLatLng(latLng);
        pressRef.current = null;
      }, PLAN_PIN_MARKER.longPressMs);
    }

    function handlePointerMove(event: PointerEvent) {
      const press = pressRef.current;
      if (!press || press.pointerId !== event.pointerId) return;
      if (Math.hypot(event.clientX - press.x, event.clientY - press.y) > MOVE_CANCEL_PX) {
        clearTimer();
        pressRef.current = null;
      }
    }

    container.addEventListener("pointerdown", handlePointerDown, { passive: true });
    container.addEventListener("pointermove", handlePointerMove, { passive: true });
    container.addEventListener("pointerup", endPress, { passive: true });
    container.addEventListener("pointercancel", endPress, { passive: true });
    container.addEventListener("pointerleave", endPress, { passive: true });
    return () => {
      clearTimer();
      container.removeEventListener("pointerdown", handlePointerDown);
      container.removeEventListener("pointermove", handlePointerMove);
      container.removeEventListener("pointerup", endPress);
      container.removeEventListener("pointercancel", endPress);
      container.removeEventListener("pointerleave", endPress);
    };
  }, [map, createPinAtLatLng]);

  useMapEvents({
    click(event) {
      if (toolMode !== "draw") return;
      if (isMarkerEventTarget(event.originalEvent.target)) return;
      createPinAtLatLng(event.latlng);
    },
    contextmenu(event) {
      if (isMarkerEventTarget(event.originalEvent.target)) return;
      createPinAtLatLng(event.latlng);
    },
  });

  return null;
}

function isMarkerEventTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest(".leaflet-marker-icon"));
}
