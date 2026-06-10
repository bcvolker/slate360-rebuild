"use client";

import { useEffect, useState } from "react";
import type {
  TwinJobCreditEstimate,
  TwinProcessingQuality,
} from "@/lib/twin/processing-estimate-types";
import type { TwinCreditAsset } from "@/lib/twin/processing-credits";

type Args = {
  sources: TwinCreditAsset[];
  frameCount: number;
  quality: TwinProcessingQuality;
  enabled?: boolean;
};

export function useTwinProcessingEstimate({ sources, frameCount, quality, enabled = true }: Args) {
  const [estimate, setEstimate] = useState<TwinJobCreditEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sourcesKey = JSON.stringify(sources);

  useEffect(() => {
    if (!enabled || sources.length === 0) {
      setEstimate(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetch("/api/digital-twin/jobs/estimate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sources,
        output_format: "spz",
        quality,
        frameCount,
      }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          estimate?: TwinJobCreditEstimate;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Could not load estimate");
        if (!cancelled) setEstimate(data.estimate ?? null);
      })
      .catch((err) => {
        if (!cancelled) {
          setEstimate(null);
          setError(err instanceof Error ? err.message : "Estimate unavailable");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, frameCount, quality, sources.length, sourcesKey]);

  return { estimate, loading, error };
}
