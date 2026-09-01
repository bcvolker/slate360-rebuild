"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type GlbLoadState = {
  status: "idle" | "loading" | "ready" | "error";
  progress: number;
  bytes: number;
  loadMs: number | null;
  triangles: number;
  geometry: THREE.BufferGeometry | null;
  error: string | null;
};

const EMPTY: GlbLoadState = {
  status: "idle",
  progress: 0,
  bytes: 0,
  loadMs: null,
  triangles: 0,
  geometry: null,
  error: null,
};

export function useKitchenGlb(url: string | null, timeoutMs = 90_000): GlbLoadState {
  const [state, setState] = useState<GlbLoadState>(EMPTY);

  useEffect(() => {
    if (!url) {
      setState(EMPTY);
      return;
    }
    let cancelled = false;
    const started = performance.now();
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    setState({ ...EMPTY, status: "loading" });

    (async () => {
      try {
        const res = await fetch(url, { signal: controller.signal, cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const total = Number(res.headers.get("content-length") || 0);
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
            if (!cancelled && total > 0) {
              setState((prev) => ({ ...prev, status: "loading", progress: received / total, bytes: received }));
            }
          }
        }
        const buf = new Uint8Array(received);
        let offset = 0;
        for (const chunk of chunks) {
          buf.set(chunk, offset);
          offset += chunk.byteLength;
        }
        const geometry = await parseGlb(buf.buffer);
        const idx = geometry.getIndex();
        const tris = idx ? idx.count / 3 : 0;
        if (!cancelled) {
          setState({
            status: "ready",
            progress: 1,
            bytes: received,
            loadMs: performance.now() - started,
            triangles: tris,
            geometry,
            error: null,
          });
        }
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : "";
        const message = err instanceof Error ? err.message : "load failed";
        setState({
          ...EMPTY,
          status: "error",
          error: name === "AbortError" ? "Timed out loading geometry" : message,
        });
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [url, timeoutMs]);

  return state;
}

function parseGlb(buffer: ArrayBuffer): Promise<THREE.BufferGeometry> {
  const loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.parse(
      buffer,
      "",
      (gltf) => {
        let found: THREE.Mesh | null = null;
        gltf.scene.traverse((child) => {
          const mesh = child as THREE.Mesh;
          if (!found && mesh.isMesh) found = mesh;
        });
        if (!found) {
          reject(new Error("GLB has no mesh"));
          return;
        }
        const geom = found.geometry;
        if (!geom.getAttribute("normal")) geom.computeVertexNormals();
        resolve(geom);
      },
      (err) => reject(err),
    );
  });
}
