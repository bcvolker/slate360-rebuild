"use client";

import { Canvas, useLoader, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Suspense, useLayoutEffect, useMemo } from "react";
import { PLYLoader } from "three/examples/jsm/loaders/PLYLoader.js";
import {
  cssColor,
  MESH_GROUND_FALLBACK,
} from "@/lib/digital-twin/css-color";

function Cloud({ src }: { src: string }) {
  const geo = useLoader(PLYLoader, src);
  const { camera } = useThree();
  const prepared = useMemo(() => {
    geo.computeBoundingBox();
    geo.center();
    geo.computeBoundingSphere();
    return geo;
  }, [geo]);

  useLayoutEffect(() => {
    const r = prepared.boundingSphere?.radius ?? 6;
    camera.position.set(0, Math.max(1.2, r * 0.4), r * 1.6);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, prepared]);

  return (
    <points geometry={prepared}>
      <pointsMaterial size={2} vertexColors sizeAttenuation toneMapped={false} />
    </points>
  );
}

export function PayneLidarCloud({ src }: { src: string }) {
  const bg = useMemo(
    () => cssColor("--graphite-canvas", MESH_GROUND_FALLBACK),
    [],
  );
  return (
    <div className="relative h-[calc(100dvh-3.5rem)] w-full overflow-hidden lg:h-full">
      <p className="pointer-events-none absolute left-4 top-2 z-20 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--twin360-blue)]">
        Payne Hall 213 · LiDAR
      </p>
      <p className="pointer-events-none absolute left-4 top-7 z-20 font-serif text-xl text-[var(--mkt-canvas)]">
        Metric room
      </p>
      <Canvas camera={{ fov: 60, near: 0.05, far: 80 }} className="absolute inset-0">
        <color attach="background" args={[bg]} />
        <Suspense fallback={null}>
          <Cloud src={src} />
        </Suspense>
        <OrbitControls makeDefault enableDamping />
      </Canvas>
    </div>
  );
}
