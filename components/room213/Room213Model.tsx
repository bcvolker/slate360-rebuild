"use client";

import { useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import type * as THREE from "three";
import { SplatFileType, SplatMesh } from "@sparkjsdev/spark";
import { markTiming } from "@/lib/room213/timing";

export type ModelProgress = { loaded: number; total: number | null; phase: "transfer" | "preparing" };

/**
 * Streams the model straight into Spark's decode worker (`stream` + `streamLength`): no main-thread copy of the
 * 247 MB file (Spark copies `fileBytes`, but forwards a stream chunk by chunk). One fetch, aborted on
 * unmount/retry; byte progress comes from the response body itself, so it is exact whenever Content-Length is.
 */
export function Room213Model({
  url,
  parent,
  onProgress,
  onLoaded,
  onError,
  visible = true,
  timed = true,
  paged = false,
}: {
  url: string;
  parent: THREE.Object3D | null;
  onProgress?: (p: ModelProgress) => void;
  onLoaded: (mesh: SplatMesh) => void;
  onError: (message: string) => void;
  /** Toggled without reloading (e.g. the Walk-only perimeter complement). */
  visible?: boolean;
  /** Record load-phase timings (the main model only). */
  timed?: boolean;
  /** Experiment only: paged RAD (Spark fetches chunks itself, progressively). */
  paged?: boolean;
}) {
  const meshRef = useRef<SplatMesh | null>(null);
  const invalidate = useThree((s) => s.invalidate);
  const cb = useRef({ onProgress, onLoaded, onError });
  cb.current = { onProgress, onLoaded, onError };
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  useEffect(() => {
    if (meshRef.current) meshRef.current.visible = visible;
    invalidate();
  }, [visible, invalidate]);

  useEffect(() => {
    if (!parent) return;
    // Probe-only diagnostic: how many times the loader effect starts (a second start = a re-fetch).
    const w = window as unknown as { __r213?: Record<string, unknown> };
    if (w.__r213) w.__r213.loaderRuns = [...((w.__r213.loaderRuns as string[] | undefined) ?? []), `${Math.round(performance.now())}:${url.split("/").pop()?.slice(0, 12)}`];
    const abort = new AbortController();
    let mesh: SplatMesh | null = null;
    let disposed = false;

    (async () => {
      if (timed) markTiming("modelRequest");
      if (paged) {
        mesh = new SplatMesh({ url, paged: true });
        mesh.rotation.set(Math.PI, 0, 0);
        await mesh.initialized;
        if (disposed) return;
        if (timed) markTiming("modelDecoded");
        mesh.visible = visibleRef.current;
        meshRef.current = mesh;
        parent.add(mesh);
        invalidate();
        cb.current.onProgress?.({ loaded: 0, total: null, phase: "preparing" });
        cb.current.onLoaded(mesh);
        return;
      }
      const res = await fetch(url, { signal: abort.signal });
      if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
      if (timed) markTiming("modelFirstByte");
      const lengthHeader = Number(res.headers.get("content-length"));
      const encoded = res.headers.get("content-encoding");
      // Content-Length is the ENCODED size when the transfer is compressed; only trust it for identity bodies.
      const total = Number.isFinite(lengthHeader) && lengthHeader > 0 && !encoded ? lengthHeader : null;
      let loaded = 0;
      let lastReport = 0;
      const counted = res.body.pipeThrough(
        new TransformStream<Uint8Array, Uint8Array>({
          transform(chunk, controller) {
            loaded += chunk.byteLength;
            const now = performance.now();
            if (now - lastReport > 150) {
              lastReport = now;
              cb.current.onProgress?.({ loaded, total, phase: "transfer" });
            }
            controller.enqueue(chunk);
          },
          flush() {
            if (timed) markTiming("modelTransferred");
            cb.current.onProgress?.({ loaded, total, phase: "preparing" });
          },
        }),
      );
      mesh = new SplatMesh({
        stream: counted,
        streamLength: total ?? undefined,
        fileType: SplatFileType.PLY,
        extSplats: true,
        lod: false,
      });
      mesh.rotation.set(Math.PI, 0, 0);
      await mesh.initialized;
      if (disposed) return;
      if (timed) markTiming("modelDecoded");
      mesh.visible = visibleRef.current;
      meshRef.current = mesh;
      parent.add(mesh);
      invalidate();
      cb.current.onLoaded(mesh);
    })().catch((err: unknown) => {
      if (disposed || abort.signal.aborted) return;
      cb.current.onError(err instanceof Error ? err.message : String(err));
    });

    return () => {
      disposed = true;
      abort.abort();
      meshRef.current = null;
      if (mesh) {
        mesh.removeFromParent();
        mesh.dispose();
      }
    };
  }, [url, parent, invalidate, timed, paged]);

  return null;
}
