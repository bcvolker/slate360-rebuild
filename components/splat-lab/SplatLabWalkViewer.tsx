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

export function SplatLabWalkViewer({
  src,
  kicker,
  title,
  note,
}: {
  src: string;
  kicker: string;
  title: string;
  note?: string;
}) {
  const ref = useRef<SplatViewerHandle | null>(null);
  const [gl, setGl] = useState<boolean | null>(null);
  const [view, setView] = useState<SplatViewMode>("dollhouse");
  const [stride, setStride] = useState<WalkStride>("normal");

  useEffect(() => { setGl(webglOk()); }, []);
  useEffect(() => { setWalkStride(stride); }, [stride]);

  const cameraMode = view === "walk" ? "interior" : "orbit";

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden overscroll-none bg-[var(--graphite-canvas)] text-[var(--mkt-canvas)] touch-manipulation">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 py-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] landscape:py-2 sm:px-5 sm:py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--mkt-accent)] sm:text-xs">
          {kicker}
        </p>
        <h1 className="font-serif text-xl font-normal text-[var(--mkt-canvas)] landscape:text-lg sm:text-2xl sm:text-[1.75rem]">
          {title}
        </h1>
        {note ? (
          <p className="mt-1 hidden max-w-lg text-[12px] leading-relaxed text-[var(--mkt-canvas)]/70 md:block landscape:hidden">
            {note}
          </p>
        ) : null}
      </header>
      {gl === false ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center px-8 text-center text-sm text-[var(--mkt-canvas)]/70">
          This browser cannot draw 3D. Open the page in Edge, or turn on hardware acceleration in Chrome.
        </div>
      ) : (
        <SplatViewerCore
          ref={ref}
          src={src}
          className="absolute inset-0 h-full w-full"
          cameraMode={cameraMode}
          onCameraModeChange={(mode) => setView(mode === "interior" ? "walk" : view === "plan" ? "plan" : "dollhouse")}
          freeOrbit
          planView={view === "plan"}
        />
      )}
      <SplatWalkBar
        view={view}
        onView={setView}
        stride={stride}
        onStride={setStride}
        onReset={() => {
          setView("dollhouse");
          ref.current?.recenter();
        }}
        onZoomIn={() => ref.current?.zoomIn()}
        onZoomOut={() => ref.current?.zoomOut()}
      />
    </div>
  );
}
