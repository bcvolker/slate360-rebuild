"use client";

import { useEffect, useRef, useState } from "react";

import {
  checkPlyComplete,
  downloadBytes,
  resolveSignedSource,
  type DownloadSource,
} from "@/lib/digital-twin/splat-download";

export type SplatBytesState = {
  bytes: Uint8Array | null;
  error: string | null;
  /** Where the bytes came from: a short-lived direct object-storage URL, or the app's proxy route. */
  source: DownloadSource | null;
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
 *
 * `signedUrlEndpoint` (optional): a small authorized endpoint returning `{ url, bytes }` — a short-lived
 * presigned object-storage URL — so a large model downloads straight from storage instead of streaming
 * through a server function. If that path fails before completing (e.g. the bucket's CORS does not allow
 * this origin), the download falls back to `url`. Either way the bytes are verified complete before decode.
 */
export function useSplatBytes(
  url: string | null,
  onProgress?: (loaded: number, total: number | null) => void,
  signedUrlEndpoint?: string | null,
): SplatBytesState {
  const [state, setState] = useState<SplatBytesState>({ bytes: null, error: null, source: null });
  const progressRef = useRef(onProgress);
  progressRef.current = onProgress;

  useEffect(() => {
    setState({ bytes: null, error: null, source: null });
    if (!url) return;
    const controller = new AbortController();
    let cancelled = false;
    const progress = (loaded: number, total: number | null) => progressRef.current?.(loaded, total);
    (async () => {
      try {
        let bytes: Uint8Array | null = null;
        let source: DownloadSource = "proxy";
        if (signedUrlEndpoint) {
          try {
            const signed = await resolveSignedSource(signedUrlEndpoint, controller.signal);
            bytes = await downloadBytes(signed.url, controller.signal, signed.bytes, progress);
            source = "direct";
          } catch (err) {
            if (controller.signal.aborted) return;
            console.warn("[useSplatBytes] direct download failed, falling back to proxy:", err);
          }
        }
        if (!bytes) bytes = await downloadBytes(url, controller.signal, null, progress);
        const truncated = checkPlyComplete(bytes);
        if (truncated) throw new Error(truncated);
        // Signal "fully downloaded" so the viewer switches from the stall clock to the decode clock.
        progress(bytes.length, bytes.length);
        console.info(`[useSplatBytes] ${source} download complete: ${bytes.length} bytes`);
        if (!cancelled) setState({ bytes, error: null, source });
      } catch (err) {
        if (cancelled || controller.signal.aborted) return;
        setState({ bytes: null, error: err instanceof Error ? err.message : "download failed", source: null });
      }
    })();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [url, signedUrlEndpoint]);

  return state;
}
