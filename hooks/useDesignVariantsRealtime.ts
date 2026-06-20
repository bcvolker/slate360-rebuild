"use client";

import { useEffect, useState } from "react";
import { REALTIME_LISTEN_TYPES } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { DesignVariant } from "@/lib/design-studio/internal-types";

/**
 * Live variants for a session: loads existing variants, then subscribes so the
 * viewer + gallery reflect queued → processing → ready in real time.
 */
export function useDesignVariantsRealtime(sessionId: string | null) {
  const [variants, setVariants] = useState<DesignVariant[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      setVariants([]);
      setConnected(false);
      return;
    }

    const supabase = createClient();

    const channel = supabase
      .channel(`ds-variants:${sessionId}`)
      .on(
        REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
        { event: "*", schema: "public", table: "design_variants", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as DesignVariant | undefined;
          if (!row?.id) return;
          setVariants((prev) => {
            const idx = prev.findIndex((v) => v.id === row.id);
            if (idx === -1) return [...prev, row];
            const next = prev.slice();
            next[idx] = row;
            return next;
          });
        },
      )
      .subscribe((status) => setConnected(String(status).includes("SUBSCRIBED")));

    void supabase
      .from("design_variants")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data) setVariants(data as DesignVariant[]);
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [sessionId]);

  return { variants, connected };
}
