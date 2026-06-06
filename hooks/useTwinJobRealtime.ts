"use client";

import { useEffect, useState } from "react";
import { REALTIME_LISTEN_TYPES } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

export type TwinJobSnapshot = {
  id: string;
  status: string;
  progress_pct: number;
  output_format: string | null;
  job_type: string | null;
  error_text: string | null;
};

export function useTwinJobRealtime(captureId: string | null) {
  const [job, setJob] = useState<TwinJobSnapshot | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!captureId) {
      setJob(null);
      setConnected(false);
      return;
    }

    const supabase = createClient();
    const channel = supabase
      .channel(`dt-jobs:${captureId}`)
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        {
          event: "*",
          schema: "public",
          table: "digital_twin_processing_jobs",
          filter: `capture_id=eq.${captureId}`,
        },
        (payload) => {
          const row = (payload.new ?? payload.old) as TwinJobSnapshot | undefined;
          if (row?.id) setJob(row);
        },
      )
      .subscribe((status) => {
        setConnected(String(status).includes("SUBSCRIBED"));
      });

    void supabase
      .from("digital_twin_processing_jobs")
      .select("id, status, progress_pct, output_format, job_type, error_text")
      .eq("capture_id", captureId)
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setJob(data as TwinJobSnapshot);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [captureId]);

  return { job, connected };
}
