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

  return { pins, setPins, persistPin };
}
