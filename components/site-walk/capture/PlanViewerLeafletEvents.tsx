"use client";

import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import L from "leaflet";
import { useMap, useMapEvents } from "react-leaflet";
import type { PlanViewerPin } from "./PlanPin";
import { createClientPinId, type QuickMenuState } from "./planViewerModel";

type Props = {
  toolMode: "pan" | "draw";
  imageWidth: number;
  imageHeight: number;
  sessionId: string;
  pins: PlanViewerPin[];
  setPins: Dispatch<SetStateAction<PlanViewerPin[]>>;
  setQuickMenu: Dispatch<SetStateAction<QuickMenuState>>;
};

const LONG_PRESS_MS = 550;
const MOVE_CANCEL_PX = 10;

export function PlanViewerLeafletEvents({ toolMode, imageWidth, imageHeight, sessionId, pins, setPins, setQuickMenu }: Props) {
  const map = useMap();
  const timerRef = useRef<number | null>(null);
  const pressRef = useRef<{ pointerId: number; x: number; y: number; pointerCount: number } | null>(null);
  const pointerCountRef = useRef(0);
  const lastCreateAtRef = useRef(0);

  const createPinAtLatLng = useCallback((latLng: L.LatLng) => {
    if (Date.now() - lastCreateAtRef.current < 700) return;
    const yPct = (latLng.lat / imageHeight) * 100;
    const xPct = (latLng.lng / imageWidth) * 100;
    if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) return;
    lastCreateAtRef.current = Date.now();
    const clientPinId = createClientPinId();
    const newPin: PlanViewerPin = {
      id: clientPinId,
      client_pin_id: clientPinId,
      x_pct: xPct,
      y_pct: yPct,
      session_id: sessionId,
      label: String(pins.length + 1).padStart(2, "0"),
      amber: true,
      item_id: null,
    };
    console.log("[PLAN_WALK] coordinates calculated", { xPct, yPct, clientPinId });
    setPins((current) => [...current, newPin]);
    setQuickMenu({ clientPinId, xPct, yPct });
    console.log("[PLAN_WALK] action menu opened");
    if (navigator.vibrate) navigator.vibrate(50);
  }, [imageHeight, imageWidth, pins.length, sessionId, setPins, setQuickMenu]);

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
      }, LONG_PRESS_MS);
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
      createPinAtLatLng(event.latlng);
    },
    contextmenu(event) {
      createPinAtLatLng(event.latlng);
    },
  });

  return null;
}

function isMarkerEventTarget(target: EventTarget | null) {
  return target instanceof HTMLElement && Boolean(target.closest(".leaflet-marker-icon"));
}
