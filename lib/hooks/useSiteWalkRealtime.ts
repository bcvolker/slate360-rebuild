/**
 * lib/hooks/useSiteWalkRealtime.ts
 *
 * Subscribes to Supabase Realtime broadcasts on `site_walk_items` and
 * `site_walk_pins` filtered by the active session. Fires callbacks on
 * INSERT / UPDATE / DELETE so the consuming provider can optimistically
 * mutate local state for an instant multi-user experience.
 *
 * Pins are filtered indirectly: pin rows reference `plan_id`, not
 * `session_id`. We subscribe to ALL pin events for the org (cheap — pin
 * mutations are infrequent) and let the consumer filter by plan/session.
 */
"use client";

import { useEffect } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export interface SiteWalkRealtimeHandlers<TItem extends Record<string, unknown> = Record<string, unknown>, TPin extends Record<string, unknown> = Record<string, unknown>> {
  onItemInsert?: (row: TItem) => void;
  onItemUpdate?: (row: TItem, old: Partial<TItem>) => void;
  onItemDelete?: (row: Partial<TItem>) => void;
  onPinInsert?: (row: TPin) => void;
  onPinUpdate?: (row: TPin, old: Partial<TPin>) => void;
  onPinDelete?: (row: Partial<TPin>) => void;
}

export function useSiteWalkRealtime<TItem extends Record<string, unknown> = Record<string, unknown>, TPin extends Record<string, unknown> = Record<string, unknown>>(
  sessionId: string | null,
  handlers: SiteWalkRealtimeHandlers<TItem, TPin>,
): void {
  useEffect(() => {
    if (!sessionId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`site-walk:${sessionId}`)
      .on(
        "postgres_changes" as never,
        {
          event: "*",
          schema: "public",
          table: "site_walk_items",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: RealtimePostgresChangesPayload<TItem>) => {
          if (payload.eventType === "INSERT" && handlers.onItemInsert) {
            handlers.onItemInsert(payload.new as TItem);
          } else if (payload.eventType === "UPDATE" && handlers.onItemUpdate) {
            handlers.onItemUpdate(payload.new as TItem, (payload.old ?? {}) as Partial<TItem>);
          } else if (payload.eventType === "DELETE" && handlers.onItemDelete) {
            handlers.onItemDelete((payload.old ?? {}) as Partial<TItem>);
          }
        },
      )
      .on(
        "postgres_changes" as never,
        {
          event: "*",
          schema: "public",
          table: "site_walk_pins",
        },
        (payload: RealtimePostgresChangesPayload<TPin>) => {
          if (payload.eventType === "INSERT" && handlers.onPinInsert) {
            handlers.onPinInsert(payload.new as TPin);
          } else if (payload.eventType === "UPDATE" && handlers.onPinUpdate) {
            handlers.onPinUpdate(payload.new as TPin, (payload.old ?? {}) as Partial<TPin>);
          } else if (payload.eventType === "DELETE" && handlers.onPinDelete) {
            handlers.onPinDelete((payload.old ?? {}) as Partial<TPin>);
          }
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // Handlers are intentionally omitted — caller should pass a stable ref
    // or accept that resubscribing on every render is acceptable for a
    // single active session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);
}
