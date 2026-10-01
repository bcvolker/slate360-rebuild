"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { APPEARANCE_STALL_MS, withProxyFallback } from "@/lib/digital-twin/asset-progress";

export type AppearanceFetchState = {
  objectUrl: string | null;
  loadedBytes: number;
  totalBytes: number | null;
  lastProgressAt: number;
  bytesPerSecond: number;
  stalled: boolean;
  failed: boolean;
  retry: () => void;
};

const EMPTY: Omit<AppearanceFetchState, "retry"> = {
  objectUrl: null,
  loadedBytes: 0,
  totalBytes: null,
  lastProgressAt: 0,
  bytesPerSecond: 0,
  stalled: false,
  failed: false,
};

export function useKitchenAppearanceFetch(url: string | null, failFast = false): AppearanceFetchState {
  const [state, setState] = useState(EMPTY);
  const [nonce, setNonce] = useState(0);
  const objectUrlRef = useRef<string | null>(null);

  const retry = useCallback(() => {
    setNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (failFast) {
      setState({ ...EMPTY, failed: true });
      return;
    }
    if (!url) {
      setState(EMPTY);
      return;
    }
    let cancelled = false;
    const started = performance.now();
    const controller = new AbortController();
    let lastAt = started;
    let lastBytes = 0;
    const tick = window.setInterval(() => {
      setState((prev) => {
        if (prev.objectUrl || prev.failed) return prev;
        const stalled = performance.now() - prev.lastProgressAt >= APPEARANCE_STALL_MS;
        return stalled === prev.stalled ? prev : { ...prev, stalled };
      });
    }, 1000);

    setState({ ...EMPTY, lastProgressAt: started });

    (async () => {
      const attempt = async (target: string) => {
        const res = await fetch(target, { signal: controller.signal, cache: "force-cache", redirect: "follow" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const total = Number(res.headers.get("content-length") || 0) || null;
        const reader = res.body?.getReader();
        if (!reader) throw new Error("empty body");
        const chunks: Uint8Array[] = [];
        let received = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            chunks.push(value);
            received += value.byteLength;
            const now = performance.now();
            const dt = Math.max(1, now - lastAt);
            const bps = ((received - lastBytes) / dt) * 1000;
            lastAt = now;
            lastBytes = received;
            if (!cancelled) {
              setState((prev) => ({
                ...prev,
                loadedBytes: received,
                totalBytes: total,
                lastProgressAt: now,
                bytesPerSecond: bps,
                stalled: false,
                failed: false,
              }));
            }
          }
        }
        const buf = new Uint8Array(received);
        let offset = 0;
        for (const chunk of chunks) {
          buf.set(chunk, offset);
          offset += chunk.byteLength;
        }
        return buf;
      };

      try {
        let buf: Uint8Array;
        try {
          buf = await attempt(url);
        } catch (err) {
          if (cancelled) return;
          buf = await attempt(withProxyFallback(url));
          void err;
        }
        if (cancelled) return;
        if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
        const copy = new Uint8Array(buf.byteLength);
        copy.set(buf);
        const blobUrl = URL.createObjectURL(new Blob([copy], { type: "application/octet-stream" }));
        objectUrlRef.current = blobUrl;
        setState({
          objectUrl: blobUrl,
          loadedBytes: buf.byteLength,
          totalBytes: buf.byteLength,
          lastProgressAt: performance.now(),
          bytesPerSecond: 0,
          stalled: false,
          failed: false,
        });
      } catch {
        if (!cancelled) setState((prev) => ({ ...prev, failed: true, stalled: false }));
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearInterval(tick);
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [url, nonce, failFast]);

  return { ...state, retry };
}
