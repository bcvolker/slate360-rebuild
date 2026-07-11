"use client";

import { useEffect } from "react";
import { REALTIME_LISTEN_TYPES } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

/**
 * Audit remediation Batch 1: fires `onInsert` whenever a new `thermal_captures`
 * row lands for this session — upload finalize, or (the case with no other
 * client-side signal) a panorama-stitch callback landing asynchronously from
 * an externally-dispatched Modal job. Signal-only, mirrors the existing
 * `useThermalJobRealtime` channel shape; the caller decides what to do
 * (typically a captures refetch). Deliberately INSERT-only — capture *edits*
 * are reflected via the cheaper `save-status.ts` merge broadcast instead of
 * this channel, avoiding a race where a full refetch could clobber an
 * in-flight optimistic edit.
 */
export function useThermalCapturesRealtime(sessionId: string | null, onInsert: () => void) {
  useEffect(() => {
    if (!sessionId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`thermal-captures:${sessionId}`)
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        { event: "INSERT", schema: "public", table: "thermal_captures", filter: `session_id=eq.${sessionId}` },
        () => onInsert(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);
}
