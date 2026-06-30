"use client";

import { useCallback, useEffect, useState } from "react";
import { dropPlanPin } from "@/lib/capture-v2/plan-pin-drop";
import type { SiteWalkPin } from "@/lib/types/site-walk-ops";
import { mapPlanPin, mergeFetchedPlanPins, type PlanViewerPin } from "./PlanPin";

type Args = {
  planSheetId: string | null | undefined;
  sessionId: string;
  projectId?: string | null;
  pinRefreshKey: number;
};

export function usePlanViewerLeafletPins({
  planSheetId,
  sessionId,
  projectId,
  pinRefreshKey,
}: Args) {
  const [pins, setPins] = useState<PlanViewerPin[]>([]);

  useEffect(() => {
    if (!planSheetId) {
      setPins([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/site-walk/pins?plan_sheet_id=${encodeURIComponent(planSheetId)}`, { cache: "no-store" })
      .then((r) =>
        r.ok
          ? (r.json() as Promise<{
              pins?: Array<{
                id: string;
                client_pin_id: string | null;
                plan_sheet_id: string;
                x_pct: number;
                y_pct: number;
                pin_number: number | null;
                label: string | null;
                session_id: string;
                item_id: string | null;
              }>;
            }>)
          : null,
      )
      .then((data) => {
        if (cancelled || !data?.pins) return;
        const fetched = data.pins.map((row, index) =>
          mapPlanPin(row as SiteWalkPin, index, sessionId),
        );
        setPins((current) => mergeFetchedPlanPins(current, fetched));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [planSheetId, pinRefreshKey, sessionId]);

  const persistPin = useCallback(
    async (pin: PlanViewerPin) => {
      if (!planSheetId || !pin.client_pin_id) return null;
      try {
        const saved = await dropPlanPin({
          planSheetId,
          sessionId,
          projectId,
          xPct: pin.x_pct,
          yPct: pin.y_pct,
          clientPinId: pin.client_pin_id,
          pinNumber: Number.parseInt(pin.label, 10) || 1,
        });
        return { id: saved.id };
      } catch {
        return null;
      }
    },
    [planSheetId, projectId, sessionId],
  );

  // Reposition a pin (drag) — optimistic local move + persist to the existing PATCH route.
  // Only saved pins (UUID id) hit the server; unsaved (client-id) pins move locally and keep
  // their new coords when they persist on creation.
  const movePin = useCallback(
    async (pinId: string, xPct: number, yPct: number) => {
      const clamp = (v: number) => Math.min(100, Math.max(0, v));
      const x = clamp(xPct);
      const y = clamp(yPct);
      let previous: { x: number; y: number } | null = null;
      setPins((current) =>
        current.map((p) => {
          if (p.id !== pinId) return p;
          previous = { x: p.x_pct, y: p.y_pct };
          return { ...p, x_pct: x, y_pct: y };
        }),
      );
      if (!UUID_RE.test(pinId)) return; // unsaved pin — local only
      try {
        const res = await fetch(`/api/site-walk/pins/${pinId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x_pct: x, y_pct: y }),
        });
        if (!res.ok) throw new Error(`move failed: ${res.status}`);
      } catch {
        // revert on failure so the marker doesn't lie about its saved position
        if (previous) {
          setPins((current) =>
            current.map((p) => (p.id === pinId ? { ...p, x_pct: previous!.x, y_pct: previous!.y } : p)),
          );
        }
      }
    },
    [],
  );

  return { pins, setPins, persistPin, movePin };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
