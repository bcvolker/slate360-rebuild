"use client";

import type { SparkProfileCheck } from "@/components/digital-twin/use-spark-profile-check";
import { getTiming } from "@/lib/room213/timing";
import { ROOM213_PINS } from "@/lib/room213/pins";
import type { Fidelity } from "@/lib/room213/fidelity";
import type { TransitionOutcome } from "@/components/room213/useViewTransition";

type Phase = "loading" | "preparing" | "ready" | "error";

export function Identity() {
  return (
    <div className="pointer-events-none absolute left-0 top-0 z-20 pl-[max(1rem,env(safe-area-inset-left))] pt-[max(0.9rem,env(safe-area-inset-top))]">
      <div className="rounded-lg bg-[color-mix(in_srgb,var(--graphite-canvas)_55%,transparent)] px-2.5 py-1.5 backdrop-blur-sm">
        <p className="font-mono text-[10px] font-semibold tracking-[0.2em] text-[var(--mkt-brand-green)]">SLATE360</p>
        <p className="text-[13px] font-semibold leading-tight text-[var(--mkt-surface)]">Payne Hall — Room 213</p>
      </div>
    </div>
  );
}

export function InternalPanel({
  check,
  fidelity,
  sourceSha,
  phase,
  transitions,
}: {
  check: SparkProfileCheck | null;
  fidelity: Fidelity;
  sourceSha: string;
  phase: Phase;
  transitions: () => TransitionOutcome[];
}) {
  const t = getTiming();
  const last = transitions().slice(-3);
  const sort = typeof window === "undefined" ? undefined : (window as unknown as { __r213?: { sortStats?: () => { last: number; max: number; count: number } } }).__r213?.sortStats?.();
  return (
    <pre className="pointer-events-none absolute right-2 top-2 z-40 max-w-[70vw] whitespace-pre-wrap rounded-md bg-black/70 p-2 font-mono text-[10px] leading-tight text-white">
      {[
        `phase ${phase} · golden ${sourceSha.slice(0, 12)}`,
        `fidelity ${fidelity.state.toUpperCase()}${fidelity.reasons.length ? ` — ${fidelity.reasons.join("; ")}` : ""}`,
        check ? `accumExt ${check.effective.accumExtSplats} blur ${check.effective.uniformBlurAmount} preBlur ${check.effective.uniformPreBlurAmount}` : "",
        check ? `splats ${check.effective.activeSplats}/${check.effective.modelSplats} acc ${(check.effective.accumulatorBytes / 1048576).toFixed(1)}MB buf ${check.effective.drawingBuffer.join("x")}@${check.effective.pixelRatio}` : "",
        sort ? `sort last ${sort.last}ms max ${sort.max}ms n ${sort.count}` : "",
        last.map((x) => `${x.to} ${x.outcome} ${x.ms}ms`).join(" · "),
        Object.entries(t).map(([k, v]) => `${k} ${v}`).join(" · "),
      ].join("\n")}
    </pre>
  );
}

/** Pin title next to the mouse (desktop hover); touch users get the title in the sheet and Room information. */
export function PinHoverLabel({ id, x, y }: { id: string; x: number; y: number }) {
  const pin = ROOM213_PINS.find((p) => p.pin_id === id);
  if (!pin) return null;
  return (
    <p className="pointer-events-none fixed z-30 rounded-md bg-[var(--mkt-surface)] px-2 py-1 text-[12px] font-semibold text-[var(--mkt-ink)] shadow-md" style={{ left: x + 14, top: y - 10 }}>
      {pin.title}
    </p>
  );
}
