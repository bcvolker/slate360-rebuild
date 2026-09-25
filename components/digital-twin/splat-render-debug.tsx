"use client";

import { useEffect, type RefObject } from "react";
import { useThree } from "@react-three/fiber";
import type { SparkRenderer } from "@sparkjsdev/spark";

import type { SparkRenderProfile } from "@/lib/digital-twin/spark-render-profile";

/**
 * Development-only probe: exposes the live renderer so verification can read the settings the shaders
 * actually receive (not the constructor args) and the framebuffer size. Absent from production builds.
 */
export function SplatRenderDebug({
  sparkRef,
  profile,
  url,
}: {
  sparkRef: RefObject<SparkRenderer | null>;
  profile: SparkRenderProfile | null;
  url: string;
}) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;
    const w = window as unknown as { __slateSplatDebug?: Record<string, unknown> };
    w.__slateSplatDebug = {
      url,
      profile,
      camera,
      gl,
      /** Render one frame now and read an RGBA pixel of that frame (fractional canvas coordinates, origin top-left). */
      samplePixel(fx = 0.5, fy = 0.5) {
        gl.render(scene, camera);
        const ctx = gl.getContext();
        const out = new Uint8Array(4);
        ctx.readPixels(Math.floor(fx * ctx.drawingBufferWidth), Math.floor((1 - fy) * ctx.drawingBufferHeight), 1, 1, ctx.RGBA, ctx.UNSIGNED_BYTE, out);
        return Array.from(out);
      },
      /** Render one frame now and return it as a lossless PNG data URL straight from the drawing buffer. */
      captureFrame() {
        gl.render(scene, camera);
        return gl.domElement.toDataURL("image/png");
      },
      cameraState() {
        const cam = camera as unknown as { matrixWorld: { elements: number[] }; projectionMatrix: { elements: number[] }; fov?: number };
        return { matrixWorld: [...cam.matrixWorld.elements], projection: [...cam.projectionMatrix.elements], fov: cam.fov ?? null };
      },
      get spark() {
        return sparkRef.current;
      },
      effective() {
        const spark = sparkRef.current as unknown as {
          accumExtSplats: boolean;
          display?: { extSplats?: boolean; maxSplats?: number };
          material: { uniforms: Record<string, { value: unknown }> };
          activeSplats?: number;
        } | null;
        const ctx = gl.getContext();
        return spark
          ? {
              profileId: profile?.id ?? null,
              accumExtSplats: spark.accumExtSplats,
              displayAccumulatorExt: spark.display?.extSplats ?? null,
              uniform_enableExtSplats: spark.material.uniforms.enableExtSplats?.value,
              uniform_blurAmount: spark.material.uniforms.blurAmount?.value,
              uniform_preBlurAmount: spark.material.uniforms.preBlurAmount?.value,
              activeSplats: spark.activeSplats ?? null,
              drawingBuffer: [ctx.drawingBufferWidth, ctx.drawingBufferHeight],
              pixelRatio: gl.getPixelRatio(),
              canvasCss: [gl.domElement.clientWidth, gl.domElement.clientHeight],
            }
          : null;
      },
    };
  }, [gl, camera, scene, profile, url, sparkRef]);
  return null;
}
