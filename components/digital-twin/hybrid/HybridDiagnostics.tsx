"use client";

import type { AssetRegistration, MetricRaycastTarget } from "@/lib/digital-twin/s360-world";
import type { TwinLayerRepresentation } from "@/lib/digital-twin/twin-epoch";

export function HybridDiagnostics({
  open,
  onToggle,
  representation,
  raycastTarget,
  registration,
  meshOpacity,
  onMeshOpacity,
  wireframe,
  onWireframe,
}: {
  open: boolean;
  onToggle: () => void;
  representation: TwinLayerRepresentation;
  raycastTarget: MetricRaycastTarget;
  registration: AssetRegistration;
  meshOpacity: number;
  onMeshOpacity: (value: number) => void;
  wireframe: boolean;
  onWireframe: (value: boolean) => void;
}) {
  return (
    <div className="pointer-events-auto absolute bottom-24 right-3 z-20 max-w-[16rem]">
      <button
        type="button"
        onClick={onToggle}
        className="min-h-[36px] rounded-lg border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_80%,transparent)] px-2 text-[10px] font-semibold uppercase tracking-wide text-white/50"
      >
        Layers
      </button>
      {open ? (
        <div className="mt-2 space-y-1 rounded-xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_90%,transparent)] p-3 font-mono text-[10px] uppercase tracking-wide text-white/55 backdrop-blur-xl">
          <p>World · S360_WORLD</p>
          <p>View · {representation}</p>
          <p>Raycast · {raycastTarget}</p>
          <p>Reg · {registration.status}</p>
          {registration.rmse != null ? <p>RMSE · {registration.rmse.toFixed(3)} m</p> : <p>RMSE · n/a</p>}
          <p>Method · {registration.method ?? "identity"}</p>
          <p>Spark Rx(π) · gaussian only</p>
          {representation !== "reality" ? (
            <>
              <label className="flex items-center gap-2 normal-case">
                Mesh opacity
                <input
                  type="range"
                  min={0.1}
                  max={1}
                  step={0.05}
                  value={meshOpacity}
                  onChange={(e) => onMeshOpacity(Number(e.target.value))}
                />
              </label>
              <label className="flex items-center gap-2 normal-case">
                <input
                  type="checkbox"
                  checked={wireframe}
                  onChange={(e) => onWireframe(e.target.checked)}
                />
                Wireframe
              </label>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
