"use client";

import { useCallback, useState } from "react";

import { SplatLabWalkViewer } from "@/components/splat-lab/SplatLabWalkViewer";
import type { SparkProfileCheck } from "@/components/digital-twin/splat-viewer-core";

/**
 * Room 213 review viewer: the backyard walk viewer (Dollhouse default → Walk), the verified Spirula model,
 * and the verified render profile asserted against the live renderer. `?internal=1` shows the live
 * renderer readout (profile, active splats, accumulator storage, load time); nothing technical otherwise.
 */
export function Room213Viewer({ src, internal }: { src: string; internal: boolean }) {
  const [check, setCheck] = useState<SparkProfileCheck | null>(null);
  const [readyMs, setReadyMs] = useState<number | null>(null);
  const onCheck = useCallback(
    (c: SparkProfileCheck) => {
      setCheck(c);
      // the first check runs 1.5 s after the model is on screen
      setReadyMs((prev) => prev ?? Math.max(0, Math.round(performance.now() - 1500)));
      if (internal) (window as unknown as { __room213?: unknown }).__room213 = { check: c, readyMs: performance.now() - 1500 };
    },
    [internal],
  );
  return (
    <SplatLabWalkViewer
      src={src}
      kicker="Slate360"
      title="Room 213"
      showPlan={false}
      showZoom={false}
      allowFullscreen
      expectedProfile="spirula-3dgut"
      onRenderProfileCheck={onCheck}
      internalPanel={
        internal ? (
          <pre className="pointer-events-none absolute right-2 top-2 z-30 max-w-[70vw] whitespace-pre-wrap rounded-md bg-black/70 p-2 font-mono text-[10px] leading-tight text-white">
            {check
              ? [
                  `profile ${check.expected} ${check.ok ? "OK" : `MISMATCH: ${check.mismatches.join(", ")}`}`,
                  `accumExt ${check.effective.accumExtSplats} / display ${check.effective.displayAccumulatorExt} / uniform ${check.effective.uniformEnableExtSplats}`,
                  `blur ${check.effective.uniformBlurAmount} preBlur ${check.effective.uniformPreBlurAmount}`,
                  `splats ${check.effective.modelSplats} active ${check.effective.activeSplats} lodBudget ${check.effective.lodSplatCount}`,
                  `accumulators ${(check.effective.accumulatorBytes / 1048576).toFixed(1)} MB`,
                  `buffer ${check.effective.drawingBuffer.join("x")} @${check.effective.pixelRatio}`,
                  `ready ~${readyMs != null ? (readyMs / 1000).toFixed(1) : "?"} s after page start`,
                ].join("\n")
              : "waiting for model…"}
          </pre>
        ) : null
      }
    />
  );
}
