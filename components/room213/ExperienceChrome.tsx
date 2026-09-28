"use client";

import type { SparkProfileCheck } from "@/components/digital-twin/use-spark-profile-check";
import { getTiming } from "@/lib/room213/timing";
import { SlateIcon } from "@/components/shared/SlateIcon";
import { ROOM213_PINS } from "@/lib/room213/pins";
import type { Fidelity } from "@/lib/room213/fidelity";
import type { TransitionOutcome } from "@/components/room213/useViewTransition";

type Phase = "loading" | "preparing" | "ready" | "error";

/**
 * Brand + place, legible over any part of the capture (dark exterior in Dollhouse, bright ceiling in Walk): the
 * homepage logo lockup (emblem + SLATE/360 wordmark) on a light surface badge.
 */
export function Identity({ hidden = false }: { hidden?: boolean }) {
  return (
    <div className={`pointer-events-none absolute left-0 top-0 z-20 transition-opacity duration-500 ${hidden ? "opacity-0" : "opacity-100"} pl-[max(0.75rem,env(safe-area-inset-left))] pt-[max(0.75rem,env(safe-area-inset-top))]`}>
      <div className="flex items-center gap-2.5 rounded-xl bg-[var(--mkt-surface)] py-1.5 pl-1.5 pr-3.5 shadow-md">
        <SlateIcon className="h-9 w-auto shrink-0" aria-hidden />
        <div className="leading-tight">
          <p className="text-[13px] font-semibold tracking-[0.13em]">
            <span className="text-[var(--mkt-ink)]">SLATE</span>
            <span className="text-[var(--mkt-brand-green)]">360</span>
          </p>
          <p className="text-[13px] font-semibold text-[var(--mkt-ink)]">Payne Hall — Room 213</p>
        </div>
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
