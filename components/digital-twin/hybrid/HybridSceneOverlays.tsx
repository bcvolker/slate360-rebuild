"use client";

import { Line, Billboard, Html } from "@react-three/drei";
import { modules } from "@/lib/design-system/tokens";
import { formatMeasured } from "@/lib/digital-twin/measurement-math";
import type { TwinMeasurementRecord } from "@/lib/digital-twin/measurement-persist";
import type { TwinPinRecord } from "@/lib/digital-twin/pin-anchor";
import type { Vec3 } from "@/lib/digital-twin/s360-world";

const COLOR = modules.twin360;

function Dot({ p, scale = 0.05 }: { p: Vec3; scale?: number }) {
  return (
    <Billboard position={[p.x, p.y, p.z]}>
      <mesh renderOrder={12}>
        <circleGeometry args={[scale, 16]} />
        <meshBasicMaterial color={COLOR} depthTest={false} />
      </mesh>
    </Billboard>
  );
}

function Polyline({
  points,
  label,
  closed,
}: {
  points: Vec3[];
  label?: string;
  closed?: boolean;
}) {
  if (points.length === 0) return null;
  const pts = closed && points.length > 2 ? [...points, points[0]] : points;
  const mid = points[Math.floor(points.length / 2)] ?? points[0];
  return (
    <>
      {pts.length >= 2 ? (
        <Line
          points={pts.map((p) => [p.x, p.y, p.z] as [number, number, number])}
          color={COLOR}
          lineWidth={1.6}
          transparent
          opacity={0.9}
        />
      ) : null}
      {points.map((p, i) => (
        <Dot key={i} p={p} />
      ))}
      {label ? (
        <Html position={[mid.x, mid.y, mid.z]} center distanceFactor={8} zIndexRange={[10, 0]}>
          <span className="pointer-events-none whitespace-nowrap rounded-md border border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--graphite-canvas)_85%,transparent)] px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-[var(--twin360-blue)]">
            {label}
          </span>
        </Html>
      ) : null}
    </>
  );
}

export function HybridSceneOverlays({
  measurements,
  pins,
  draftPoints,
  hover,
  showMeasurements,
  showPins,
}: {
  measurements: TwinMeasurementRecord[];
  pins: TwinPinRecord[];
  draftPoints: Vec3[];
  hover: Vec3 | null;
  showMeasurements: boolean;
  showPins: boolean;
}) {
  return (
    <>
      {showMeasurements
        ? measurements
            .filter((m) => !m.hidden)
            .map((m) => (
              <Polyline
                key={m.id}
                points={m.points}
                closed={m.kind === "area" || m.kind === "perimeter"}
                label={formatMeasured(m.value, m.unit, m.kind)}
              />
            ))
        : null}
      {showMeasurements && (draftPoints.length > 0 || hover) ? (
        <Polyline points={hover ? [...draftPoints, hover] : draftPoints} />
      ) : null}
      {showPins
        ? pins.map((pin) => (
            <group key={pin.id}>
              <Dot p={pin.anchor.position} scale={0.07} />
              <Html
                position={[pin.anchor.position.x, pin.anchor.position.y + 0.15, pin.anchor.position.z]}
                center
                distanceFactor={10}
                zIndexRange={[11, 0]}
              >
                <span className="pointer-events-none rounded-md border border-white/15 bg-[color-mix(in_srgb,var(--graphite-canvas)_88%,transparent)] px-1.5 py-0.5 font-mono text-[10px] text-zinc-100">
                  {pin.title}
                </span>
              </Html>
            </group>
          ))
        : null}
    </>
  );
}
