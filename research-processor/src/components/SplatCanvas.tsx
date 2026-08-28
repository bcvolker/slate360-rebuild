import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import {
  SparkRenderer as SparkRendererImpl,
  SplatMesh as SplatMeshImpl,
  type SplatMesh,
} from "@sparkjsdev/spark";
import * as THREE from "three";

extend({ SparkRenderer: SparkRendererImpl, SplatMesh: SplatMeshImpl });

export type ViewMode = "orbit" | "top" | "walk";

function TrajectoryLine({ url }: { url: string }) {
  const [pts, setPts] = useState<THREE.Vector3[] | null>(null);
  useEffect(() => {
    let alive = true;
    fetch(url)
      .then((r) => r.json())
      .then((data) => {
        const est = data.trj_est || data.estimated || [];
        const next = est.map((p: number[][]) => new THREE.Vector3(p[0][3], p[1][3], p[2][3]));
        if (alive) setPts(next);
      })
      .catch(() => {
        if (alive) setPts(null);
      });
    return () => {
      alive = false;
    };
  }, [url]);
  const geom = useMemo(() => (pts && pts.length > 1 ? new THREE.BufferGeometry().setFromPoints(pts) : null), [pts]);
  if (!geom) return null;
  return (
    <group rotation={[Math.PI, 0, 0]}>
      <line geometry={geom}>
        <lineBasicMaterial color="aqua" linewidth={2} />
      </line>
    </group>
  );
}

function Splat({ url, onStats }: { url: string; onStats?: (s: { count: number; size: number[] }) => void }) {
  const gl = useThree((s) => s.gl);
  const sparkArgs = useMemo(() => [{ renderer: gl, enableLod: false }], [gl]);
  const splatArgs = useMemo(
    () => ({
      url,
      lod: false,
      onLoad: (mesh: SplatMesh) => {
        const count = mesh.packedSplats?.numSplats ?? 0;
        const box = new THREE.Box3().setFromObject(mesh);
        const size = box.getSize(new THREE.Vector3());
        const aabbOk = Number.isFinite(size.length()) && size.length() > 1e-6;
        onStats?.({ count, size: aabbOk ? [size.x, size.y, size.z] : [] });
      },
    }),
    [url, onStats],
  );
  return (
    <sparkRenderer args={sparkArgs}>
      <splatMesh args={[splatArgs]} rotation={[Math.PI, 0, 0]} />
    </sparkRenderer>
  );
}

export function SplatCanvas({
  url,
  trajectoryUrl,
  mode,
  onStats,
}: {
  url: string | null;
  trajectoryUrl?: string | null;
  mode: ViewMode;
  onStats?: (s: { count: number; size: number[] }) => void;
}) {
  return (
    <div className="viewer" data-view={mode}>
      <Canvas gl={{ preserveDrawingBuffer: true }} camera={{ position: [0, 4, 18], fov: 60 }}>
        {mode === "top" ? (
          <OrthographicCamera makeDefault position={[0, 24, 0]} zoom={8} near={0.1} far={200} />
        ) : (
          <PerspectiveCamera makeDefault position={mode === "walk" ? [0, 1.5, 0] : [0, 4, 18]} fov={mode === "walk" ? 75 : 60} />
        )}
        {url ? <Splat url={url} onStats={onStats} /> : <gridHelper args={[20, 20]} />}
        {trajectoryUrl ? <TrajectoryLine url={trajectoryUrl} /> : null}
        {mode !== "walk" && (
          <OrbitControls
            enableDamping
            makeDefault={mode !== "top"}
            maxPolarAngle={mode === "top" ? 0.01 : Math.PI}
            minPolarAngle={mode === "top" ? 0 : 0}
          />
        )}
        {mode === "top" && <OrbitControls enableRotate={false} />}
      </Canvas>
    </div>
  );
}

export function captureCanvasPng(): string | null {
  const canvas = document.querySelector(".viewer canvas") as HTMLCanvasElement | null;
  return canvas ? canvas.toDataURL("image/png") : null;
}
