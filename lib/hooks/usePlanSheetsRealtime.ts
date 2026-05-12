"use client";

/**
 * usePlanSheetsRealtime — subscribes to Supabase Realtime on site_walk_plan_sheets
 * for a given project.  When Trigger.dev finishes rasterizing a PDF and writes
 * rasterized_key / rasterized_width / rasterized_height, this hook merges the
 * update into local state so PlanViewerLeaflet switches to Leaflet automatically
 * without a page refresh.
 */

import { useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { SiteWalkPlanSheet } from "@/lib/types/site-walk";

export function usePlanSheetsRealtime(
  initialSheets: SiteWalkPlanSheet[],
  projectId: string | null,
): SiteWalkPlanSheet[] {
  const [sheets, setSheets] = useState<SiteWalkPlanSheet[]>(initialSheets);
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Re-sync local state whenever server-side initial data changes (e.g. client re-mount).
  useEffect(() => {
    setSheets(initialSheets);
  }, [initialSheets]);

  useEffect(() => {
    if (!projectId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`plan-sheets:${projectId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "site_walk_plan_sheets",
          filter: `project_id=eq.${projectId}`,
        },
        (payload) => {
          const updated = payload.new as SiteWalkPlanSheet;
          setSheets((prev) =>
            prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)),
          );
        },
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [projectId]);

  return sheets;
}
