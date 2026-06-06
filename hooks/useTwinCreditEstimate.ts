"use client";

import { useEffect, useState } from "react";

export type TwinCreditEstimate = {
  creditsRequired: number;
  creditsBalance: number;
  sufficient: boolean;
  assetCount: number;
};

export function useTwinCreditEstimate(captureId: string | null, enabled = true) {
  const [estimate, setEstimate] = useState<TwinCreditEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!captureId || !enabled) {
      setEstimate(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void fetch(`/api/digital-twin/jobs/estimate?capture_id=${encodeURIComponent(captureId)}`)
      .then(async (res) => {
        const data = (await res.json().catch(() => ({}))) as {
          estimate?: TwinCreditEstimate;
          error?: string;
        };
        if (!res.ok) throw new Error(data.error ?? "Could not load credit estimate");
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
  }, [captureId, enabled]);

  return { estimate, loading, error };
}
