"use client";

import { useEffect, useState } from "react";

export type AppearanceProbe = {
  status: "idle" | "missing" | "ready" | "error";
  ms: number | null;
};

const IDLE: AppearanceProbe = { status: "idle", ms: null };

/** Never blocks the scene. A 404 is a finished "missing" result. */
export function useAppearanceProbe(url: string | null): AppearanceProbe {
  const [state, setState] = useState<AppearanceProbe>(IDLE);
  useEffect(() => {
    if (!url) {
      setState({ status: "missing", ms: 0 });
      performance.mark("twin-appearance-ready");
      return;
    }
    let cancelled = false;
    const t0 = performance.now();
    setState(IDLE);
    fetch(url, { method: "GET", cache: "force-cache" })
      .then(async (res) => {
        if (cancelled) return;
        const ms = performance.now() - t0;
        try {
          await res.body?.cancel();
        } catch {
          /* ignore */
        }
        if (!res.ok) {
          setState({ status: "missing", ms });
        } else {
          setState({ status: "ready", ms });
        }
        performance.mark("twin-appearance-ready");
      })
      .catch(() => {
        if (cancelled) return;
        setState({ status: "error", ms: performance.now() - t0 });
        performance.mark("twin-appearance-ready");
      });
    return () => {
      cancelled = true;
    };
  }, [url]);
  return state;
}
