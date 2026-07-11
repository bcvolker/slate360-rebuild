"use client";

import { useEffect, useState } from "react";
import { REALTIME_LISTEN_TYPES } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type ThermalJobSnapshot = {
  id: string;
  status: string;
  progress_pct: number;
  stage: string | null;
  error_log: string | null;
  created_at: string | null;
  job_type?: string;
  partial?: boolean;
  failed_capture_ids?: string[];
  input_capture_ids?: string[];
};

export function useThermalJobRealtime(sessionId: string | null) {
  const [job, setJob] = useState<ThermalJobSnapshot | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setJob(null);
      setConnected(false);
      return;
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`thermal-jobs:${sessionId}`)
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: "*",
          schema: "public",
          table: "thermal_processing_jobs",
          filter: `session_id=eq.${sessionId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as ThermalJobSnapshot | undefined;
          if (row?.id) setJob(row);
        },
      )
      .subscribe((status) => {
        setConnected(String(status).includes("SUBSCRIBED"));
      });

    void supabase
      .from("thermal_processing_jobs")
      .select(
        "id, status, progress_pct, stage, error_log, created_at, job_type, partial, failed_capture_ids, input_capture_ids",
      )
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setJob(data as ThermalJobSnapshot);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return { job, connected };
}
