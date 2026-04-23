/**
 * lib/hooks/useSiteWalkRealtime.ts
 *
 * Supabase Realtime integration for the active site-walk session.
 *
 * Two transport channels share one RealtimeChannel:
 *  1. `postgres_changes` — durable INSERT/UPDATE/DELETE events on
 *     `site_walk_items` (filtered by session_id) and `site_walk_pins`
 *     (org-scoped via RLS). Used to reconcile authoritative state.
 *  2. `broadcast` — ephemeral, low-latency cursor + drag positions for
 *     ghost rendering during pin drag / shape draw. NEVER persisted; we
 *     only hit the PATCH endpoint on dragEnd.
 *
 * Returns an API with `sendCursorMove` / `sendPinDrag` so the UI can
 * push ephemeral updates without re-subscribing.
 */
"use client";

import { useEffect, useRef } from "react";
import {
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  type RealtimeChannel,
  type RealtimePostgresChangesFilter,
  type RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/* ── Broadcast payload types ─────────────────────────────────────── */

export interface CursorMovePayload {
  userId: string;
  /** Page-relative coordinates as percent of plan width/height. */
  x: number;
  y: number;
  /** Optional plan id to scope the cursor to a specific page. */
  planId?: string;
}

export interface PinDragPayload {
  pinId: string;
  userId: string;
  x: number;
  y: number;
  planId?: string;
  /** True when the user releases — UI should commit via PATCH. */
  isFinal?: boolean;
}

const BROADCAST_EVENT_CURSOR = "cursor:move";
const BROADCAST_EVENT_PIN_DRAG = "pin:drag";

/* ── Hook handlers + return API ──────────────────────────────────── */

export interface SiteWalkRealtimeHandlers<
  TItem extends Record<string, unknown> = Record<string, unknown>,
  TPin extends Record<string, unknown> = Record<string, unknown>,
> {
  onItemInsert?: (row: TItem) => void;
  onItemUpdate?: (row: TItem, old: Partial<TItem>) => void;
  onItemDelete?: (row: Partial<TItem>) => void;
  onPinInsert?: (row: TPin) => void;
  onPinUpdate?: (row: TPin, old: Partial<TPin>) => void;
  onPinDelete?: (row: Partial<TPin>) => void;
  onCursorMove?: (payload: CursorMovePayload) => void;
  onPinDrag?: (payload: PinDragPayload) => void;
}

export interface SiteWalkRealtimeApi {
  /** Broadcast a cursor position to all peers in the channel. No-op until subscribed. */
  sendCursorMove: (payload: CursorMovePayload) => void;
  /** Broadcast a pin drag delta. Pass `isFinal: true` only for client UX hints. */
  sendPinDrag: (payload: PinDragPayload) => void;
}

/* ── Hook ────────────────────────────────────────────────────────── */

export function useSiteWalkRealtime<
  TItem extends Record<string, unknown> = Record<string, unknown>,
  TPin extends Record<string, unknown> = Record<string, unknown>,
>(
  sessionId: string | null,
  handlers: SiteWalkRealtimeHandlers<TItem, TPin>,
): SiteWalkRealtimeApi {
  const channelRef = useRef<RealtimeChannel | null>(null);
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!sessionId) return;
    const supabase = createClient();

    const itemsFilter: RealtimePostgresChangesFilter<
      `${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL}`
    > = {
      event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
      schema: "public",
      table: "site_walk_items",
      filter: `session_id=eq.${sessionId}`,
    };

    const pinsFilter: RealtimePostgresChangesFilter<
      `${REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL}`
    > = {
      event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
      schema: "public",
      table: "site_walk_pins",
    };

    const channel = supabase
      .channel(`site-walk:${sessionId}`)
      .on<TItem>(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        itemsFilter,
        (payload: RealtimePostgresChangesPayload<TItem>) => {
          const h = handlersRef.current;
          if (payload.eventType === "INSERT") {
            h.onItemInsert?.(payload.new as TItem);
          } else if (payload.eventType === "UPDATE") {
            h.onItemUpdate?.(
              payload.new as TItem,
              (payload.old ?? {}) as Partial<TItem>,
            );
          } else if (payload.eventType === "DELETE") {
            h.onItemDelete?.((payload.old ?? {}) as Partial<TItem>);
          }
        },
      )
      .on<TPin>(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        pinsFilter,
        (payload: RealtimePostgresChangesPayload<TPin>) => {
          const h = handlersRef.current;
          if (payload.eventType === "INSERT") {
            h.onPinInsert?.(payload.new as TPin);
          } else if (payload.eventType === "UPDATE") {
            h.onPinUpdate?.(
              payload.new as TPin,
              (payload.old ?? {}) as Partial<TPin>,
            );
          } else if (payload.eventType === "DELETE") {
            h.onPinDelete?.((payload.old ?? {}) as Partial<TPin>);
          }
        },
      )
      .on(
        REALTIME_LISTEN_TYPES.BROADCAST,
        { event: BROADCAST_EVENT_CURSOR },
        (msg) => {
          const payload = msg.payload as CursorMovePayload | undefined;
          if (payload && typeof payload.x === "number" && typeof payload.y === "number") {
            handlersRef.current.onCursorMove?.(payload);
          }
        },
      )
      .on(
        REALTIME_LISTEN_TYPES.BROADCAST,
        { event: BROADCAST_EVENT_PIN_DRAG },
        (msg) => {
          const payload = msg.payload as PinDragPayload | undefined;
          if (
            payload &&
            typeof payload.pinId === "string" &&
            typeof payload.x === "number" &&
            typeof payload.y === "number"
          ) {
            handlersRef.current.onPinDrag?.(payload);
          }
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channelRef.current = null;
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return {
    sendCursorMove: (payload) => {
      const ch = channelRef.current;
      if (!ch) return;
      void ch.send({
        type: "broadcast",
        event: BROADCAST_EVENT_CURSOR,
        payload,
      });
    },
    sendPinDrag: (payload) => {
      const ch = channelRef.current;
      if (!ch) return;
      void ch.send({
        type: "broadcast",
        event: BROADCAST_EVENT_PIN_DRAG,
        payload,
      });
    },
  };
}
