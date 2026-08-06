"use client";

import { Line, Billboard, Html } from "@react-three/drei";
import { modules } from "@/lib/design-system/tokens";
import { twinPickDistance, type TwinVec3 } from "@/lib/digital-twin/measure-helpers";

const OVERLAY_COLOR = modules.twin360;

export type TwinOverlayPin = {
  id: string;
  position: TwinVec3;
  title: string;
};

export type TwinOverlayMeasurement = {
  id: string;
  start_point: TwinVec3;
  end_point: TwinVec3;
  /** A2: stored value/unit take precedence over the live-computed distance
   * when present (matches whatever unit the measurement was saved with). */
  measured_value?: number | null;
  unit?: string | null;
};

function isVec3(value: unknown): value is TwinVec3 {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.x === "number" &&
    typeof v.y === "number" &&
    typeof v.z === "number" &&
    Number.isFinite(v.x) &&
    Number.isFinite(v.y) &&
    Number.isFinite(v.z)
  );
}

export function parseTwinOverlayPin(raw: {
  id: string;
  title: string;
  position: unknown;
}): TwinOverlayPin | null {
  if (!isVec3(raw.position)) return null;
  return { id: raw.id, title: raw.title, position: raw.position };
}

export function parseTwinOverlayMeasurement(raw: {
  id: string;
  start_point: unknown;
  end_point: unknown;
  measured_value?: unknown;
  unit?: unknown;
}): TwinOverlayMeasurement | null {
  if (!isVec3(raw.start_point) || !isVec3(raw.end_point)) return null;
  return {
    id: raw.id,
    start_point: raw.start_point,
    end_point: raw.end_point,
    measured_value: typeof raw.measured_value === "number" ? raw.measured_value : null,
    unit: typeof raw.unit === "string" ? raw.unit : null,
  };
}

/** A2: label text for a measurement line — prefer the stored value/unit
 * (what was recorded at save time), else compute live from the two points. */
function formatMeasurementLabel(m: TwinOverlayMeasurement): string {
  const value = typeof m.measured_value === "number" ? m.measured_value : twinPickDistance(m.start_point, m.end_point);
  const unit = m.unit ?? "m";
  return `${value.toFixed(2)} ${unit}`;
}

function PinMarker({ position }: { position: TwinVec3 }) {
  return (
    <Billboard position={[position.x, position.y, position.z]}>
      <mesh renderOrder={10}>
        <circleGeometry args={[0.07, 20]} />
        <meshBasicMaterial color={OVERLAY_COLOR} transparent opacity={0.92} depthTest={false} />
      </mesh>
      <mesh position={[0, 0, -0.01]} renderOrder={9}>
        <circleGeometry args={[0.1, 20]} />
        <meshBasicMaterial color={OVERLAY_COLOR} transparent opacity={0.25} depthTest={false} />
      </mesh>
    </Billboard>
  );
}

function MeasurementLine({
  start,
  end,
  label,
}: {
  start: TwinVec3;
  end: TwinVec3;
  /** A2: distance text shown at the line's midpoint. Omit for the live preview
   * segment, which has its own in-progress affordance elsewhere. */
  label?: string;
}) {
  const mid = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2, z: (start.z + end.z) / 2 };
  return (
    <>
      <Line
        points={[
          [start.x, start.y, start.z],
          [end.x, end.y, end.z],
        ]}
        color={OVERLAY_COLOR}
        lineWidth={1.5}
        transparent
        opacity={0.85}
      />
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

export function TwinSceneOverlays({
  pins,
  measurements,
  showPins,
  showMeasurements,
  previewPoint,
  previewEnd,
}: {
  pins: TwinOverlayPin[];
  measurements: TwinOverlayMeasurement[];
  showPins: boolean;
  showMeasurements: boolean;
  previewPoint?: TwinVec3 | null;
  previewEnd?: TwinVec3 | null;
}) {
  return (
    <>
      {showPins
        ? pins.map((pin) => <PinMarker key={pin.id} position={pin.position} />)
        : null}
      {showMeasurements
        ? measurements.map((m) => (
            <MeasurementLine
              key={m.id}
              start={m.start_point}
              end={m.end_point}
              label={formatMeasurementLabel(m)}
            />
          ))
        : null}
      {showMeasurements && previewPoint && previewEnd ? (
        <MeasurementLine start={previewPoint} end={previewEnd} />
      ) : null}
    </>
  );
}
