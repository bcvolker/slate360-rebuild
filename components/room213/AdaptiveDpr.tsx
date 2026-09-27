"use client";

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

const WINDOW_MS = 3000;
const HOLD_MS = 10_000;
const TIERS = [2, 1.5, 1.25];

/**
 * Conservative adaptive pixel ratio. Starts at min(devicePixelRatio, 2); during sustained rendering, if the rolling
 * p90 frame interval over 3 s exceeds 40 ms → 1.5, over 50 ms → 1.25. Tiers only ever step DOWN (no oscillation),
 * at most once per 10 s, and hidden-tab / resize gaps are ignored. It trades pixels for frame time only — it does
 * not reduce splat count, sorting cost or memory.
 */
export function AdaptiveDpr({ enabled }: { enabled: boolean }) {
  const setDpr = useThree((s) => s.setDpr);
  const tier = useRef(0);
  const samples = useRef<{ t: number; dt: number }[]>([]);
  const lastChange = useRef(0);
  const last = useRef<number | null>(null);

  useEffect(() => {
    const start = Math.min(window.devicePixelRatio || 1, TIERS[0]);
    setDpr(start);
    tier.current = start <= TIERS[1] ? 1 : 0;
    const onResize = () => {
      last.current = null;
      samples.current = [];
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [setDpr]);

  useFrame(() => {
    const now = performance.now();
    const prev = last.current;
    last.current = now;
    if (!enabled || prev === null || document.visibilityState !== "visible") return;
    const dt = now - prev;
    if (dt > 250) return; // stalls from backgrounding / resize are not frame-rate evidence
    const s = samples.current;
    s.push({ t: now, dt });
    while (s.length && now - s[0].t > WINDOW_MS) s.shift();
    if (s.length < 30 || now - s[0].t < WINDOW_MS * 0.9 || now - lastChange.current < HOLD_MS) return;
    const sorted = s.map((x) => x.dt).sort((a, b) => a - b);
    const p90 = sorted[Math.floor(sorted.length * 0.9)];
    const want = p90 > 50 ? 2 : p90 > 40 ? 1 : 0;
    if (want > tier.current) {
      tier.current = want;
      lastChange.current = now;
      setDpr(Math.min(window.devicePixelRatio || 1, TIERS[want]));
      s.length = 0;
    }
  });
  return null;
}
