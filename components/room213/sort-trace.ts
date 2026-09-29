"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { SparkRenderer } from "@sparkjsdev/spark";

/** One frame of the read-only sort trace (probe / internal only). */
export type SortSample = {
  t: number; // ms since page start
  dt: number; // frame interval, ms
  pos: [number, number, number];
  /** Camera heading/tilt (deg) and the pose/direction the displayed order was computed for. */
  yawDeg: number;
  pitchDeg: number;
  shownPos: [number, number, number] | null;
  sortRadial: boolean;
  /** How far the camera is from the position the DISPLAYED splat order (last completed sort) was computed for. */
  dPos: number;
  /** Angle between the camera's view direction and the sorted direction (degrees). */
  dAngDeg: number;
  /** Time since the last completed sort (ms) and how long it took. */
  sortAgeMs: number;
  lastSortMs: number;
  sorting: boolean;
  maxPixelRadius: number;
};

type SparkSortState = {
  sorting?: boolean;
  sortedCenter?: THREE.Vector3;
  sortedDir?: THREE.Vector3;
  maxPixelRadius?: number;
  sortRadial?: boolean;
};

const SIZE = 900; // ~15–30 s of frames
const tmpPos = new THREE.Vector3();
const tmpDir = new THREE.Vector3();

/**
 * READ-ONLY diagnostic: every frame, how stale is the displayed depth order relative to the camera? It only reads
 * Spark's public-ish state (sorting / sortedCenter / sortedDir) and never writes to it. Runs only when the probe
 * hooks exist (?probe=1 / ?internal=1); normal viewers never execute the body. Exposed as window.__r213.sortTrace().
 */
export function useSortTrace(spark: SparkRenderer | null, camera: THREE.Camera) {
  const buf = useRef<SortSample[]>([]);
  const st = useRef({ sorting: false, started: 0, completedAt: 0, lastMs: 0, lastT: 0 });
  // Spark overwrites sortedCenter/sortedDir when a sort STARTS; the order on screen belongs to the last COMPLETED
  // sort, so capture its pose at the completion edge.
  const shown = useRef({ center: new THREE.Vector3(Number.NaN, 0, 0), dir: new THREE.Vector3() });
  useFrame(() => {
    const w = window as unknown as { __r213?: Record<string, unknown> };
    if (!w.__r213 || !spark) return;
    const s = spark as unknown as SparkSortState;
    const now = performance.now();
    const k = st.current;
    if (s.sorting && !k.sorting) k.started = now;
    if (!s.sorting && k.sorting) {
      k.completedAt = now;
      k.lastMs = now - k.started;
      if (s.sortedCenter) shown.current.center.copy(s.sortedCenter);
      if (s.sortedDir) shown.current.dir.copy(s.sortedDir);
    } else if (!s.sorting && s.sortedCenter && !Number.isFinite(shown.current.center.x)) {
      shown.current.center.copy(s.sortedCenter); // first sort finished before tracing began
      if (s.sortedDir) shown.current.dir.copy(s.sortedDir);
    }
    k.sorting = !!s.sorting;
    camera.getWorldPosition(tmpPos);
    camera.getWorldDirection(tmpDir);
    const c = shown.current.center;
    const dPos = Number.isFinite(c.x) ? tmpPos.distanceTo(c) : -1;
    const dot = shown.current.dir.lengthSq() > 0 ? THREE.MathUtils.clamp(tmpDir.dot(shown.current.dir), -1, 1) : 1;
    const sample: SortSample = {
      t: Math.round(now),
      dt: k.lastT ? Math.round(now - k.lastT) : 0,
      pos: [+tmpPos.x.toFixed(3), +tmpPos.y.toFixed(3), +tmpPos.z.toFixed(3)],
      yawDeg: +THREE.MathUtils.radToDeg(Math.atan2(-tmpDir.x, -tmpDir.z)).toFixed(1),
      pitchDeg: +THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(tmpDir.y, -1, 1))).toFixed(1),
      shownPos: Number.isFinite(c.x) ? [+c.x.toFixed(3), +c.y.toFixed(3), +c.z.toFixed(3)] : null,
      sortRadial: s.sortRadial ?? true,
      dPos: +dPos.toFixed(3),
      dAngDeg: +THREE.MathUtils.radToDeg(Math.acos(dot)).toFixed(1),
      sortAgeMs: k.completedAt ? Math.round(now - k.completedAt) : -1,
      lastSortMs: Math.round(k.lastMs),
      sorting: k.sorting,
      maxPixelRadius: s.maxPixelRadius ?? -1,
    };
    k.lastT = now;
    const b = buf.current;
    b.push(sample);
    if (b.length > SIZE) b.shift();
    w.__r213.sortTrace = () => [...buf.current];
    w.__r213.sortNow = () => buf.current.at(-1) ?? null;
  });
}

/** Summary of the last `ms` of samples for the internal panel (max displacement from the sorted pose, etc.). */
export function summarizeTrace(samples: SortSample[], ms = 2000) {
  if (!samples.length) return null;
  const end = samples[samples.length - 1].t;
  const win = samples.filter((x) => end - x.t <= ms);
  const now = samples[samples.length - 1];
  return {
    now,
    maxDPos: Math.max(...win.map((x) => x.dPos)),
    maxDAng: Math.max(...win.map((x) => x.dAngDeg)),
    maxAge: Math.max(...win.map((x) => x.sortAgeMs)),
    fps: win.length > 1 ? Math.round((1000 * (win.length - 1)) / Math.max(1, end - win[0].t)) : 0,
  };
}

/** Internal-only: copy (clipboard) or download the trace as JSON for lining up with a screen recording. */
export function exportTrace(mode: "copy" | "download") {
  const w = window as unknown as { __r213?: { sortTrace?: () => SortSample[] } };
  const json = JSON.stringify({ exportedAt: Math.round(performance.now()), ua: navigator.userAgent, samples: w.__r213?.sortTrace?.() ?? [] });
  if (mode === "copy") return navigator.clipboard?.writeText(json);
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  a.download = `room213-sort-trace-${Date.now()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
