"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  SplatViewerCore,
  type SplatViewerHandle,
} from "@/components/digital-twin/splat-viewer-core";
import { PayneItemList } from "@/components/splat-lab/PayneItemList";
import { PayneLayerBar, type PayneLayer } from "@/components/splat-lab/PayneLayerBar";
import { PaynePlanBoard } from "@/components/splat-lab/PaynePlanBoard";
import { SplatWalkBar, type SplatViewMode, type WalkStride } from "@/components/splat-lab/SplatWalkBar";
import { setWalkStride } from "@/lib/digital-twin/walk-step";
import type { PayneItem } from "@/lib/splat-lab/payne-items";

function webglOk(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function PayneMoveShell({
  splatSrc,
  geometrySrc,
  items,
  planSrc,
}: {
  splatSrc: string | null;
  geometrySrc: string | null;
  items: PayneItem[];
  planSrc: string;
}) {
  const layers = useMemo(() => {
    const next: PayneLayer[] = [];
    if (splatSrc) next.push("scene");
    if (geometrySrc && !geometrySrc.endsWith(".ply")) next.push("lidar");
    next.push("layout", "list");
    return next;
  }, [geometrySrc, splatSrc]);
  const [layer, setLayer] = useState<PayneLayer>(layers[0] ?? "list");
  const [picked, setPicked] = useState<string | null>(null);
  const [gl, setGl] = useState<boolean | null>(null);
  const [view, setView] = useState<SplatViewMode>("dollhouse");
  const [stride, setStride] = useState<WalkStride>("normal");
  const ref = useRef<SplatViewerHandle | null>(null);

  useEffect(() => { setGl(webglOk()); }, []);
  useEffect(() => { setWalkStride(stride); }, [stride]);
  useEffect(() => {
    if (!layers.includes(layer)) setLayer(layers[0] ?? "list");
  }, [layer, layers]);

  const cameraMode = view === "walk" ? "interior" : "orbit";
  const showWalkBar = layer === "scene" && Boolean(splatSrc);

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden overscroll-none bg-[var(--graphite-canvas)] text-[var(--mkt-canvas)] touch-manipulation">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 py-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] landscape:py-2 sm:px-5 sm:py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--mkt-accent)] sm:text-xs">
          Payne Hall 213
        </p>
        <h1 className="font-serif text-xl font-normal text-[var(--mkt-canvas)] landscape:text-lg sm:text-2xl sm:text-[1.75rem]">
          Furniture move
        </h1>
        <p className="mt-1 hidden max-w-lg text-[12px] leading-relaxed text-[var(--mkt-canvas)]/70 md:block landscape:hidden">
          13 items to Sun Devil Hall · 18 tables stay.
        </p>
      </header>

      {layer === "scene" && splatSrc ? (
        gl === false ? (
          <div className="absolute inset-0 z-30 flex items-center justify-center px-8 text-center text-sm text-[var(--mkt-canvas)]/70">
            This browser cannot draw 3D. Open the page in Edge, or turn on hardware acceleration in Chrome.
          </div>
        ) : (
          <SplatViewerCore
            ref={ref}
            src={splatSrc}
            className="absolute inset-0 h-full w-full"
            cameraMode={cameraMode}
            onCameraModeChange={(mode) => setView(mode === "interior" ? "walk" : view === "plan" ? "plan" : "dollhouse")}
            freeOrbit
            planView={view === "plan"}
          />
        )
      ) : null}
      {layer === "lidar" && geometrySrc && !geometrySrc.endsWith(".ply") ? (
        <SplatViewerCore src={geometrySrc} className="absolute inset-0 h-full w-full" cameraMode="orbit" />
      ) : null}
      {layer === "layout" ? (
        <div className="absolute inset-0 overflow-y-auto pt-24 pb-36">
          <PaynePlanBoard planSrc={planSrc} />
        </div>
      ) : null}
      {layer === "list" ? (
        <div className="absolute inset-0 overflow-y-auto pt-20 pb-28">
          <div className="mx-auto h-full max-w-lg">
            <PayneItemList items={items} selectedId={picked} onPick={setPicked} chrome={false} />
          </div>
        </div>
      ) : null}

      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex flex-col items-center gap-2 px-3 pl-[max(3.5rem,env(safe-area-inset-left))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:px-4"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom, 0px))" }}
      >
        <PayneLayerBar layers={layers} active={layer} onPick={setLayer} />
        {showWalkBar ? (
          <SplatWalkBar
            placement="stack"
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
        ) : null}
      </div>
    </div>
  );
}
