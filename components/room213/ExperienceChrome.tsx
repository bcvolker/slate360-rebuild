"use client";

import type { SparkProfileCheck } from "@/components/digital-twin/use-spark-profile-check";
import { getTiming } from "@/lib/room213/timing";

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

export function InternalPanel({ check, sourceSha, assetSha, phase }: { check: SparkProfileCheck | null; sourceSha: string; assetSha: string; phase: Phase }) {
  const t = getTiming();
  return (
    <pre className="pointer-events-none absolute right-2 top-2 z-40 max-w-[70vw] whitespace-pre-wrap rounded-md bg-black/70 p-2 font-mono text-[10px] leading-tight text-white">
      {[
        `phase ${phase} · source ${sourceSha.slice(0, 12)} · asset ${assetSha.slice(0, 12)}`,
        check ? `profile ${check.expected} ${check.ok ? "OK" : `MISMATCH ${check.mismatches.join(",")}`}` : "profile …",
        check ? `accumExt ${check.effective.accumExtSplats} blur ${check.effective.uniformBlurAmount} preBlur ${check.effective.uniformPreBlurAmount}` : "",
        check ? `splats ${check.effective.activeSplats}/${check.effective.modelSplats} acc ${(check.effective.accumulatorBytes / 1048576).toFixed(1)}MB buf ${check.effective.drawingBuffer.join("x")}@${check.effective.pixelRatio}` : "",
        Object.entries(t).map(([k, v]) => `${k} ${v}`).join(" · "),
      ].join("\n")}
    </pre>
  );
}
