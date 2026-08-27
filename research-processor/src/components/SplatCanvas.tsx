import { Canvas, useThree } from "@react-three/fiber";
import { OrbitControls, OrthographicCamera, PerspectiveCamera } from "@react-three/drei";
import { extend } from "@react-three/fiber";
import { useMemo } from "react";
import {
  SparkRenderer as SparkRendererImpl,
  SplatMesh as SplatMeshImpl,
  type SplatMesh,
} from "@sparkjsdev/spark";
import * as THREE from "three";

extend({ SparkRenderer: SparkRendererImpl, SplatMesh: SplatMeshImpl });

export type ViewMode = "orbit" | "top" | "walk";

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
        onStats?.({ count, size: [size.x, size.y, size.z] });
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
  mode,
  onStats,
}: {
  url: string | null;
  mode: ViewMode;
  onStats?: (s: { count: number; size: number[] }) => void;
}) {
  return (
    <div className="viewer" data-view={mode}>
      <Canvas gl={{ preserveDrawingBuffer: true }} camera={{ position: [0, 1.6, 4], fov: 60 }}>
        {mode === "top" ? (
          <OrthographicCamera makeDefault position={[0, 12, 0]} zoom={18} near={0.1} far={200} />
        ) : (
          <PerspectiveCamera makeDefault position={mode === "walk" ? [0, 1.5, 0] : [0, 1.6, 4]} fov={mode === "walk" ? 75 : 60} />
        )}
        {url ? <Splat url={url} onStats={onStats} /> : <gridHelper args={[20, 20]} />}
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
