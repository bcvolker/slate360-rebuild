"use client";

import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF } from "@react-three/drei";
import { PhotoExplorerMarkers } from "@/components/digital-twin/photo-explorer/PhotoExplorerMarkers";
import type { TwinCameraPose } from "@/lib/digital-twin/twin-cameras";

function GlbModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  const cloned = useMemo(() => scene.clone(true), [scene]);
  return <primitive object={cloned} />;
}

export function TwinGlbPhotoExplorer({
  modelUrl,
  cameras,
  layerOn,
  selectedIndex,
  onHover,
  onSelect,
}: {
  modelUrl: string;
  cameras: TwinCameraPose[];
  layerOn: boolean;
  selectedIndex: number | null;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="absolute inset-0 bg-[var(--graphite-canvas)]">
      <Canvas
        className="absolute inset-0 touch-none"
        camera={{ position: [8, 6, 8], fov: 50, near: 0.05, far: 5000 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.85} />
        <directionalLight position={[6, 10, 4]} intensity={0.9} />
        <Suspense fallback={null}>
          <GlbModel url={modelUrl} />
        </Suspense>
        <PhotoExplorerMarkers
          cameras={cameras}
          visible={layerOn}
          selectedIndex={selectedIndex}
          onHover={onHover}
          onSelect={onSelect}
        />
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} />
      </Canvas>
    </div>
  );
}
