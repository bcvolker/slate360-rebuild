"use client";

import { useEffect, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import type { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";

import type { SparkRenderProfile } from "@/lib/digital-twin/spark-render-profile";

/** What the live renderer is actually doing, compared with the profile the model's provenance selected. */
export type SparkProfileCheck = {
  expected: SparkRenderProfile["id"];
  /** true only when every setting the profile requires is what the shaders receive right now. */
  ok: boolean;
  mismatches: string[];
  effective: {
    accumExtSplats: boolean;
    displayAccumulatorExt: boolean | null;
    uniformEnableExtSplats: boolean | null;
    uniformBlurAmount: number | null;
    uniformPreBlurAmount: number | null;
    lodSplatCount: number | null;
    activeSplats: number | null;
    modelSplats: number | null;
    accumulatorBytes: number;
    drawingBuffer: [number, number];
    pixelRatio: number;
  };
};

type SparkInternals = {
  accumExtSplats: boolean;
  lodSplatCount?: number;
  activeSplats?: number;
  display?: { extSplats?: boolean; target?: AccTarget | null };
  accumulators?: { target?: AccTarget | null }[];
  material: { uniforms: Record<string, { value: unknown } | undefined> };
};
type AccTarget = { width: number; height: number; depth: number; textures: { internalFormat?: string | null }[] };

function accumulatorBytes(spark: SparkInternals): number {
  const seen = new Set<AccTarget>();
  let bytes = 0;
  for (const a of [spark.display, ...(spark.accumulators ?? [])]) {
    const t = a?.target;
    if (!t || seen.has(t)) continue;
    seen.add(t);
    for (const tex of t.textures) bytes += (tex.internalFormat === "RGBA8" ? 4 : 16) * t.width * t.height * t.depth;
  }
  return bytes;
}

/**
 * Reads the live SparkRenderer after the model is on screen and asserts it matches the resolved profile
 * (a verified Spirula model must never silently fall back to the packed / blurred path). Reports through
 * `onCheck`; a mismatch is also logged as an error.
 */
export function useSparkProfileCheck(
  sparkRef: RefObject<SparkRenderer | null>,
  profile: SparkRenderProfile | null,
  mesh: SplatMesh | null,
  onCheck?: (check: SparkProfileCheck) => void,
) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    if (!profile || !mesh) return;
    let cancelled = false;
    const run = () => {
      const spark = sparkRef.current as unknown as SparkInternals | null;
      if (cancelled || !spark) return;
      const u = spark.material.uniforms;
      const ctx = gl.getContext();
      const effective: SparkProfileCheck["effective"] = {
        accumExtSplats: spark.accumExtSplats,
        displayAccumulatorExt: spark.display?.extSplats ?? null,
        uniformEnableExtSplats: (u.enableExtSplats?.value as boolean | undefined) ?? null,
        uniformBlurAmount: (u.blurAmount?.value as number | undefined) ?? null,
        uniformPreBlurAmount: (u.preBlurAmount?.value as number | undefined) ?? null,
        lodSplatCount: spark.lodSplatCount ?? null,
        activeSplats: spark.activeSplats ?? null,
        modelSplats: mesh.extSplats?.numSplats || mesh.packedSplats?.numSplats || null,
        accumulatorBytes: accumulatorBytes(spark),
        drawingBuffer: [ctx.drawingBufferWidth, ctx.drawingBufferHeight],
        pixelRatio: gl.getPixelRatio(),
      };
      const mismatches: string[] = [];
      if (effective.accumExtSplats !== profile.accumExtSplats) mismatches.push("accumExtSplats");
      if (profile.accumExtSplats && effective.uniformEnableExtSplats !== true) mismatches.push("enableExtSplats uniform");
      if (effective.uniformBlurAmount !== profile.blurAmount) mismatches.push("blurAmount");
      if (effective.uniformPreBlurAmount !== profile.preBlurAmount) mismatches.push("preBlurAmount");
      const check = { expected: profile.id, ok: mismatches.length === 0, mismatches, effective };
      if (!check.ok) console.error("[spark-profile] renderer does not match the model's profile", check);
      onCheck?.(check);
    };
    // After the first frames (uniforms are copied from the renderer on render), then once more when
    // LoD / sorting have settled so activeSplats is the steady value.
    const a = window.setTimeout(run, 1500);
    const b = window.setTimeout(run, 8000);
    return () => {
      cancelled = true;
      window.clearTimeout(a);
      window.clearTimeout(b);
    };
  }, [gl, mesh, profile, sparkRef, onCheck]);
}
