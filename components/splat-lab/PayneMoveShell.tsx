"use client";

import { useEffect, useRef, useState } from "react";
import {
  SplatViewerCore,
  type SplatViewerHandle,
} from "@/components/digital-twin/splat-viewer-core";
import { SplatWalkBar, type SplatViewMode, type WalkStride } from "@/components/splat-lab/SplatWalkBar";
import { setWalkStride } from "@/lib/digital-twin/walk-step";

function webglOk(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function PayneMoveShell({ splatSrc }: { splatSrc: string | null }) {
  const ref = useRef<SplatViewerHandle | null>(null);
  const [gl, setGl] = useState<boolean | null>(null);
  const [view, setView] = useState<SplatViewMode>("walk");
  const [stride, setStride] = useState<WalkStride>("normal");

  useEffect(() => { setGl(webglOk()); }, []);
  useEffect(() => { setWalkStride(stride); }, [stride]);

  if (!splatSrc) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-[var(--graphite-canvas)] px-8 text-center text-sm text-[var(--mkt-canvas)]/70">
        The walkthrough model is not on this page yet.
      </div>
    );
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden overscroll-none bg-[var(--graphite-canvas)] text-[var(--mkt-canvas)] touch-manipulation">
      <p className="pointer-events-none absolute right-4 top-4 z-20 text-right text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--mkt-accent)] sm:right-5 sm:top-5">
        Payne Hall 213
      </p>
      {gl === false ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center px-8 text-center text-sm text-[var(--mkt-canvas)]/70">
          This browser cannot draw 3D. Open the page in Edge, or turn on hardware acceleration in Chrome.
        </div>
      ) : (
        <SplatViewerCore
          ref={ref}
          src={splatSrc}
          className="absolute inset-0 h-full w-full"
          cameraMode={view === "walk" ? "interior" : "orbit"}
          onCameraModeChange={(mode) => setView(mode === "interior" ? "walk" : "dollhouse")}
        />
      )}
      <SplatWalkBar
        view={view}
        onView={setView}
        stride={stride}
        onStride={setStride}
        onReset={() => setView("walk")}
        onZoomIn={() => ref.current?.zoomIn()}
        onZoomOut={() => ref.current?.zoomOut()}
      />
    </div>
  );
}
