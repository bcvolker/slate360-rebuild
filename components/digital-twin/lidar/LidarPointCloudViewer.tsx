"use client";

import { useCallback, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import type { LidarColorMode } from "@/lib/digital-twin/lidar-contract";
import { regionFlatness, type RegionSummary } from "./region-flatness";
import { PotreePointLayer } from "./PotreePointLayer";
import {
  useLidarHierarchy,
  type LidarPointData,
} from "./useLidarTiles";

type Tool = "navigate" | "measure" | "section" | "region";

function profileForLine(
  points: LidarPointData,
  start: THREE.Vector3,
  end: THREE.Vector3,
): [number, number][] {
  const axis = new THREE.Vector2(end.x - start.x, end.y - start.y);
  const length = axis.length();
  if (length < 1e-6) return [];
  axis.normalize();
  const width = Math.max(length * 0.02, 0.02);
  const samples: [number, number][] = [];
  for (let index = 0; index < points.deviations.length; index += 1) {
    const dx = points.positions[index * 3] - start.x;
    const dy = points.positions[index * 3 + 1] - start.y;
    const along = dx * axis.x + dy * axis.y;
    const across = Math.abs(dx * axis.y - dy * axis.x);
    if (along >= 0 && along <= length && across <= width) {
      samples.push([along, points.positions[index * 3 + 2]]);
    }
  }
  return samples.sort((a, b) => a[0] - b[0]).slice(0, 256);
}

function ProfileChart({ profile }: { profile: [number, number][] }) {
  if (profile.length < 2) {
    return <p className="text-xs text-zinc-500">No points crossed that section.</p>;
  }
  const xs = profile.map(([x]) => x);
  const ys = profile.map(([, y]) => y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const xSpan = Math.max(maxX - minX, 1e-6);
  const ySpan = Math.max(maxY - minY, 1e-6);
  const path = profile
    .map(
      ([x, y], index) =>
        `${index ? "L" : "M"} ${((x - minX) / xSpan) * 180 + 10} ${
          90 - ((y - minY) / ySpan) * 80
        }`,
    )
    .join(" ");
  return (
    <svg viewBox="0 0 200 100" className="h-24 w-full" role="img" aria-label="Elevation profile">
      <path d={path} fill="none" stroke="var(--twin360-blue)" strokeWidth="1.5" />
    </svg>
  );
}

export function LidarPointCloudViewer({
  baseUrl,
  modelId,
}: {
  baseUrl: string;
  modelId?: string | null;
}) {
  const { manifest, loading, error } = useLidarHierarchy(baseUrl, modelId);
  const [points, setPoints] = useState<LidarPointData | null>(null);
  const [tileLoading, setTileLoading] = useState(false);
  const [tileError, setTileError] = useState<string | null>(null);
  const [mode, setMode] = useState<LidarColorMode>("rgb");
  const [tool, setTool] = useState<Tool>("navigate");
  const [firstPoint, setFirstPoint] = useState<THREE.Vector3 | null>(null);
  const [measurement, setMeasurement] = useState<number | null>(null);
  const [profile, setProfile] = useState<[number, number][]>([]);
  const [regionSummary, setRegionSummary] = useState<RegionSummary | null>(null);

  const center = useMemo(() => {
    if (!manifest) return [0, 0, 0] as [number, number, number];
    return manifest.bounds.min.map(
      (value, index) => (value + manifest.bounds.max[index]) / 2,
    ) as [number, number, number];
  }, [manifest]);
  const radius = useMemo(() => {
    if (!manifest) return 10;
    return Math.max(
      ...manifest.bounds.max.map((value, index) => value - manifest.bounds.min[index]),
      1,
    );
  }, [manifest]);

  const onPoint = useCallback(
    (point: THREE.Vector3) => {
      if (tool !== "measure") return;
      if (!firstPoint) {
        setFirstPoint(point);
        setMeasurement(null);
        return;
      }
      setMeasurement(firstPoint.distanceTo(point));
      setFirstPoint(null);
    },
    [firstPoint, tool],
  );
  const onSectionStart = useCallback((point: THREE.Vector3) => {
    setFirstPoint(point);
    setProfile([]);
    setMeasurement(null);
    setRegionSummary(null);
  }, []);
  const onSectionEnd = useCallback(
    (point: THREE.Vector3) => {
      if (tool === "section" && firstPoint && points) {
        setProfile(profileForLine(points, firstPoint, point));
        setFirstPoint(null);
      }
    },
    [firstPoint, points, tool],
  );
  const onRegionStart = useCallback((point: THREE.Vector3) => {
    setFirstPoint(point);
    setRegionSummary(null);
    setMeasurement(null);
    setProfile([]);
  }, []);
  const onRegionEnd = useCallback(
    (point: THREE.Vector3) => {
      if (tool === "region" && firstPoint && points) {
        setRegionSummary(regionFlatness(points, firstPoint, point));
        setFirstPoint(null);
      }
    },
    [firstPoint, points, tool],
  );
  const onStatus = useCallback((isLoading: boolean, nextError: string | null) => {
    setTileLoading(isLoading);
    setTileError(nextError);
  }, []);

  if (loading) {
    return <div className="flex h-full items-center justify-center text-xs text-zinc-400">Loading LiDAR hierarchy…</div>;
  }
  if (error || !manifest) {
    return (
      <div className="flex h-full items-center justify-center px-6 text-center text-xs text-zinc-400">
        {error ?? "LiDAR point cloud unavailable"}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-[var(--graphite-canvas)]">
      <Canvas className="absolute inset-0 touch-none" gl={{ antialias: false, alpha: true }}>
        <PerspectiveCamera
          makeDefault
          position={[center[0] + radius, center[1] + radius, center[2] + radius]}
          fov={50}
          near={0.01}
          far={radius * 20}
        />
        <PotreePointLayer
          baseUrl={baseUrl}
          modelId={modelId}
          manifest={manifest}
          mode={mode}
          pointSize={Math.max(radius / 700, 0.004)}
          onPointsChange={setPoints}
          onStatus={onStatus}
          onPoint={onPoint}
          sectionMode={tool === "section"}
          onSectionStart={onSectionStart}
          onSectionEnd={onSectionEnd}
          regionMode={tool === "region"}
          onRegionStart={onRegionStart}
          onRegionEnd={onRegionEnd}
        />
        <OrbitControls makeDefault target={center} enableDamping dampingFactor={0.08} />
      </Canvas>
      <div className="absolute left-3 top-3 z-10 flex flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_90%,transparent)] p-2 backdrop-blur-md">
        <label className="font-mono text-[10px] uppercase tracking-wide text-zinc-400">
          Color
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as LidarColorMode)}
            className="ml-2 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1 text-xs text-zinc-100"
          >
            <option value="rgb">RGB</option>
            <option value="deviation">Deviation</option>
            <option value="slope">Slope</option>
          </select>
        </label>
        {(["navigate", "measure", "section", "region"] as Tool[]).map((next) => (
          <button
            key={next}
            type="button"
            onClick={() => {
              setTool(next);
              setFirstPoint(null);
              setMeasurement(null);
              setProfile([]);
              setRegionSummary(null);
            }}
            className={cn(
              "rounded-lg border px-2 py-1 text-[10px] uppercase tracking-wide",
              tool === next ? twinAccent.button : "border-white/10 text-zinc-400",
            )}
          >
            {next}
          </button>
        ))}
      </div>
      {(tileLoading || tileError) && (
        <p className="absolute right-3 top-3 z-10 rounded-xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_90%,transparent)] px-3 py-2 text-xs text-zinc-300">
          {tileError ?? "Loading visible point tiles…"}
        </p>
      )}
      {tool !== "navigate" && (
        <p className="absolute bottom-3 left-3 z-10 rounded-xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_90%,transparent)] px-3 py-2 text-xs text-zinc-300">
          {tool === "measure"
            ? "Select two points to measure distance."
            : tool === "section"
              ? "Drag from one point to another to build a section profile."
              : "Drag across two corners to calculate regional flatness."}
        </p>
      )}
      {measurement !== null && (
        <p className="absolute right-3 top-14 z-10 rounded-xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_90%,transparent)] px-3 py-2 font-mono text-xs text-zinc-200">
          Distance {measurement.toFixed(3)} m
        </p>
      )}
      {regionSummary && (
        <p className="absolute right-3 top-14 z-10 max-w-64 rounded-xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_90%,transparent)] px-3 py-2 font-mono text-xs text-zinc-200">
          Region {regionSummary.pointCount} points · slope {regionSummary.slopeDegrees.toFixed(2)}° · RMS{" "}
          {regionSummary.rmsDeviationM.toFixed(4)} m · range {regionSummary.minDeviationM.toFixed(4)}–
          {regionSummary.maxDeviationM.toFixed(4)} m
        </p>
      )}
      {profile.length > 1 && (
        <aside className="absolute bottom-3 right-3 z-10 w-64 rounded-xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_94%,transparent)] p-3 backdrop-blur-md">
          <p className="mb-1 font-mono text-[10px] uppercase tracking-wide text-zinc-400">
            Elevation profile
          </p>
          <ProfileChart profile={profile} />
        </aside>
      )}
    </div>
  );
}
