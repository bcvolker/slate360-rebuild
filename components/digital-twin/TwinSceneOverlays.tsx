"use client";

import { Line, Billboard } from "@react-three/drei";
import { modules } from "@/lib/design-system/tokens";
import type { TwinVec3 } from "@/lib/digital-twin/measure-helpers";

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
}): TwinOverlayMeasurement | null {
  if (!isVec3(raw.start_point) || !isVec3(raw.end_point)) return null;
  return { id: raw.id, start_point: raw.start_point, end_point: raw.end_point };
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

function MeasurementLine({ start, end }: { start: TwinVec3; end: TwinVec3 }) {
  return (
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
            <MeasurementLine key={m.id} start={m.start_point} end={m.end_point} />
          ))
        : null}
      {showMeasurements && previewPoint && previewEnd ? (
        <MeasurementLine start={previewPoint} end={previewEnd} />
      ) : null}
    </>
  );
}
