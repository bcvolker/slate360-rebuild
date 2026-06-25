"use client";

import { useEffect, useRef, useState } from "react";
import { REALTIME_LISTEN_TYPES } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type TourJobSnapshot = {
  id: string;
  scene_id: string | null;
  status: string;
  stage: string | null;
  progress_pct: number;
  error_log: string | null;
};

/**
 * Subscribes to a tour's processing jobs + scene rows so the workspace reflects Modal
 * ingest progress (uploading → processing → ready/failed) without polling. Mirrors
 * useThermalJobRealtime. `onChange` fires on any relevant row change so the container
 * can re-fetch scenes; the latest job snapshot is also returned for inline status.
 */
export function useTourRealtime(tourId: string | null, onChange?: () => void) {
  const [job, setJob] = useState<TourJobSnapshot | null>(null);
  const [connected, setConnected] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!tourId) return;
    const supabase = createClient();

    const channel = supabase
      .channel(`tour:${tourId}`)
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        { event: "*", schema: "public", table: "tour_processing_jobs", filter: `tour_id=eq.${tourId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as TourJobSnapshot | undefined;
          if (row?.id) setJob(row);
          onChangeRef.current?.();
        },
      )
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        { event: "*", schema: "public", table: "tour_scenes", filter: `tour_id=eq.${tourId}` },
        () => onChangeRef.current?.(),
      )
      .subscribe((status) => setConnected(String(status).includes("SUBSCRIBED")));

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [tourId]);

  return { job, connected };
}
