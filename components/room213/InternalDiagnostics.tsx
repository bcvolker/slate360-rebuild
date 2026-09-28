"use client";

import { useEffect, useRef, useState } from "react";

/** Internal-only (?internal=1) pure-resolution A/B: the camera, FOV, profile and model are untouched. */
export const DPR_CHOICES = ["auto", 1, 1.25, 1.5, 2] as const;
export type DprChoice = (typeof DPR_CHOICES)[number];

type Renderer = { getPixelRatio(): number; getContext(): WebGL2RenderingContext; domElement: HTMLCanvasElement };
type R213 = { spark?: { renderer?: Renderer; sorting?: boolean }; sortStats?: () => { last: number; max: number } };

function pct(a: number[], q: number) {
  if (!a.length) return 0;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(s.length * q))];
}

export function InternalDiagnostics({ choice, onChoice }: { choice: DprChoice; onChoice: (c: DprChoice) => void }) {
  const [, tick] = useState(0);
  const frames = useRef<number[]>([]);
  const changedAt = useRef(0);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      frames.current.push(t - last);
      if (frames.current.length > 120) frames.current.shift(); // ~2 s at 60 fps
      last = t;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const iv = window.setInterval(() => tick((n) => n + 1), 500);
    return () => (cancelAnimationFrame(raf), window.clearInterval(iv));
  }, []);

  const r = (window as unknown as { __r213?: R213 }).__r213;
  const gl = r?.spark?.renderer;
  const canvas = gl?.domElement;
  const ctx = gl?.getContext();
  const cssW = canvas?.clientWidth ?? 0;
  const cssH = canvas?.clientHeight ?? 0;
  const native = window.devicePixelRatio;
  const p50 = pct(frames.current, 0.5);
  const p90 = pct(frames.current, 0.9);
  const sort = r?.sortStats?.();
  const settling = performance.now() - changedAt.current < 1500 || r?.spark?.sorting;
  const exp = (d: number) => `${Math.round(cssW * d)}×${Math.round(cssH * d)}`;

  return (
    <div
      className="pointer-events-auto absolute bottom-24 right-2 z-40 max-w-[92vw] rounded-md bg-black/75 p-2 font-mono text-[10px] leading-tight text-white"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="mb-1 flex gap-1">
        {DPR_CHOICES.map((c) => (
          <button
            key={String(c)}
            type="button"
            onClick={() => ((changedAt.current = performance.now()), onChoice(c))}
            className={`min-h-[36px] min-w-[44px] rounded px-1 ${choice === c ? "bg-white text-black" : "border border-white/40"}`}
          >
            {c === "auto" ? "AUTO" : c}
          </button>
        ))}
      </div>
      <p>requested {choice === "auto" ? `auto→${Math.min(Math.max(1, native), 2)}` : choice} · renderer {gl?.getPixelRatio() ?? "…"} · native {native}</p>
      <p>buffer {ctx ? `${ctx.drawingBufferWidth}×${ctx.drawingBufferHeight}` : "…"} · css canvas {cssW}×{cssH}</p>
      <p>screen {screen.width}×{screen.height} · vv.scale {window.visualViewport?.scale ?? "n/a"} · inner {innerWidth}×{innerHeight}</p>
      <p>@1.25 {exp(1.25)} · @1.5 {exp(1.5)} · @2 {exp(2)}</p>
      <p>frame p50 {p50.toFixed(1)}ms p90 {p90.toFixed(1)}ms (~{p50 ? Math.round(1000 / p50) : 0} fps) · sort last {sort?.last ?? "–"} max {sort?.max ?? "–"}ms</p>
      <p>{settling ? "SETTLING…" : "SETTLED"}</p>
    </div>
  );
}
