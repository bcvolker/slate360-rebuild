"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

type Cam = { id: number; name: string; p: [number, number, number]; q: [number, number, number, number] };
type Preview = { cameras: Cam[]; points: number[][]; pointCount: number };

export function SfmViewer({ jobId, onClose }: { jobId: string; onClose: () => void }) {
  const [data, setData] = useState<Preview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [showPts, setShowPts] = useState(true);
  const [showCams, setShowCams] = useState(true);
  const [ptSize, setPtSize] = useState(0.04);
  const [camSize, setCamSize] = useState(0.18);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let live = true;
    fetch(`/api/splat-lab/jobs/${jobId}/sfm`, { cache: "no-store" })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "load failed");
        return r.json() as Promise<Preview>;
      })
      .then((d) => { if (live) setData(d); })
      .catch((e: Error) => { if (live) setErr(e.message); });
    return () => { live = false; };
  }, [jobId]);

  const target = data?.cameras[idx]?.p ?? [0, 0, 0];

  return (
    <div className="absolute inset-0 z-20 flex flex-col rounded-xl bg-[var(--graphite-canvas)]">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-3 py-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--graphite-muted)]">SfM Viewer</p>
        <Toggle label="Points" on={showPts} set={setShowPts} />
        <Toggle label="Cameras" on={showCams} set={setShowCams} />
        <Slider label="Point" value={ptSize} min={0.01} max={0.12} step={0.01} onChange={setPtSize} />
        <Slider label="Camera" value={camSize} min={0.06} max={0.4} step={0.02} onChange={setCamSize} />
        {data ? (
          <div className="ml-auto flex items-center gap-1">
            <button className="px-2 font-mono text-[11px] text-[var(--graphite-muted)]" onClick={() => setIdx((i) => Math.max(0, i - 1))}>‹</button>
            <span className="font-mono text-[10px] text-[var(--graphite-muted)]">{idx + 1}/{data.cameras.length}</span>
            <button className="px-2 font-mono text-[11px] text-[var(--graphite-muted)]" onClick={() => setIdx((i) => Math.min(data.cameras.length - 1, i + 1))}>›</button>
          </div>
        ) : null}
        <button onClick={onClose} className="rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] text-[var(--graphite-muted)] hover:text-white">Close</button>
      </div>
      <div className="min-h-0 flex-1">
        {err ? <p className="p-4 text-xs text-red-400">{err}</p> : null}
        {data ? (
          <Canvas camera={{ position: [2, 2, 2], fov: 50 }}>
            <color attach="background" args={["#0B0F15"]} />
            <ambientLight intensity={0.7} />
            {showPts ? <PointCloud points={data.points} size={ptSize} /> : null}
            {showCams ? data.cameras.map((c) => <CamMark key={c.id} cam={c} size={camSize} active={c.id === data.cameras[idx]?.id} />) : null}
            <OrbitControls target={target as [number, number, number]} />
          </Canvas>
        ) : !err ? <p className="p-4 text-xs text-[var(--graphite-muted)]">Loading sparse model…</p> : null}
      </div>
    </div>
  );
}

function PointCloud({ points, size }: { points: number[][]; size: number }) {
  const geo = useMemo(() => {
    const pos = new Float32Array(points.length * 3);
    const col = new Float32Array(points.length * 3);
    points.forEach((p, i) => {
      pos[i * 3] = p[0]; pos[i * 3 + 1] = p[1]; pos[i * 3 + 2] = p[2];
      col[i * 3] = (p[3] ?? 180) / 255; col[i * 3 + 1] = (p[4] ?? 180) / 255; col[i * 3 + 2] = (p[5] ?? 180) / 255;
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, [points]);
  return (
    <points geometry={geo}>
      <pointsMaterial size={size} vertexColors sizeAttenuation />
    </points>
  );
}

function CamMark({ cam, size, active }: { cam: Cam; size: number; active: boolean }) {
  return (
    <mesh position={cam.p}>
      <coneGeometry args={[size * 0.4, size, 4]} />
      <meshBasicMaterial color={active ? 0xffffff : 0xa3aed0} wireframe />
    </mesh>
  );
}

function Toggle({ label, on, set }: { label: string; on: boolean; set: (v: boolean) => void }) {
  return (
    <button onClick={() => set(!on)} className="rounded-md border border-white/10 px-2 py-1 font-mono text-[10px] text-[var(--graphite-muted)] hover:text-white">
      {label} {on ? "on" : "off"}
    </button>
  );
}

function Slider({ label, value, min, max, step, onChange }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-1 font-mono text-[10px] text-[var(--graphite-muted)]">
      {label}
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  );
}
