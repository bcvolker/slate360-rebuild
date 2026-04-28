"use client";

import { useEffect, useRef } from "react";
import {
  REALTIME_LISTEN_TYPES,
  REALTIME_POSTGRES_CHANGES_LISTEN_EVENT,
  type RealtimeChannel,
  type RealtimePostgresChangesPayload,
} from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { LiveWalkItem, LiveWalkSession } from "./live-walk-types";

type Handlers = {
  onItemInsert?: (item: LiveWalkItem) => void;
  onItemUpdate?: (item: LiveWalkItem) => void;
  onItemDelete?: (itemId: string) => void;
  onSessionUpdate?: (session: Partial<LiveWalkSession>) => void;
};

export function useRealtimeWalk(sessionId: string, handlers: Handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    const supabase = createClient();
    const channel: RealtimeChannel = supabase
      .channel(`site-walk-live:${sessionId}`)
      .on<LiveWalkItem>(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.ALL,
          schema: "public",
          table: "site_walk_items",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload: RealtimePostgresChangesPayload<LiveWalkItem>) => {
          if (payload.eventType === "INSERT") handlersRef.current.onItemInsert?.(payload.new as LiveWalkItem);
          if (payload.eventType === "UPDATE") handlersRef.current.onItemUpdate?.(payload.new as LiveWalkItem);
          if (payload.eventType === "DELETE") handlersRef.current.onItemDelete?.(String(payload.old.id));
        },
      )
      .on<Partial<LiveWalkSession>>(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.UPDATE,
          schema: "public",
          table: "site_walk_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload: RealtimePostgresChangesPayload<Partial<LiveWalkSession>>) => {
          handlersRef.current.onSessionUpdate?.(payload.new as Partial<LiveWalkSession>);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);
}
