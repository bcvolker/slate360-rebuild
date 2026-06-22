"use client";

import { useEffect, useState } from "react";

/**
 * Builds a session-wide `item_id → plan_sheet_id` index from every pin in the
 * session (across all sheets). The drawings walk uses it for cross-sheet stop
 * nav: selecting a stop whose pin lives on another sheet can switch sheets
 * before panning. Refetched whenever `pinRefreshKey` bumps (a new capture), so
 * freshly-pinned stops become navigable.
 */
export function useSessionPinSheetIndex({
  sessionId,
  pinRefreshKey,
}: {
  sessionId: string | null | undefined;
  pinRefreshKey: number;
}) {
  const [index, setIndex] = useState<Map<string, string>>(() => new Map());

  useEffect(() => {
    if (!sessionId) {
      setIndex(new Map());
      return;
    }
    let cancelled = false;
    fetch(`/api/site-walk/pins?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" })
      .then((r) =>
        r.ok
          ? (r.json() as Promise<{
              pins?: Array<{ item_id: string | null; plan_sheet_id: string | null }>;
            }>)
          : null,
      )
      .then((data) => {
        if (cancelled || !data?.pins) return;
        const next = new Map<string, string>();
        for (const pin of data.pins) {
          if (pin.item_id && pin.plan_sheet_id) next.set(pin.item_id, pin.plan_sheet_id);
        }
        setIndex(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [sessionId, pinRefreshKey]);

  return index;
}
