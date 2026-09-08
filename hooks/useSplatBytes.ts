"use client";

import { useEffect, useRef, useState } from "react";

export type SplatBytesState = {
  bytes: Uint8Array | null;
  error: string | null;
};

/**
 * Downloads a splat file ourselves so the viewer sees REAL byte progress.
 *
 * Why: handing Spark a URL means Spark fetches inside its worker and the
 * `onProgress` callback never fires for the LOD/ExtSplats path, so the
 * viewer's stall watchdog saw "no data received" while the model was in fact
 * loading — the share page showed "Connection stalled" over a live splat.
 * Streaming here feeds progress on every chunk and hands Spark the finished
 * bytes (`fileBytes`), which it decodes locally.
 */
export function useSplatBytes(
  url: string | null,
  onProgress?: (loaded: number, total: number | null) => void,
): SplatBytesState {
  const [state, setState] = useState<SplatBytesState>({ bytes: null, error: null });
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;

  useEffect(() => {
    setState({ bytes: null, error: null });
    if (!url) return;
    const controller = new AbortController();
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        // Vercel may Brotli-compress the response, in which case Content-Length is absent
        // or refers to the compressed size; treat it as a hint only.
        const hinted = Number(res.headers.get("content-length") || 0);
        const total = res.headers.get("content-encoding") ? null : hinted > 0 ? hinted : null;
        const reader = res.body?.getReader();
        if (!reader) throw new Error("empty response body");
        const chunks: Uint8Array[] = [];
        let loaded = 0;
        progressRef.current?.(0, total);
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            loaded += value.length;
            progressRef.current?.(loaded, total);
          }
        }
        const out = new Uint8Array(loaded);
        let offset = 0;
        for (const c of chunks) {
          out.set(c, offset);
          offset += c.length;
        }
        // Signal "fully downloaded" so the viewer switches from the stall clock to the decode clock.
        progressRef.current?.(loaded, loaded);
        if (!cancelled) setState({ bytes: out, error: null });
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        setState({ bytes: null, error: err instanceof Error ? err.message : "download failed" });
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [url]);

  return state;
}
